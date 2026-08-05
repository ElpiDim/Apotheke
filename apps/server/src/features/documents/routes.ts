import { Router } from 'express';
import { database } from '../../database/context.js';
import { listDocuments } from './documentRepository.js';
import { importDocument } from './documentService.js';
import { documentUpload } from './upload.js';

export const documentsRouter = Router();

documentsRouter.get('/', (_request, response) => {
  response.json({ documents: listDocuments(database) });
});

documentsRouter.post('/import', documentUpload.single('file'), async (request, response) => {
  const document = await importDocument(request.file, request.body as Record<string, unknown>);
  response.status(201).json({ document });
});
