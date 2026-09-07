import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({
  path: [path.resolve(process.cwd(), '.env'), path.resolve(process.cwd(), '../../.env')],
  quiet: true,
});

function parsePort(value: string | undefined): number {
  if (!value) return 4070;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PEANUT_PORT must be an integer between 1 and 65535.');
  }
  return port;
}

const dataDir = path.resolve(
  process.env.PEANUT_DATA_DIR ?? process.env.APOTHEKE_DATA_DIR ?? path.join(process.cwd(), '../../data'),
);

export const config = Object.freeze({
  host: process.env.PEANUT_HOST ?? process.env.APOTHEKE_HOST ?? '127.0.0.1',
  port: parsePort(process.env.PEANUT_PORT ?? process.env.APOTHEKE_PORT),
  dataDir,
  databasePath: path.join(dataDir, 'apotheke.sqlite'),
  filesDir: path.join(dataDir, 'files'),
  tempDir: path.join(dataDir, 'tmp'),
  maxImportBytes: 50 * 1024 * 1024,
  r2: {
    accountId: process.env.R2_ACCOUNT_ID?.trim() ?? '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID?.trim() ?? '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY?.trim() ?? '',
    bucket: process.env.R2_BUCKET?.trim() ?? '',
    endpoint: process.env.R2_ENDPOINT?.trim() ?? '',
  },
});
