import appRootPath from 'app-root-path';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export type Deployment = {
  dir: string;
  path: string;
  ssr: boolean;
  usePkgCmd: boolean;
  servicePort: number;
  flyName: string;
  flyUrl: string;
  ipv4: string;
};

export const getDeployments = async (): Promise<Deployment[]> => {
  const file = await readFile(
    join(appRootPath.path, 'deployments.json'),
    'utf-8'
  );
  return JSON.parse(file) as Deployment[];
};

export const getVersions = async (wakuRepoDir: string) => {
  const repoPkgJSON = JSON.parse(
    await readFile(join(wakuRepoDir, 'package.json'), 'utf-8')
  );
  const publishedPkgJSON = JSON.parse(
    await readFile(
      join(wakuRepoDir, 'packages', 'waku', 'package.json'),
      'utf-8'
    )
  );
  const pickDep = (pkgJson: any, key: string) =>
    pkgJson['pnpm']?.['overrides']?.[key] ||
    pkgJson.dependencies?.[key] ||
    pkgJson.devDependencies?.[key] ||
    pkgJson.peerDependencies?.[key];

  const waku = publishedPkgJSON.version;
  const vite = pickDep(publishedPkgJSON, 'vite');
  const react = pickDep(publishedPkgJSON, 'react');
  const reactDom = pickDep(publishedPkgJSON, 'react-dom');
  const reactServerDomWebpack = pickDep(
    publishedPkgJSON,
    'react-server-dom-webpack'
  );
  const reactTypes = pickDep(repoPkgJSON, '@types/react');
  const reactDomTypes = pickDep(repoPkgJSON, '@types/react-dom');

  return {
    vite,
    reactTypes,
    reactDomTypes,
    react,
    reactDom,
    reactServerDomWebpack,
    waku,
  };
};
