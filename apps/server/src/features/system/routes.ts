import { Router } from 'express';
import { checkR2Connection, r2Configured } from '../storage/r2Storage.js';

export const systemRouter = Router();

systemRouter.get('/health', (_request, response) => {
  response.json({ status: 'ok', service: 'peanut' });
});

systemRouter.get('/storage/status', async (_request, response) => {
  if (!r2Configured()) {
    response.json({ configured: false, connected: false });
    return;
  }
  try {
    await checkR2Connection();
    response.json({ configured: true, connected: true });
  } catch {
    response.status(503).json({ configured: true, connected: false, error: 'R2_CONNECTION_FAILED', message: 'Peanut could not connect to its private file storage.' });
  }
});
