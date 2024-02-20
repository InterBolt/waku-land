import ky from 'ky';
import logger from 'signale';
import { Deployment, getDeployments } from './utils';
import dotenv from 'dotenv';
import appRootPath from 'app-root-path';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';

const ENV = dotenv.parse(readFileSync(join(appRootPath.path, '.env')));

// Constants, env vars, and types
const DNS_TAG = 'source:waku-land';
const API_BASE = `https://api.cloudflare.com/client/v4`;
const CLOUDFLARE_API_TOKEN = ENV.CLOUDFLARE_API_TOKEN as string;
const CLOUDFLARE_ZONE_ID = ENV.CLOUDFLARE_ZONE_ID as string;
if (!CLOUDFLARE_API_TOKEN) {
  throw new Error('env.CLOUDFLARE_API_TOKEN is not set');
}
if (!CLOUDFLARE_ZONE_ID) {
  throw new Error('env.CLOUDFLARE_ZONE_ID is not set');
}

type DNSRecordCreateBody = {
  content: string;
  name: string;
  type: string;
  proxied: boolean;
  comment: string;
  ttl: number;
};

type DNSRecord = {
  id: string;
  content: string;
  comment?: string;
  name: string;
  type: string;
};

type ResponseListDNSRecords = {
  errors: any[];
  messages: any[];
  result: DNSRecord[];
  success: boolean;
};

// Cloudfare API wrapper methods
const apiList = async () =>
  ky
    .get(`${API_BASE}/zones/${CLOUDFLARE_ZONE_ID}/dns_records`, {
      credentials: 'include',
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
      },
    })
    .json() as Promise<ResponseListDNSRecords>;

const apiCreate = (createRecordBody: DNSRecordCreateBody) =>
  ky
    .post(`${API_BASE}/zones/${CLOUDFLARE_ZONE_ID}/dns_records`, {
      credentials: 'include',
      json: createRecordBody,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
      },
    })
    .json();
const apiDelete = (dnsRecordId: string) =>
  ky
    .delete(
      `${API_BASE}/zones/${CLOUDFLARE_ZONE_ID}/dns_records/${dnsRecordId}`,
      {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
        },
      }
    )
    .json();

const utilFormatDnsCreateRecord = (
  deployment: Deployment
): DNSRecordCreateBody => {
  return {
    content: deployment.ipv4,
    name: `${deployment.flyName}`,
    type: 'A',
    proxied: false,
    comment: DNS_TAG,
    ttl: 300,
  };
};

const utilGetChangeset = async () => {
  // This assumes the deployments were generated before this script runs
  logger.info(`Getting generated deployments from repo root.`);
  const deployments = await getDeployments();
  logger.info(`Getting the list of DNS records from cloudflare.`);
  const listApiResponse = await apiList();
  if (listApiResponse.success === false) {
    listApiResponse.errors.forEach((e) => {
      logger.error(
        `Cloudflare error message: ${e.message} with code: ${e.code}`
      );
    });
    throw new Error('Failed to list DNS records');
  }
  // Every dns record should have a specific type of comment so that we don't fuck with valid records
  const deploymentDnsRecords = listApiResponse.result.filter((record) =>
    record.comment?.includes(DNS_TAG)
  );
  // Delete the dns records that are not in the deployments
  const toDelete: DNSRecord[] = deploymentDnsRecords.filter(
    (record) =>
      !deployments.find((e) => `${e.flyName}.waku.land` === record.name)
  );
  const toSkip = deploymentDnsRecords.filter((record) => {
    const doesDeploymentExistInCdn = deployments.find(
      (e) => `${e.flyName}.waku.land` === record.name
    );
    let shouldSkip = false;
    // If the deployment does not exist in the dns, we should not skip
    if (!doesDeploymentExistInCdn) {
      return shouldSkip;
    }
    shouldSkip = record.content === doesDeploymentExistInCdn?.ipv4;
    // Delete the dns records that we need to update.
    // TODO: what downside to delete/create api combo rather than update api?
    if (!shouldSkip) {
      toDelete.push(record);
    }
    return shouldSkip;
  });
  // Create any records that we shouldn't skip
  const toCreate: DNSRecordCreateBody[] = deployments
    .filter(
      (deployment) =>
        !toSkip.some(
          (record) => record.name === `${deployment.flyName}.waku.land`
        )
    )
    .map((deployment) => utilFormatDnsCreateRecord(deployment));

  logger.info(
    `Will create ${toCreate.length} records and delete ${toDelete.length} records.`
  );
  return {
    toCreate,
    toDelete,
  };
};

// maps rejections to the records that were rejected
const utilHandleRejects = async <Record extends any>(
  promises: Promise<any>[],
  records: Record[]
) => {
  const results = await Promise.allSettled(promises);
  const failed: Record[] = [];
  for (const index in results) {
    const result = results[index];
    if (result.status === 'rejected') {
      failed.push(records[index]);
    }
  }
  return failed;
};

// Delete everything first, then create everything.
// This is smart enough to not delete or create records
// that already match.
const main = async () => {
  try {
    const { toCreate, toDelete } = await utilGetChangeset();
    const failedDeletions = await utilHandleRejects(
      toDelete.map((r) => apiDelete(r.id)),
      toDelete
    );
    if (failedDeletions.length > 0) {
      failedDeletions.forEach((record) => {
        logger.error(`Failed to delete record ${record.name}`);
      });
      return;
    }
    logger.info(`Deleted ${toDelete.length} records`);
    const failedCreations = await utilHandleRejects(
      toCreate.map((r) => apiCreate(r)),
      toCreate
    );
    if (failedCreations.length > 0) {
      failedCreations.forEach((record) => {
        logger.error(`Failed to create record ${record.name}`);
      });
      return;
    }
    logger.info(`Created ${toCreate.length} records`);
    logger.success('All records created successfully');
  } catch (err: any) {
    console.log(err);
    if (err?.message) {
      logger.error(err.message);
    }
  }
};

main();
