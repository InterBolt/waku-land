import appRootPath from 'app-root-path';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

// lol
export const THINGS_THAT_MIGHT_CHANGE = {
  ssrFlag: '--with-ssr',
  binCommand: 'waku',
  ipv4: '149.248.203.169',
};

export type Deployment = {
  dir: string;
  path: string;
  ssr: boolean;
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

  // save a lil typing.
  const devProdPeerOrOverride = (key: string) =>
    repoPkgJSON['pnpm']?.['overrides']?.[key] ||
    repoPkgJSON.dependencies?.[key] ||
    repoPkgJSON.devDependencies?.[key] ||
    repoPkgJSON.peerDependencies?.[key];

  const waku = publishedPkgJSON.version;
  const vite = devProdPeerOrOverride('vite');
  const react = devProdPeerOrOverride('react');
  const reactDom = devProdPeerOrOverride('react-dom');
  const reactServerDomWebpack = devProdPeerOrOverride(
    'react-server-dom-webpack'
  );
  const reactTypes = devProdPeerOrOverride('@types/react');
  const reactDomTypes = devProdPeerOrOverride('@types/react-dom');

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
