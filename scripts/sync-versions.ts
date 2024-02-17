import { join } from 'node:path';
import { exec as execWithCallback } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync, mkdirSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { simpleGit, SimpleGit, SimpleGitOptions } from 'simple-git';
import appRootPath from 'app-root-path';
import logger from 'signale';
import { getVersions } from './utils';

const exec = promisify(execWithCallback);

const tempWakuDir = '.temp-waku';
const pathToTempWaku = join(appRootPath.path, tempWakuDir);

const cleanup = async () => {
  if (existsSync(pathToTempWaku)) {
    logger.warn(`Removing ${tempWakuDir} directory in 2 seconds...`);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await rm(tempWakuDir, {
      recursive: true,
      force: true,
    });
    logger.info(`Removed ${tempWakuDir}`);
  }
};

const init = async () => {
  if (existsSync(pathToTempWaku)) {
    logger.info(`Doing initialization cleanup`);
    await cleanup();
  }
  mkdirSync(pathToTempWaku);
};

const main = async () => {
  try {
    logger.info(`Initializing temp directory...`);
    await init();

    const options: Partial<SimpleGitOptions> = {
      baseDir: pathToTempWaku,
      binary: 'git',
      maxConcurrentProcesses: 6,
      trimmed: false,
    };

    const git: SimpleGit = simpleGit(options);

    logger.info(`Cloning waku repository...`);
    await git.clone('https://github.com/dai-shi/waku.git');

    const pathToWaku = join(tempWakuDir, 'waku');
    const pathToWakuExamples = join(pathToWaku, 'examples');
    if (!existsSync(pathToWakuExamples)) {
      throw new Error(
        `The waku examples are not found in ${pathToWakuExamples} directory`
      );
    }

    const versions = await getVersions(pathToWaku);
    logger.info(`Syncing local dependencies to waku examples...`);
    await exec(
      `pnpm i react@${versions.react}` +
        ` react-dom@${versions.reactDom}` +
        ` react-server-dom-webpack@${versions.reactServerDomWebpack}` +
        ` waku@${versions.waku}` +
        ` vite@${versions.vite}` +
        ` && pnpm i -D @types/react@${versions.reactTypes}` +
        ` @types/react-dom@${versions.reactDomTypes}`,
      {
        cwd: appRootPath.path,
      }
    );
  } catch (error: any) {
    console.log(error);
    if (typeof error?.message === 'string') {
      logger.error(error.message);
    }
  } finally {
    logger.info(`Doing "finally" cleanup`);
    await cleanup();
  }
};

main();
