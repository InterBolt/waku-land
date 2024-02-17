import { join } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import express from 'express';
import morgan from 'morgan';
import { createProxyMiddleware } from 'http-proxy-middleware';

const pathToDeployments = join(process.cwd(), 'deployments.json');
if (!existsSync(pathToDeployments)) {
  throw new Error(
    '`deployments.json` not found. If running locally, run `npm run dev:setup` first'
  );
}
const deployments = JSON.parse(readFileSync(pathToDeployments, 'utf-8'));

const getPortFromSubdomain = (subdomain) => {
  const deployment = deployments.find((d) => d.flyName === subdomain);
  if (!deployment) {
    throw new Error(`No deployment found for subdomain: ${subdomain}`);
  }
  return deployment.servicePort;
};

const proxyServer = async () => {
  const app = express();

  app.use(morgan('tiny'));
  app.use('*', (req, res, next) => {
    console.log(req.subdomains);
    const subdomain = req.subdomains[0];
    let portToProxy;
    if (subdomain === 'www' || !subdomain) {
      portToProxy = 5000;
    } else {
      portToProxy = getPortFromSubdomain(subdomain);
    }
    if (!portToProxy) {
      return res.status(404).send('Nothing found for this subdomain.');
    }
    return createProxyMiddleware({
      target: `http://127.0.0.1:${portToProxy}`,
    })(req, res, next);
  });
  return app.listen(3000, () => {
    console.info(`\x1b[32m%s\x1b[0m`, `Proxy is running on port: 3000`);
  });
};

export default proxyServer;
