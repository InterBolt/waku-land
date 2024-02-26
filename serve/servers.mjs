import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import express from 'express';
import { unstable_connectMiddleware as connectMiddleware } from 'waku/prd';
import morgan from 'morgan';
import { exec, execSync } from 'node:child_process';
import { getDeployments } from './utils.mjs';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { readFileSync } from 'node:fs';

const PORT_PROXY = 3000;
const WEBSITE_PORT = 5000;
const MORGAN_FORMAT = process.NODE_ENV === 'production' ? 'combined' : 'dev';

// TODO: I'm not sure if the ABORT_ERR is due to my setup of Waku, but simply ignoring it
// seems to work fine. I'll have to look into it later.
process.on('unhandledRejection', (reason) => {
  if (reason.code === 'ABORT_ERR') {
    console.warn(`Waku is throwing an ABORT_ERR. Ignoring...`);
    return;
  }
  process.exit(1);
});

export const startWebsite = () => {
  // Found this in the original waku code.
  // fwiw it threw a type error which is suspicious
  // but maybe it's fine, either way idc much.
  express.static.mime.default_type = '';

  const distDir = join(process.cwd(), 'dist');
  const publicDir = join(distDir, 'public');
  const app = express();

  app.use(morgan(MORGAN_FORMAT));
  app.use(
    connectMiddleware({
      loadEntries: () =>
        import(pathToFileURL(join(distDir, 'entries.js')).toString()),
      ssr: true,
    })
  );
  app.use(express.static(publicDir));
  return app.listen(WEBSITE_PORT, () => {
    console.info(
      `\x1b[32m%s\x1b[0m`,
      `Waku website is running on port: ${WEBSITE_PORT}`
    );
  });
};

const startViaPkgCmd = (cwd, port) => {
  try {
    console.info(
      `\x1b[32m%s\x1b[0m`,
      `Waku example will use a custom entry via \`npm run start\` in its local dir is running on port: ${port}`
    );
    execSync(`PORT=${port} pnpm run start`, {
      cwd,
      stdio: 'inherit',
      encoding: 'utf-8',
    });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

export const startDeployment = (dir) => {
  const deployments = getDeployments();
  const deployment = deployments.find((deployment) => deployment.dir == dir);
  const cwd = join(process.cwd(), deployment.path);
  process.chdir(cwd);

  if (!!deployment.entryServer) {
    return startViaPkgCmd(cwd, deployment.servicePort);
  }

  // Found this in the original waku code.
  // fwiw it threw a type error which is suspicious
  // but maybe it's fine, either way idc much.
  express.static.mime.default_type = '';

  const distDir = join(process.cwd(), 'dist');
  const publicDir = join(distDir, 'public');
  const app = express();

  app.use(morgan(MORGAN_FORMAT));
  app.use(
    connectMiddleware({
      loadEntries: () =>
        import(pathToFileURL(join(distDir, 'entries.js')).toString()),
      ssr: deployment.ssr,
    })
  );
  app.use(express.static(publicDir));
  return app.listen(deployment.servicePort, () => {
    console.info(
      `\x1b[32m%s\x1b[0m`,
      `Waku example server is running on port: ${deployment.servicePort}`
    );
  });
};

export const startProxy = () => {
  const deployments = getDeployments();

  const app = express();

  app.use(morgan(MORGAN_FORMAT));
  app.use('*', (req, res, next) => {
    const subdomain = req.subdomains[0];
    let portToProxy = null;
    if (subdomain === 'www' || !subdomain) {
      portToProxy = WEBSITE_PORT;
    } else {
      portToProxy = deployments.find(
        (d) => d.flyName === subdomain
      )?.servicePort;
    }
    if (!portToProxy) {
      return res.status(404).send('Nothing found for this subdomain.');
    }
    return createProxyMiddleware({
      target: `http://127.0.0.1:${portToProxy}`,
    })(req, res, next);
  });

  return app.listen(PORT_PROXY, '0.0.0.0', () => {
    console.info(
      `\x1b[32m%s\x1b[0m`,
      `Proxy is running on port: ${PORT_PROXY}`
    );
  });
};
