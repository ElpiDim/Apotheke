import { randomUUID } from 'node:crypto';
import type { DocumentRecord, ImportDocumentFields } from '@apotheke/contracts';
import type { ApothekeDatabase } from '../../database/database.js';
import { ensureCategory, ensureTags } from '../categories/taxonomyRepository.js';
import { reindexDocument } from '../search/indexer.js';

interface DocumentRow {
  id: string;
  title: string;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  createdAt: string;
  updatedAt: string;
  versionId: string;
  versionLabel: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  importedAt: string;
}

interface TagRow {
  id: string;
  name: string;
}

export interface StoredImport {
  storedFilename: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  extractedText: string;
}

const selectDocuments = `
  SELECT d.id,
         d.title,
         d.category_id AS categoryId,
         c.name AS categoryName,
         c.color AS categoryColor,
         d.created_at AS createdAt,
         d.updated_at AS updatedAt,
         v.id AS versionId,
         v.version_label AS versionLabel,
         v.original_filename AS originalFilename,
         v.mime_type AS mimeType,
         v.file_size AS fileSize,
         v.imported_at AS importedAt
  FROM documents d
  JOIN document_versions v ON v.document_id = d.id AND v.is_current = 1
  LEFT JOIN categories c ON c.id = d.category_id
`;

function hydrateDocument(database: ApothekeDatabase, row: DocumentRow): DocumentRecord {
  const tags = database
    .prepare(
      `SELECT t.id, t.name
       FROM tags t
       JOIN document_tags dt ON dt.tag_id = t.id
       WHERE dt.document_id = ?
       ORDER BY t.name COLLATE NOCASE`,
    )
    .all(row.id) as TagRow[];

  return {
    id: row.id,
    title: row.title,
    category: row.categoryId && row.categoryName && row.categoryColor
      ? { id: row.categoryId, name: row.categoryName, color: row.categoryColor }
      : null,
    tags,
    currentVersion: {
      id: row.versionId,
      label: row.versionLabel,
      originalFilename: row.originalFilename,
      mimeType: row.mimeType,
      fileSize: row.fileSize,
      importedAt: row.importedAt,
    },
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function listDocuments(database: ApothekeDatabase): DocumentRecord[] {
  const rows = database
    .prepare(`${selectDocuments} ORDER BY d.updated_at DESC`)
    .all() as DocumentRow[];
  return rows.map((row) => hydrateDocument(database, row));
}

export function createDocument(
  database: ApothekeDatabase,
  fields: ImportDocumentFields,
  storedImport: StoredImport,
): DocumentRecord {
  const documentId = randomUUID();
  const versionId = randomUUID();
  const now = new Date().toISOString();

  database.transaction(() => {
    const categoryId = ensureCategory(database, fields.category);
    const tagIds = ensureTags(database, fields.tags);

    database
      .prepare(
        `INSERT INTO documents (id, title, category_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(documentId, fields.title, categoryId, now, now);

    database
      .prepare(
        `INSERT INTO document_versions (
           id, document_id, version_label, original_filename, stored_filename,
           mime_type, file_size, extracted_text, imported_at, is_current
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      )
      .run(
        versionId,
        documentId,
        fields.version,
        storedImport.originalFilename,
        storedImport.storedFilename,
        storedImport.mimeType,
        storedImport.fileSize,
        storedImport.extractedText,
        now,
      );

    const insertTag = database.prepare(
      'INSERT INTO document_tags (document_id, tag_id) VALUES (?, ?)',
    );
    for (const tagId of tagIds) insertTag.run(documentId, tagId);
    reindexDocument(database, documentId);
  })();

  const row = database
    .prepare(`${selectDocuments} WHERE d.id = ?`)
    .get(documentId) as DocumentRow;
  return hydrateDocument(database, row);
}
