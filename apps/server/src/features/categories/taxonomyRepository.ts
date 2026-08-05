import { randomUUID } from 'node:crypto';
import type { ApothekeDatabase } from '../../database/database.js';

interface IdRow {
  id: string;
}

interface TaxonomyRow {
  id: string;
  name: string;
  color?: string;
}

export function ensureCategory(
  database: ApothekeDatabase,
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
  return row.id;
}

export function ensureTags(database: ApothekeDatabase, names: readonly string[]): string[] {
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

export function listCategories(database: ApothekeDatabase): TaxonomyRow[] {
  return database
    .prepare('SELECT id, name, color FROM categories ORDER BY name COLLATE NOCASE')
    .all() as TaxonomyRow[];
}

export function listTags(database: ApothekeDatabase): TaxonomyRow[] {
  return database
    .prepare('SELECT id, name FROM tags ORDER BY name COLLATE NOCASE')
    .all() as TaxonomyRow[];
}
