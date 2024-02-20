import deployments from '../../deployments.json';
import { HomeScreen } from './ClientComponents.js';
import Seo from './Seo.js';
import { getSourceUrl, getUrl } from './utils.js';

export const HomePage = ({
  searchParams,
}: {
  searchParams: URLSearchParams;
}) => {
  const flyName = searchParams.get('deployment') || deployments?.[0]?.flyName;
  const deployment = deployments.find((d) => d.flyName === flyName);
  if (!deployment) throw new Error('Deployment not found');
  const url = getUrl(deployment);
  const sourceUrl = getSourceUrl(deployment);
  return (
    <>
      <Seo />
      <HomeScreen url={url} sourceUrl={sourceUrl} deployment={deployment} />
    </>
  );
};
