import { createVaultEntrySchema, updateVaultEntrySchema, vaultPasswordSchema } from '@apotheke/contracts';
import { Router, type Request } from 'express';
import { database } from '../../database/context.js';
import { createVaultEntry, deleteVaultEntry, getVaultKey, listVaultEntries, lockVault, setupVault, unlockVault, updateVaultEntry, vaultConfigured } from './vaultService.js';

export const vaultRouter = Router();

function tokenOf(request: Request): string | undefined {
  const header = request.header('authorization');
  return header?.startsWith('Bearer ') ? header.slice(7) : undefined;
}

vaultRouter.get('/status', (request, response) => {
  let unlocked = false;
  try { getVaultKey(tokenOf(request)); unlocked = true; } catch { /* Locked is expected. */ }
  response.json({ configured: vaultConfigured(database), unlocked });
});

vaultRouter.post('/setup', (request, response) => {
  const { password } = vaultPasswordSchema.parse(request.body);
  response.status(201).json({ token: setupVault(database, password) });
});

vaultRouter.post('/unlock', (request, response) => {
  const { password } = vaultPasswordSchema.parse(request.body);
  response.json({ token: unlockVault(database, password) });
});

vaultRouter.post('/lock', (request, response) => {
  lockVault(tokenOf(request));
  response.status(204).end();
});

vaultRouter.get('/entries', (request, response) => response.json({ entries: listVaultEntries(database, getVaultKey(tokenOf(request))) }));
vaultRouter.post('/entries', (request, response) => response.status(201).json({ entry: createVaultEntry(database, getVaultKey(tokenOf(request)), createVaultEntrySchema.parse(request.body)) }));
vaultRouter.patch('/entries/:id', (request, response) => response.json({ entry: updateVaultEntry(database, getVaultKey(tokenOf(request)), request.params.id, updateVaultEntrySchema.parse(request.body)) }));
vaultRouter.delete('/entries/:id', (request, response) => { getVaultKey(tokenOf(request)); deleteVaultEntry(database, request.params.id); response.status(204).end(); });
