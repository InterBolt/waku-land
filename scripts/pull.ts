import { join } from 'node:path';
import { exec as execWithCallback } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync, mkdirSync } from 'node:fs';
import { cp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { simpleGit, SimpleGit } from 'simple-git';
import appRootPath from 'app-root-path';
import logger from 'signale';
import { Deployment, THINGS_THAT_MIGHT_CHANGE, getVersions } from './utils';

const skipIfExists = `${process.env.SKIP_IF_EXISTS}` === 'true';
if (skipIfExists && existsSync(join(appRootPath.path, 'deployments.json'))) {
  logger.warn(
    'Skipping pull/building process because SKIP_IF_EXISTS is set to true'
  );
  process.exit(0);
}

const exec = promisify(execWithCallback);

const wakuDeploymentsOutput = 'deployments';
const tempWakuDir = '.temp-waku';
const pathToTempWaku = join(appRootPath.path, tempWakuDir);
const pathToDeployments = join(appRootPath.path, wakuDeploymentsOutput);
const pathToDeploymentsData = join(appRootPath.path, 'deployments.json');

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

const installEachExamplesDeps = async () => {
  const dirs = await readdir(pathToDeployments);
  const promises = [];
  for (const dir of dirs) {
    promises.push(
      exec(
        `rm -rf node_modules dist && pnpm install && pnpm add waku@file:../../waku/packages/waku/`,
        {
          cwd: join(pathToDeployments, dir),
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
  const dirs = await readdir(pathToDeployments);
  const promises = [];
  for (const dir of dirs) {
    promises.push(
      exec(`pnpm run build`, {
        cwd: join(pathToDeployments, dir),
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
  const dirs = await readdir(pathToDeployments);
  const deployments: Array<Deployment> = [];
  let i = 0;
  for (const dir of dirs) {
    i++;
    const pathToDeploymentExample = join(pathToDeployments, dir);
    const packageJson = JSON.parse(
      await readFile(join(pathToDeploymentExample, 'package.json'), 'utf-8')
    );
    const usesWakuCli = packageJson.scripts.start.startsWith(
      `${THINGS_THAT_MIGHT_CHANGE.binCommand} `
    );
    const ssr = packageJson.scripts.start.includes(
      ` ${THINGS_THAT_MIGHT_CHANGE.ssrFlag}`
    );
    if (!usesWakuCli) {
      logger.warn(
        `The example ${dir} does not use waku cli, skipping it from serving`
      );
      continue;
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
      flyName: flyName,
      flyUrl: `https://${flyName}.waku.land`,
      ipv4: THINGS_THAT_MIGHT_CHANGE.ipv4,
      servicePort: 8080 + i,
    });
  }
  await writeFile(pathToDeploymentsData, JSON.stringify(deployments, null, 2));
};

const createExamples = async () => {
  logger.info(`Initializing temp directory...`);
  if (existsSync(pathToTempWaku)) {
    logger.info(`Doing initialization cleanup`);
    await cleanup();
  }

  mkdirSync(pathToTempWaku);

  const git: SimpleGit = simpleGit({
    baseDir: pathToTempWaku,
    binary: 'git',
    maxConcurrentProcesses: 6,
    trimmed: false,
  });

  logger.info(`Cloning waku repository...`);
  await git.clone('https://github.com/dai-shi/waku.git');

  const pathToTmpWaku = join(tempWakuDir, 'waku');
  const pathToWakuExamples = join(tempWakuDir, 'waku', 'examples');
  if (!existsSync(pathToWakuExamples)) {
    throw new Error(
      `The waku examples are not found in ${pathToWakuExamples} directory`
    );
  }
  if (!existsSync(pathToDeployments)) {
    mkdirSync(pathToDeployments);
  }

  logger.warn(`Overwriting deployments in 2 seconds...`);
  await new Promise((resolve) => setTimeout(resolve, 2000));
  await cp(pathToWakuExamples, pathToDeployments, {
    recursive: true,
    force: true,
  });
  const pathToFinalWaku = join(appRootPath.path, 'waku');
  logger.warn(`Overwriting waku in 2 seconds...`);
  await new Promise((resolve) => setTimeout(resolve, 2000));
  await cp(pathToTmpWaku, join(appRootPath.path, 'waku'), {
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
