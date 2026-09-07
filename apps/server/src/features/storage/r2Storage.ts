import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { config } from '../../config/config.js';

export function r2Configured(): boolean {
  return Object.values(config.r2).every(Boolean);
}

function client(): S3Client {
  if (!r2Configured()) throw new Error('Cloudflare R2 is not configured.');
  return new S3Client({
    region: 'auto',
    endpoint: config.r2.endpoint,
    credentials: {
      accessKeyId: config.r2.accessKeyId,
      secretAccessKey: config.r2.secretAccessKey,
    },
  });
}

export async function checkR2Connection(): Promise<void> {
  await client().send(new HeadBucketCommand({ Bucket: config.r2.bucket }));
}
