import * as servers from './servers.mjs';
import { getDeployments } from './utils.mjs';
import * as cluster from './cluster.mjs';
import { exec, execSync } from 'node:child_process';

// All this process does is spawn new workers
// and handle unexpected exits. I suppose we could
// run the proxy server here to save a little on
// memory but since Waku isn't all that stable, I think
// it's better to use the main process to keep things
// fault tolerant.
cluster.runPrimary(() => {
  if (process.env.NODE_ENV !== 'production') {
    // Prevents vite optimizations from breaking the server
    execSync(`rm -rf node_modules && pnpm i`, {
      cwd: process.cwd(),
      stdio: 'inherit',
    });
    exec(`pnpm run waku:dev`, { cwd: process.cwd(), stdio: 'inherit' });
  }

  const deployments = getDeployments();
  for (const index in deployments) {
    const deployment = deployments[index];
    cluster.spawn(`deployment:${deployment.dir}`);
  }
  cluster.spawn('proxy');
  cluster.spawn('website');
  cluster.handleUnexpectedExit();
  cluster.handleKill();
});

cluster.runWorker(() => {
  cluster.randomlyExitInTheFuture();

  if (process.env.WAKU_TAG.startsWith('deployment:')) {
    return servers.startDeployment(
      process.env.WAKU_TAG.replace('deployment:', '')
    );
  }
  if (process.env.WAKU_TAG === 'proxy') {
    return servers.startProxy();
  }
  if (process.env.WAKU_TAG === 'website') {
    return servers.startWebsite();
  }

  // If we're here, something went wrong and best to
  // just kill the process and figure it out later.
  cluster.kill();
});
