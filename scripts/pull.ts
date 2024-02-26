import { join } from 'node:path';
import { exec as execWithCallback } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { cp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { simpleGit, SimpleGit } from 'simple-git';
import appRootPath from 'app-root-path';
import logger from 'signale';
import dotenv from 'dotenv';
import { Deployment, getVersions } from './utils';

const ENV = dotenv.parse(readFileSync(join(appRootPath.path, '.env')));

const skipIfExists = `${process.env.SKIP_IF_EXISTS}` === 'true';
if (skipIfExists && existsSync(join(appRootPath.path, 'deployments.json'))) {
  logger.warn(
    'Skipping pull/building process because SKIP_IF_EXISTS is set to true'
  );
  process.exit(0);
}

const exec = promisify(execWithCallback);

const WAKU_CHECKOUT = ENV.WAKU_CHECKOUT || 'main';
const CANONICAL_REPO = 'https://github.com/dai-shi/waku.git';
const WAKU_REPO = ENV.WAKU_REPO || CANONICAL_REPO;
const TMP_DIR = '.temp-waku';
const PATH_TMP = join(appRootPath.path, TMP_DIR);
const PATH_DEPLOYMENTS = join(appRootPath.path, 'deployments');

if (CANONICAL_REPO !== WAKU_REPO) {
  logger.warn(
    `Using an alternative git repo: ${WAKU_REPO}. Things might break.`
  );
}

const cleanup = async () => {
  if (existsSync(PATH_TMP)) {
    logger.warn(`Removing ${TMP_DIR} directory in 2 seconds...`);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await rm(TMP_DIR, {
      recursive: true,
      force: true,
    });
    logger.info(`Removed ${TMP_DIR}`);
  }
};

const installEachExamplesDeps = async () => {
  const dirs = await readdir(PATH_DEPLOYMENTS);
  const promises = [];
  for (const dir of dirs) {
    promises.push(
      exec(
        `rm -rf node_modules dist && pnpm install && pnpm add waku@file:../../waku/packages/waku/`,
        {
          cwd: join(PATH_DEPLOYMENTS, dir),
        }
      )
    );
  }
  const installationResults = await Promise.all(promises);
  for (const i in installationResults) {
    if (installationResults[i].stderr) {
      console.log(installationResults[i].stderr);
    }
  }
};

const buildEachExample = async () => {
  const dirs = await readdir(PATH_DEPLOYMENTS);
  const promises = [];
  for (const dir of dirs) {
    promises.push(
      exec(`pnpm run build`, {
        cwd: join(PATH_DEPLOYMENTS, dir),
      })
    );
  }
  const buildResults = await Promise.allSettled(promises);
  const failedToBuild = [];
  for (const i in buildResults) {
    const result = buildResults[i];
    if (result.status === 'rejected') {
      failedToBuild.push([dirs[i], result.reason]);
    } else {
      if (result.value.stderr) {
        failedToBuild.push([dirs[i], result.value.stderr]);
      }
    }
  }
  if (failedToBuild.length > 0) {
    const errorMessages = failedToBuild.map(
      ([dir, stderr]) => `${dir}: ${stderr}`
    );
    errorMessages.forEach((e) => logger.warn(e));
  }
};

const generateDeploymentsArtifact = async () => {
  const dirs = await readdir(PATH_DEPLOYMENTS);
  const deployments: Array<Deployment> = [];
  let i = 0;
  for (const dir of dirs) {
    i++;
    const pathToDeploymentExample = join(PATH_DEPLOYMENTS, dir);
    const packageJson = JSON.parse(
      await readFile(join(pathToDeploymentExample, 'package.json'), 'utf-8')
    );
    const usesWakuCli = packageJson.scripts.start.startsWith(`waku `);
    const ssr = packageJson.scripts.start.includes(` --with-ssr`);
    if (!usesWakuCli) {
      logger.warn(`The example ${dir} will not use waku cli`);
    }
    // create a regex that matches a valid subdomain
    const flyNameRegex = /^[a-z0-9-]+$/;
    const flyName = `waku-${dir.replaceAll('_', '-').toLowerCase()}`;
    if (!flyNameRegex.test(flyName)) {
      throw new Error(
        `The flyName ${flyName} is not valid, check the regex or normalization logic in this scropt.`
      );
    }
    deployments.push({
      dir,
      path: join('deployments', dir),
      ssr,
      usePkgCmd: !usesWakuCli,
      flyName: flyName,
      flyUrl: `https://${flyName}.waku.land`,
      ipv4: '149.248.203.169',
      servicePort: 8080 + i,
    });
  }

  await writeFile(
    join(appRootPath.path, 'deployments.json'),
    JSON.stringify(deployments, null, 2)
  );
};

const createExamples = async () => {
  logger.info(`Initializing temp directory...`);
  if (existsSync(PATH_TMP)) {
    logger.info(`Doing initialization cleanup`);
    await cleanup();
  }

  mkdirSync(PATH_TMP);

  const git: SimpleGit = simpleGit({
    baseDir: PATH_TMP,
    binary: 'git',
    maxConcurrentProcesses: 6,
    trimmed: false,
  });

  logger.info(`Cloning ${WAKU_REPO}...`);
  await git.clone(WAKU_REPO);
  git.cwd(join(PATH_TMP, 'waku'));

  logger.info(`Checking out ${WAKU_CHECKOUT} branch...`);
  await git.checkout(WAKU_CHECKOUT);

  const pathToTmpWaku = join(TMP_DIR, 'waku');
  const pathToWakuExamples = join(TMP_DIR, 'waku', 'examples');
  if (!existsSync(pathToWakuExamples)) {
    throw new Error(
      `The waku examples are not found in ${pathToWakuExamples} directory`
    );
  }
  if (!existsSync(PATH_DEPLOYMENTS)) {
    mkdirSync(PATH_DEPLOYMENTS);
  }

  logger.warn(`Overwriting deployments in 2 seconds...`);
  await new Promise((resolve) => setTimeout(resolve, 2000));
  await cp(pathToWakuExamples, PATH_DEPLOYMENTS, {
    recursive: true,
    force: true,
  });
  const pathToFinalWaku = join(appRootPath.path, 'waku');
  logger.warn(`Overwriting waku in 2 seconds...`);
  await new Promise((resolve) => setTimeout(resolve, 2000));
  // Useful for local dev, where the waku package from the previous run is still there
  if (existsSync(pathToFinalWaku)) {
    await rm(pathToFinalWaku, {
      recursive: true,
      force: true,
    });
  }
  await cp(pathToTmpWaku, pathToFinalWaku, {
    recursive: true,
    force: true,
  });
  logger.info(`Installing waku dependencies and compiling...`);
  await exec(`pnpm install && pnpm -r --filter='./packages/waku' run compile`, {
    cwd: pathToFinalWaku,
  });
  const versions = await getVersions(pathToTmpWaku);
  logger.info(`Syncing local dependencies to waku examples...`);
  await exec(
    `pnpm i react@${versions.react}` +
      ` react-dom@${versions.reactDom}` +
      ` react-server-dom-webpack@${versions.reactServerDomWebpack}` +
      ` @types/react@${versions.reactTypes}` +
      ` @types/react-dom@${versions.reactDomTypes}`,
    {
      cwd: appRootPath.path,
    }
  );

  logger.info(`Installing example dependencies...`);
  await installEachExamplesDeps();

  logger.info(`Building examples...`);
  await buildEachExample();
};

const main = async () => {
  try {
    await exec(`rm -rf node_modules && pnpm install`, {
      cwd: appRootPath.path,
    });
    logger.info(`Starting build...`);
    await createExamples();
    logger.info(`Creating serve examples...`);
    await generateDeploymentsArtifact();
    logger.success('Built examples successfully!');
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
