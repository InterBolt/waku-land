import cluster from 'node:cluster';
import { execSync } from 'node:child_process';
import server from './server.mjs';
import proxyServer from './proxyServer.mjs';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const pathToDeployments = join(process.cwd(), 'deployments.json');
if (!existsSync(pathToDeployments)) {
  throw new Error(
    '`deployments.json` not found. If running locally, run `npm run dev:setup` first'
  );
}
const deployments = JSON.parse(readFileSync(pathToDeployments, 'utf-8'));
const workerCache = {};

const asWorker = (restartTime) => {
  if (!cluster.isWorker) {
    throw new Error('This function can only be called from a worker');
  }
  // Kill the worker every so often to prevent memory leaks
  setTimeout(() => {
    console.error('Killing worker intentionally to prevent memory leaks...');
    process.exit(1);
  }, parseInt((Math.random() * restartTime * 10).toFixed(0)));
};

const runDeploymentInWorker = async () => {
  asWorker(process.env.NODE_ENV !== 'production' ? 20000 : 3000000);

  const deployment = deployments.find(
    (deployment) => deployment.dir == process.env.WAKU_LAND_DIR
  );
  if (deployment) {
    server(
      { ssr: deployment.ssr, path: deployment.path },
      deployment.servicePort
    ).catch((err) => {
      console.error(err);
      process.exit(0);
    });
  } else {
    process.exit(1);
  }
};

const runProxyInWorker = async () => {
  asWorker(process.env.NODE_ENV !== 'production' ? 30000 : 3000000);

  proxyServer();
};

const runWebsiteInWorker = async () => {
  asWorker(process.env.NODE_ENV !== 'production' ? 30000 : 3000000);

  if (process.env.NODE_ENV !== 'production') {
    console.log(`Running website in worker...`);
    execSync(`npm run waku:dev`, {
      cwd: process.cwd(),
      stdio: 'inherit',
    });
    process.exit(1);
  } else {
    await server(
      {
        ssr: true,
        url: `https://waku.land`,
        path: process.cwd(),
      },
      5000
    ).catch((err) => {
      console.error(err);
      process.exit(0);
    });
  }
};

const persistentWorker = (info) => {
  if (!cluster.isPrimary) {
    throw new Error(
      'This function can only be called from the primary process'
    );
  }
  cluster.on('exit', (exitedWorker, code) => {
    delete workerCache[exitedWorker.process.pid];
    if (code === 0) {
      console.error(
        `Worker ${exitedWorker.process.pid} died with code 0. Exiting...`
      );
      process.exit(1);
    }
    console.log(
      `Worker ${info.WAKU_LAND_TYPE}:${info.WAKU_LAND_DIR} died but details were found. Restarting...`
    );
    setTimeout(() => {
      if (
        Object.values(workerCache).some(
          (workerInfo) => workerInfo.WAKU_LAND_DIR === info.WAKU_LAND_DIR
        )
      ) {
        return;
      }
      persistentWorker(info);
    }, 300);
  });
  const spawnedWorker = cluster.fork(info);
  workerCache[spawnedWorker.process.pid] = info;
  return spawnedWorker;
};

if (cluster.isWorker) {
  if (process.env.WAKU_LAND_TYPE === 'deployment') {
    runDeploymentInWorker();
  } else if (process.env.WAKU_LAND_TYPE === 'host') {
    runWebsiteInWorker();
  } else if (process.env.WAKU_LAND_TYPE === 'proxy') {
    runProxyInWorker();
  } else {
    process.exit(1);
  }
} else {
  for (const index in deployments) {
    const deployment = deployments[index];
    persistentWorker({
      WAKU_LAND_DIR: deployment.dir,
      WAKU_LAND_TYPE: 'deployment',
    });
  }
  persistentWorker({
    WAKU_LAND_DIR: 'waku-land',
    WAKU_LAND_TYPE: 'host',
  });
  persistentWorker({
    WAKU_LAND_DIR: 'waku-land',
    WAKU_LAND_TYPE: 'proxy',
  });
}
