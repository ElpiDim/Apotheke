import {
  createIntegrationEntrySchema,
  createIntegrationFolderSchema,
} from '@apotheke/contracts';
import { Router } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { config } from '../../config/config.js';
import { database } from '../../database/context.js';
import { AppError } from '../../middleware/errors.js';
import {
  createIntegrationEntry,
  createIntegrationPdf,
  createIntegrationFolder,
  deleteIntegrationEntry,
  deleteIntegrationFolder,
  listIntegrationEntries,
  listIntegrationFolders,
  getIntegrationStoredFile,
  listStoredFilesInFolderTree,
} from './integrationRepository.js';
import { integrationPdfUpload } from './upload.js';

export const integrationsRouter = Router();

integrationsRouter.get('/', (_request, response) => {
  response.json({
    folders: listIntegrationFolders(database),
    entries: listIntegrationEntries(database),
  });
});

integrationsRouter.post('/folders', (request, response) => {
  const input = createIntegrationFolderSchema.parse(request.body);
  response.status(201).json({ folder: createIntegrationFolder(database, input) });
});

integrationsRouter.delete('/folders/:id', async (request, response) => {
  const storedFiles = listStoredFilesInFolderTree(database, request.params.id);
  deleteIntegrationFolder(database, request.params.id);
  await Promise.all(storedFiles.map((filename) => fs.rm(path.join(config.filesDir, filename), { force: true })));
  response.status(204).end();
});

integrationsRouter.post('/entries', (request, response) => {
  const input = createIntegrationEntrySchema.parse(request.body);
  response.status(201).json({ entry: createIntegrationEntry(database, input) });
});

integrationsRouter.post('/pdf', integrationPdfUpload.single('file'), async (request, response) => {
  const file = request.file;
  if (!file) throw new AppError(400, 'Choose a PDF file.', 'FILE_REQUIRED');
  const folderId = String(request.body.folderId ?? '');
  const description = String(request.body.description ?? '').trim().slice(0, 20_000);
  const title = String(request.body.title ?? '').trim()
    || path.basename(file.originalname, path.extname(file.originalname));
  const storedFilename = `integration-${randomUUID()}.pdf`;
  try {
    await fs.rename(file.path, path.join(config.filesDir, storedFilename));
    const entry = createIntegrationPdf(database, {
      folderId,
      title,
      description,
      originalFilename: file.originalname,
      storedFilename,
      fileSize: file.size,
    });
    response.status(201).json({ entry });
  } catch (error) {
    await fs.rm(file.path, { force: true });
    await fs.rm(path.join(config.filesDir, storedFilename), { force: true });
    throw error;
  }
});

integrationsRouter.get('/entries/:id/pdf', (request, response) => {
  const file = getIntegrationStoredFile(database, request.params.id);
  response.type('application/pdf');
  response.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(file.originalFilename)}`);
  response.sendFile(path.join(config.filesDir, file.storedFilename));
});

integrationsRouter.delete('/entries/:id', async (request, response) => {
  let storedFilename: string | null = null;
  try { storedFilename = getIntegrationStoredFile(database, request.params.id).storedFilename; } catch { /* Link-only item. */ }
  deleteIntegrationEntry(database, request.params.id);
  if (storedFilename) await fs.rm(path.join(config.filesDir, storedFilename), { force: true });
  response.status(204).end();
});
