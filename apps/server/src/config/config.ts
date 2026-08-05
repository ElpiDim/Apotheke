import path from 'node:path';

function parsePort(value: string | undefined): number {
  if (!value) return 4070;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('APOTHEKE_PORT must be an integer between 1 and 65535.');
  }
  return port;
}

const dataDir = path.resolve(
  process.env.APOTHEKE_DATA_DIR ?? path.join(process.cwd(), '../../data'),
);

export const config = Object.freeze({
  host: process.env.APOTHEKE_HOST ?? '127.0.0.1',
  port: parsePort(process.env.APOTHEKE_PORT),
  dataDir,
  databasePath: path.join(dataDir, 'apotheke.sqlite'),
  filesDir: path.join(dataDir, 'files'),
  tempDir: path.join(dataDir, 'tmp'),
  maxImportBytes: 50 * 1024 * 1024,
});
