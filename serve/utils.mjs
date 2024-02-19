import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export const getDeployments = () => {
  const pathToDeployments = join(process.cwd(), 'deployments.json');
  if (!existsSync(pathToDeployments)) {
    throw new Error(
      '`deployments.json` not found. If running locally, run `npm run dev:setup` first'
    );
  }
  const deployments = JSON.parse(readFileSync(pathToDeployments, 'utf-8'));
  return deployments;
};
