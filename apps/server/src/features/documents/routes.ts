import { Router } from 'express';
import path from 'node:path';
import { database } from '../../database/context.js';
import { config } from '../../config/config.js';
import { getDocumentForViewer, listDocuments } from './documentRepository.js';
import { importDocument } from './documentService.js';
import { documentUpload } from './upload.js';

export const documentsRouter = Router();

documentsRouter.get('/', (_request, response) => {
  response.json({ documents: listDocuments(database) });
});

documentsRouter.get('/:id', (request, response) => {
  const { document, extractedText } = getDocumentForViewer(database, request.params.id);
  response.json({ document, extractedText });
});

documentsRouter.get('/:id/file', (request, response) => {
  const { document, storedFilename } = getDocumentForViewer(database, request.params.id);
  response.type(document.currentVersion.mimeType);
  response.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(document.currentVersion.originalFilename)}`);
  response.sendFile(path.join(config.filesDir, storedFilename));
});

documentsRouter.post('/import', documentUpload.single('file'), async (request, response) => {
  const document = await importDocument(request.file, request.body as Record<string, unknown>);
  response.status(201).json({ document });
});
