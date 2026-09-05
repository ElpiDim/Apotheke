import express from 'express';
import { taxonomyRouter } from './features/categories/routes.js';
import { documentsRouter } from './features/documents/routes.js';
import { notesRouter } from './features/notes/routes.js';
import { integrationsRouter } from './features/integrations/routes.js';
import { tasksRouter } from './features/tasks/routes.js';
import { searchRouter } from './features/search/routes.js';
import { vaultRouter } from './features/vault/routes.js';
import { profileRouter } from './features/profile/routes.js';
import { systemRouter } from './features/system/routes.js';
import { authRouter } from './features/auth/routes.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler } from './middleware/errors.js';

export function createApp(): express.Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '2mb' }));

  app.use('/api/auth', authRouter);
  app.use('/api', systemRouter);
  app.use('/api', requireAuth);
  app.use('/api/documents', documentsRouter);
  app.use('/api/notes', notesRouter);
  app.use('/api/integrations', integrationsRouter);
  app.use('/api/tasks', tasksRouter);
  app.use('/api/search', searchRouter);
  app.use('/api/vault', vaultRouter);
  app.use('/api/profile', profileRouter);
  app.use('/api', taxonomyRouter);

  app.use((_request, response) => {
    response.status(404).json({ error: 'NOT_FOUND', message: 'Route not found.' });
  });
  app.use(errorHandler);
  return app;
}
