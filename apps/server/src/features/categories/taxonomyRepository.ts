import { randomUUID } from 'node:crypto';
import type { PeanutDatabase } from '../../database/database.js';
import { reindexCategory, reindexDocument, reindexNote, removeFromIndex } from '../search/indexer.js';
import { AppError } from '../../middleware/errors.js';

interface IdRow {
  id: string;
}

interface TaxonomyRow {
  id: string;
  name: string;
  color?: string;
}

export function ensureCategory(
  database: PeanutDatabase,
  rawName: string | null,
): string | null {
  const name = rawName?.trim();
  if (!name) return null;

  database
    .prepare(
      `INSERT INTO categories (id, name, color, created_at)
       VALUES (?, ?, '#64748b', ?)
       ON CONFLICT(name) DO NOTHING`,
    )
    .run(randomUUID(), name, new Date().toISOString());

  const row = database
    .prepare('SELECT id FROM categories WHERE name = ? COLLATE NOCASE')
    .get(name) as IdRow | undefined;

  if (!row) throw new Error(`Category could not be resolved: ${name}`);
  reindexCategory(database, row.id);
  return row.id;
}

export function ensureTags(database: PeanutDatabase, names: readonly string[]): string[] {
  const uniqueNames = [...new Set(names.map((name) => name.trim()).filter(Boolean))];
  const ids: string[] = [];

  for (const name of uniqueNames) {
    database
      .prepare(
        `INSERT INTO tags (id, name, created_at)
         VALUES (?, ?, ?)
         ON CONFLICT(name) DO NOTHING`,
      )
      .run(randomUUID(), name, new Date().toISOString());

    const row = database
      .prepare('SELECT id FROM tags WHERE name = ? COLLATE NOCASE')
      .get(name) as IdRow | undefined;
    if (row) ids.push(row.id);
  }

  return ids;
}

export function listCategories(database: PeanutDatabase): TaxonomyRow[] {
  return database
    .prepare('SELECT id, name, color FROM categories ORDER BY name COLLATE NOCASE')
    .all() as TaxonomyRow[];
}

export function listTags(database: PeanutDatabase): TaxonomyRow[] {
  return database
    .prepare('SELECT id, name FROM tags ORDER BY name COLLATE NOCASE')
    .all() as TaxonomyRow[];
}

export function deleteCategory(database: PeanutDatabase, categoryId: string): void {
  const category = database.prepare('SELECT id FROM categories WHERE id = ?').get(categoryId) as IdRow | undefined;
  if (!category) throw new AppError(404, 'Category not found.', 'CATEGORY_NOT_FOUND');

  const documentIds = database.prepare('SELECT id FROM documents WHERE category_id = ?').all(categoryId) as IdRow[];
  const noteIds = database.prepare('SELECT id FROM notes WHERE category_id = ?').all(categoryId) as IdRow[];
  database.transaction(() => {
    database.prepare('DELETE FROM categories WHERE id = ?').run(categoryId);
    removeFromIndex(database, 'category', categoryId);
    for (const row of documentIds) reindexDocument(database, row.id);
    for (const row of noteIds) reindexNote(database, row.id);
  })();
}
