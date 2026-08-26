import { createCipheriv, createDecipheriv, randomBytes, randomUUID, scryptSync } from 'node:crypto';
import type { CreateVaultEntryInput, UpdateVaultEntryInput, VaultEntry } from '@apotheke/contracts';
import type { ApothekeDatabase } from '../../database/database.js';
import { AppError } from '../../middleware/errors.js';

const algorithm = 'aes-256-gcm';
const verifierText = 'peanut-vault-verifier-v1';
const sessions = new Map<string, Buffer>();

interface EncryptedValue { iv: string; ciphertext: string; tag: string }
interface VaultRow { id: string; label: string; payloadIv: string; payloadCiphertext: string; payloadTag: string; createdAt: string; updatedAt: string }
interface VaultPayload { username: string; password: string; url: string; notes: string }

function deriveKey(password: string, salt: Buffer): Buffer {
  return scryptSync(password, salt, 32, { N: 16384, r: 8, p: 1 });
}

function encrypt(key: Buffer, plaintext: string): EncryptedValue {
  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return { iv: iv.toString('base64'), ciphertext: ciphertext.toString('base64'), tag: cipher.getAuthTag().toString('base64') };
}

function decrypt(key: Buffer, value: EncryptedValue): string {
  try {
    const decipher = createDecipheriv(algorithm, key, Buffer.from(value.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(value.tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(value.ciphertext, 'base64')), decipher.final()]).toString('utf8');
  } catch {
    throw new AppError(401, 'Incorrect master password or corrupted vault.', 'VAULT_UNLOCK_FAILED');
  }
}

export function vaultConfigured(database: ApothekeDatabase): boolean {
  return Boolean(database.prepare('SELECT 1 FROM vault_settings WHERE id = 1').get());
}

export function setupVault(database: ApothekeDatabase, password: string): string {
  if (vaultConfigured(database)) throw new AppError(409, 'The password vault is already configured.', 'VAULT_ALREADY_CONFIGURED');
  const salt = randomBytes(16);
  const key = deriveKey(password, salt);
  const verifier = encrypt(key, verifierText);
  database.prepare(`INSERT INTO vault_settings (id, salt, verifier_iv, verifier_ciphertext, verifier_tag, created_at) VALUES (1, ?, ?, ?, ?, ?)`)
    .run(salt.toString('base64'), verifier.iv, verifier.ciphertext, verifier.tag, new Date().toISOString());
  return createSession(key);
}

export function unlockVault(database: ApothekeDatabase, password: string): string {
  const settings = database.prepare(`SELECT salt, verifier_iv AS iv, verifier_ciphertext AS ciphertext, verifier_tag AS tag FROM vault_settings WHERE id = 1`)
    .get() as ({ salt: string } & EncryptedValue) | undefined;
  if (!settings) throw new AppError(409, 'Set up the password vault first.', 'VAULT_NOT_CONFIGURED');
  const key = deriveKey(password, Buffer.from(settings.salt, 'base64'));
  if (decrypt(key, settings) !== verifierText) throw new AppError(401, 'Incorrect master password.', 'VAULT_UNLOCK_FAILED');
  return createSession(key);
}

function createSession(key: Buffer): string {
  const token = randomBytes(32).toString('base64url');
  sessions.set(token, key);
  return token;
}

export function getVaultKey(token: string | undefined): Buffer {
  if (!token) throw new AppError(401, 'Unlock the password vault first.', 'VAULT_LOCKED');
  const key = sessions.get(token);
  if (!key) throw new AppError(401, 'Unlock the password vault first.', 'VAULT_LOCKED');
  return key;
}

export function lockVault(token: string | undefined): void {
  if (!token) return;
  const key = sessions.get(token);
  if (key) key.fill(0);
  sessions.delete(token);
}

function hydrate(row: VaultRow, key: Buffer): VaultEntry {
  const payload = JSON.parse(decrypt(key, { iv: row.payloadIv, ciphertext: row.payloadCiphertext, tag: row.payloadTag })) as VaultPayload;
  return { id: row.id, label: row.label, ...payload, createdAt: row.createdAt, updatedAt: row.updatedAt };
}

const selectEntries = `SELECT id, label, payload_iv AS payloadIv, payload_ciphertext AS payloadCiphertext, payload_tag AS payloadTag, created_at AS createdAt, updated_at AS updatedAt FROM vault_entries`;

export function listVaultEntries(database: ApothekeDatabase, key: Buffer): VaultEntry[] {
  return (database.prepare(`${selectEntries} ORDER BY label COLLATE NOCASE`).all() as VaultRow[]).map((row) => hydrate(row, key));
}

export function createVaultEntry(database: ApothekeDatabase, key: Buffer, input: CreateVaultEntryInput): VaultEntry {
  const id = randomUUID();
  const now = new Date().toISOString();
  const encrypted = encrypt(key, JSON.stringify({ username: input.username, password: input.password, url: input.url, notes: input.notes }));
  database.prepare(`INSERT INTO vault_entries (id, label, payload_iv, payload_ciphertext, payload_tag, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(id, input.label, encrypted.iv, encrypted.ciphertext, encrypted.tag, now, now);
  return listVaultEntries(database, key).find((entry) => entry.id === id)!;
}

export function updateVaultEntry(database: ApothekeDatabase, key: Buffer, id: string, input: UpdateVaultEntryInput): VaultEntry {
  const current = listVaultEntries(database, key).find((entry) => entry.id === id);
  if (!current) throw new AppError(404, 'Password entry not found.', 'VAULT_ENTRY_NOT_FOUND');
  const next = { label: input.label ?? current.label, username: input.username ?? current.username, password: input.password ?? current.password, url: input.url ?? current.url, notes: input.notes ?? current.notes };
  const encrypted = encrypt(key, JSON.stringify({ username: next.username, password: next.password, url: next.url, notes: next.notes }));
  database.prepare(`UPDATE vault_entries SET label = ?, payload_iv = ?, payload_ciphertext = ?, payload_tag = ?, updated_at = ? WHERE id = ?`)
    .run(next.label, encrypted.iv, encrypted.ciphertext, encrypted.tag, new Date().toISOString(), id);
  return listVaultEntries(database, key).find((entry) => entry.id === id)!;
}

export function deleteVaultEntry(database: ApothekeDatabase, id: string): void {
  const result = database.prepare('DELETE FROM vault_entries WHERE id = ?').run(id);
  if (result.changes === 0) throw new AppError(404, 'Password entry not found.', 'VAULT_ENTRY_NOT_FOUND');
}
