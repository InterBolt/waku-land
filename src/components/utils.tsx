import deployments from '../../deployments.json';

export type Deployment = (typeof deployments)[0];

export const getUrl = (deployment: Deployment) => {
  const prodUrl = 'https://' + deployment.flyName + '.waku.land';
  const devUrl = 'http://127.0.0.1:' + deployment.servicePort;
  const url = import.meta.env.DEV ? devUrl : prodUrl;
  return url;
};

export const getSourceUrl = (deployment: Deployment) => {
  return `https://github.com/dai-shi/waku/tree/main/examples/${deployment.dir}`;
};
