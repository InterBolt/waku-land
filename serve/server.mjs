import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import express from 'express';
import { unstable_connectMiddleware as connectMiddleware } from 'waku/prd';
import morgan from 'morgan';

// Found this in the original waku code.
// fwiw it threw a type error which is suspicious
// but maybe it's fine, either way idc much.
express.static.mime.default_type = '';

const server = async ({ path, ssr }, port) => {
  const distDir = join(path, 'dist');
  const publicDir = join(distDir, 'public');
  const app = express();

  app.use(morgan('tiny'));
  app.use(
    connectMiddleware({
      loadEntries: () =>
        import(pathToFileURL(join(distDir, 'entries.js')).toString()),
      ssr,
    })
  );
  app.use(express.static(publicDir));
  return app.listen(port, () => {
    console.info(`\x1b[32m%s\x1b[0m`, `Server is running on port: ${port}`);
  });
};

export default server;
