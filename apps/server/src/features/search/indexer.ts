import type { ApothekeDatabase } from '../../database/database.js';

interface SearchSourceRow {
  title: string;
  content: string;
  category: string | null;
  tags: string | null;
  version: string | null;
  originalFilename?: string | null;
}

function replaceIndexRow(
  database: ApothekeDatabase,
  entityType: 'document' | 'note' | 'integration',
  entityId: string,
  source: SearchSourceRow,
): void {
  database
    .prepare('DELETE FROM search_index WHERE entity_type = ? AND entity_id = ?')
    .run(entityType, entityId);

  const metadata = [source.category, source.tags, source.version, source.originalFilename].filter(Boolean).join(' ');
  database
    .prepare(
      `INSERT INTO search_index (entity_type, entity_id, title, content, metadata)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(entityType, entityId, source.title, source.content, metadata);
}

export function reindexDocument(database: ApothekeDatabase, documentId: string): void {
  const row = database
    .prepare(
      `SELECT d.title,
              v.extracted_text AS content,
              c.name AS category,
              GROUP_CONCAT(DISTINCT t.name) AS tags,
              v.version_label AS version
              ,v.original_filename AS originalFilename
       FROM documents d
       JOIN document_versions v ON v.document_id = d.id AND v.is_current = 1
       LEFT JOIN categories c ON c.id = d.category_id
       LEFT JOIN document_tags dt ON dt.document_id = d.id
       LEFT JOIN tags t ON t.id = dt.tag_id
       WHERE d.id = ?
       GROUP BY d.id, v.id`,
    )
    .get(documentId) as SearchSourceRow | undefined;

  if (row) replaceIndexRow(database, 'document', documentId, row);
}

export function reindexNote(database: ApothekeDatabase, noteId: string): void {
  const row = database
    .prepare(
      `SELECT n.title,
              n.content,
              c.name AS category,
              GROUP_CONCAT(DISTINCT t.name) AS tags,
              NULL AS version
       FROM notes n
       LEFT JOIN categories c ON c.id = n.category_id
       LEFT JOIN note_tags nt ON nt.note_id = n.id
       LEFT JOIN tags t ON t.id = nt.tag_id
       WHERE n.id = ?
       GROUP BY n.id`,
    )
    .get(noteId) as SearchSourceRow | undefined;

  if (row) replaceIndexRow(database, 'note', noteId, row);
}

export function reindexIntegrationEntry(database: ApothekeDatabase, entryId: string): void {
  const entry = database.prepare(`
    SELECT title, description AS content, folder_id AS folderId, url, original_filename AS originalFilename
    FROM integration_entries WHERE id = ?
  `).get(entryId) as {
    title: string;
    content: string;
    folderId: string;
    url: string | null;
    originalFilename: string | null;
  } | undefined;
  if (!entry) return;

  const folderNames: string[] = [];
  let folderId: string | null = entry.folderId;
  let spaceId: string | null = null;
  const folderStatement = database.prepare('SELECT name, parent_id AS parentId, space_id AS spaceId FROM integration_folders WHERE id = ?');
  while (folderId) {
    const folder = folderStatement.get(folderId) as { name: string; parentId: string | null; spaceId: string } | undefined;
    if (!folder) break;
    spaceId = folder.spaceId;
    folderNames.unshift(folder.name);
    folderId = folder.parentId;
  }
  if (spaceId) {
    const space = database.prepare('SELECT name FROM integration_spaces WHERE id = ?').get(spaceId) as { name: string } | undefined;
    if (space) folderNames.unshift(space.name);
  }

  replaceIndexRow(database, 'integration', entryId, {
    title: entry.title,
    content: entry.content,
    category: folderNames.join(' / '),
    tags: [entry.url, entry.originalFilename].filter(Boolean).join(' '),
    version: null,
  });
}

export function removeFromIndex(
  database: ApothekeDatabase,
  entityType: 'document' | 'note' | 'integration',
  entityId: string,
): void {
  database
    .prepare('DELETE FROM search_index WHERE entity_type = ? AND entity_id = ?')
    .run(entityType, entityId);
}
