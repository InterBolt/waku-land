import { Screen } from './Screen.js';
import deployments from '../../deployments.json';

export const HomePage = ({
  searchParams,
}: {
  searchParams: URLSearchParams;
}) => {
  const flyName = searchParams.get('deployment') || deployments?.[0]?.flyName;
  return <Screen flyName={flyName as string} />;
};
