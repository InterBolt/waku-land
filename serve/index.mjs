import * as servers from './servers.mjs';
import { getDeployments } from './utils.mjs';
import * as cluster from './cluster.mjs';
import { exec, execSync } from 'node:child_process';

// All this process does is spawn new workers
// and handle unexpected exits. I suppose we could
// run the proxy server here to save a little on
// memory but the added confidence that the proxy will
// always restart on failure is nice.
cluster.runPrimary(() => {
  if (process.env.NODE_ENV !== 'production') {
    // Prevents vite optimizations from breaking the server
    execSync(`rm -rf node_modules && pnpm i`, {
      cwd: process.cwd(),
      stdio: 'inherit',
    });
    exec(`waku dev`, { cwd: process.cwd(), stdio: 'inherit' });
  }

  const deployments = getDeployments();
  for (const index in deployments) {
    const deployment = deployments[index];
    cluster.spawn({ WAKU_TAG: `deployment:${deployment.dir}` });
  }
  cluster.spawn({ WAKU_TAG: 'proxy' });
  cluster.spawn({ WAKU_TAG: 'website' });
  cluster.handleUnexpectedExit();
  cluster.handleKill();
});

cluster.runWorker(() => {
  cluster.randomlyExitInTheFuture();
  const WAKU_TAG = process.env.WAKU_TAG;

  if (WAKU_TAG.startsWith('deployment:')) {
    return servers.startDeployment(WAKU_TAG.replace('deployment:', ''));
  }
  if (WAKU_TAG === 'proxy') {
    return servers.startProxy();
  }
  if (WAKU_TAG === 'website') {
    return servers.startWebsite();
  }

  // If we're here, something went wrong and best to
  // just kill the process and figure it out later.
  cluster.kill();
});
