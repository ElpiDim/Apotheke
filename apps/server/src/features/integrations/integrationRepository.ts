import { randomUUID } from 'node:crypto';
import type {
  CreateIntegrationEntryInput,
  CreateIntegrationFolderInput,
  IntegrationEntry,
  IntegrationFolder,
  UpdateIntegrationEntryInput,
  UpdateIntegrationFolderInput,
} from '@apotheke/contracts';
import type { ApothekeDatabase } from '../../database/database.js';
import { AppError } from '../../middleware/errors.js';
import { reindexIntegrationEntry, removeFromIndex } from '../search/indexer.js';

interface FolderRow {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface EntryRow {
  id: string;
  folderId: string;
  title: string;
  description: string;
  url: string | null;
  originalFilename: string | null;
  storedFilename: string | null;
  mimeType: string | null;
  fileSize: number | null;
  createdAt: string;
  updatedAt: string;
}

export function listIntegrationFolders(database: ApothekeDatabase): IntegrationFolder[] {
  return database.prepare(`
    SELECT id, name, parent_id AS parentId, created_at AS createdAt, updated_at AS updatedAt
    FROM integration_folders
    ORDER BY name COLLATE NOCASE
  `).all() as FolderRow[];
}

export function listIntegrationEntries(database: ApothekeDatabase): IntegrationEntry[] {
  const rows = database.prepare(`
    SELECT id, folder_id AS folderId, title, description, url,
           original_filename AS originalFilename, stored_filename AS storedFilename,
           mime_type AS mimeType, file_size AS fileSize,
           created_at AS createdAt, updated_at AS updatedAt
    FROM integration_entries
    ORDER BY updated_at DESC
  `).all() as EntryRow[];
  return rows.map(hydrateEntry);
}

function hydrateEntry(row: EntryRow): IntegrationEntry {
  return {
    id: row.id,
    folderId: row.folderId,
    title: row.title,
    description: row.description,
    url: row.url,
    attachment: row.originalFilename && row.mimeType && row.fileSize !== null
      ? { originalFilename: row.originalFilename, mimeType: row.mimeType, fileSize: row.fileSize }
      : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function requireFolder(database: ApothekeDatabase, id: string): void {
  if (!database.prepare('SELECT 1 FROM integration_folders WHERE id = ?').get(id)) {
    throw new AppError(404, 'Integration folder not found.', 'INTEGRATION_FOLDER_NOT_FOUND');
  }
}

export function createIntegrationFolder(
  database: ApothekeDatabase,
  input: CreateIntegrationFolderInput,
): IntegrationFolder {
  if (input.parentId) requireFolder(database, input.parentId);
  const id = randomUUID();
  const now = new Date().toISOString();
  database.prepare(`
    INSERT INTO integration_folders (id, name, parent_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, input.name, input.parentId, now, now);
  return { id, name: input.name, parentId: input.parentId, createdAt: now, updatedAt: now };
}

export function updateIntegrationFolder(
  database: ApothekeDatabase,
  id: string,
  input: UpdateIntegrationFolderInput,
): IntegrationFolder {
  requireFolder(database, id);
  const current = listIntegrationFolders(database).find((folder) => folder.id === id)!;
  const nextParentId = input.parentId === undefined ? current.parentId : input.parentId;
  if (nextParentId === id) throw new AppError(400, 'A folder cannot contain itself.', 'INVALID_FOLDER_PARENT');
  if (nextParentId) {
    requireFolder(database, nextParentId);
    const descendants = database.prepare(`
      WITH RECURSIVE descendants(id) AS (
        SELECT id FROM integration_folders WHERE parent_id = ?
        UNION ALL
        SELECT f.id FROM integration_folders f JOIN descendants d ON f.parent_id = d.id
      ) SELECT id FROM descendants
    `).all(id) as { id: string }[];
    if (descendants.some((folder) => folder.id === nextParentId)) {
      throw new AppError(400, 'A folder cannot be moved inside one of its subfolders.', 'INVALID_FOLDER_PARENT');
    }
  }
  const now = new Date().toISOString();
  database.prepare('UPDATE integration_folders SET name = ?, parent_id = ?, updated_at = ? WHERE id = ?')
    .run(input.name ?? current.name, nextParentId, now, id);
  const updated = listIntegrationFolders(database).find((folder) => folder.id === id)!;
  const entryIds = database.prepare(`
    WITH RECURSIVE folder_tree(id) AS (
      SELECT id FROM integration_folders WHERE id = ?
      UNION ALL SELECT f.id FROM integration_folders f JOIN folder_tree tree ON f.parent_id = tree.id
    ) SELECT id FROM integration_entries WHERE folder_id IN (SELECT id FROM folder_tree)
  `).all(id) as { id: string }[];
  for (const entry of entryIds) reindexIntegrationEntry(database, entry.id);
  return updated;
}

export function deleteIntegrationFolder(database: ApothekeDatabase, id: string): void {
  requireFolder(database, id);
  database.transaction(() => {
    const entryIds = database.prepare(`
      WITH RECURSIVE folder_tree(id) AS (
        SELECT id FROM integration_folders WHERE id = ?
        UNION ALL
        SELECT f.id FROM integration_folders f JOIN folder_tree tree ON f.parent_id = tree.id
      )
      SELECT id FROM integration_entries WHERE folder_id IN (SELECT id FROM folder_tree)
    `).all(id) as { id: string }[];
    for (const entry of entryIds) removeFromIndex(database, 'integration', entry.id);
    database.prepare('DELETE FROM integration_folders WHERE id = ?').run(id);
  })();
}

export function createIntegrationEntry(
  database: ApothekeDatabase,
  input: CreateIntegrationEntryInput,
): IntegrationEntry {
  requireFolder(database, input.folderId);
  const id = randomUUID();
  const now = new Date().toISOString();
  database.prepare(`
    INSERT INTO integration_entries (id, folder_id, title, description, url, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, input.folderId, input.title, input.description, input.url, now, now);
  reindexIntegrationEntry(database, id);
  return { id, folderId: input.folderId, title: input.title, description: input.description, url: input.url, attachment: null, createdAt: now, updatedAt: now };
}

export function updateIntegrationEntry(
  database: ApothekeDatabase,
  id: string,
  input: UpdateIntegrationEntryInput,
): IntegrationEntry {
  const current = listIntegrationEntries(database).find((entry) => entry.id === id);
  if (!current) throw new AppError(404, 'Integration entry not found.', 'INTEGRATION_ENTRY_NOT_FOUND');
  const folderId = input.folderId ?? current.folderId;
  requireFolder(database, folderId);
  database.prepare(`
    UPDATE integration_entries
    SET folder_id = ?, title = ?, description = ?, url = ?, updated_at = ?
    WHERE id = ?
  `).run(
    folderId,
    input.title ?? current.title,
    input.description ?? current.description,
    input.url === undefined ? current.url : input.url,
    new Date().toISOString(),
    id,
  );
  reindexIntegrationEntry(database, id);
  return listIntegrationEntries(database).find((entry) => entry.id === id)!;
}

export interface IntegrationPdfInput {
  folderId: string;
  title: string;
  description: string;
  originalFilename: string;
  storedFilename: string;
  fileSize: number;
}

export function createIntegrationPdf(database: ApothekeDatabase, input: IntegrationPdfInput): IntegrationEntry {
  requireFolder(database, input.folderId);
  const id = randomUUID();
  const now = new Date().toISOString();
  database.prepare(`
    INSERT INTO integration_entries (
      id, folder_id, title, description, url, original_filename, stored_filename,
      mime_type, file_size, created_at, updated_at
    ) VALUES (?, ?, ?, ?, NULL, ?, ?, 'application/pdf', ?, ?, ?)
  `).run(id, input.folderId, input.title, input.description, input.originalFilename, input.storedFilename, input.fileSize, now, now);
  reindexIntegrationEntry(database, id);
  return {
    id,
    folderId: input.folderId,
    title: input.title,
    description: input.description,
    url: null,
    attachment: { originalFilename: input.originalFilename, mimeType: 'application/pdf', fileSize: input.fileSize },
    createdAt: now,
    updatedAt: now,
  };
}

export function getIntegrationStoredFile(database: ApothekeDatabase, id: string): { storedFilename: string; originalFilename: string } {
  const row = database.prepare(`
    SELECT stored_filename AS storedFilename, original_filename AS originalFilename
    FROM integration_entries WHERE id = ? AND stored_filename IS NOT NULL
  `).get(id) as { storedFilename: string; originalFilename: string } | undefined;
  if (!row) throw new AppError(404, 'Integration PDF not found.', 'INTEGRATION_PDF_NOT_FOUND');
  return row;
}

export function listStoredFilesInFolderTree(database: ApothekeDatabase, folderId: string): string[] {
  const rows = database.prepare(`
    WITH RECURSIVE folder_tree(id) AS (
      SELECT id FROM integration_folders WHERE id = ?
      UNION ALL
      SELECT f.id FROM integration_folders f JOIN folder_tree tree ON f.parent_id = tree.id
    )
    SELECT stored_filename AS storedFilename
    FROM integration_entries
    WHERE folder_id IN (SELECT id FROM folder_tree) AND stored_filename IS NOT NULL
  `).all(folderId) as { storedFilename: string }[];
  return rows.map((row) => row.storedFilename);
}

export function deleteIntegrationEntry(database: ApothekeDatabase, id: string): void {
  const exists = database.prepare('SELECT 1 FROM integration_entries WHERE id = ?').get(id);
  if (!exists) {
    throw new AppError(404, 'Integration entry not found.', 'INTEGRATION_ENTRY_NOT_FOUND');
  }
  database.transaction(() => {
    removeFromIndex(database, 'integration', id);
    database.prepare('DELETE FROM integration_entries WHERE id = ?').run(id);
  })();
}
