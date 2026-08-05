import { randomUUID } from 'node:crypto';
import type { CreateNoteInput, Note, UpdateNoteInput } from '@apotheke/contracts';
import type { ApothekeDatabase } from '../../database/database.js';
import { AppError } from '../../middleware/errors.js';
import { ensureCategory, ensureTags } from '../categories/taxonomyRepository.js';
import { reindexNote, removeFromIndex } from '../search/indexer.js';

interface NoteRow {
  id: string;
  title: string;
  content: string;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TagRow {
  id: string;
  name: string;
}

function hydrateNote(database: ApothekeDatabase, row: NoteRow): Note {
  const tags = database
    .prepare(
      `SELECT t.id, t.name
       FROM tags t
       JOIN note_tags nt ON nt.tag_id = t.id
       WHERE nt.note_id = ?
       ORDER BY t.name COLLATE NOCASE`,
    )
    .all(row.id) as TagRow[];

  return {
    id: row.id,
    title: row.title,
    content: row.content,
    category: row.categoryId && row.categoryName && row.categoryColor
      ? { id: row.categoryId, name: row.categoryName, color: row.categoryColor }
      : null,
    tags,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const selectNotes = `
  SELECT n.id,
         n.title,
         n.content,
         n.category_id AS categoryId,
         c.name AS categoryName,
         c.color AS categoryColor,
         n.created_at AS createdAt,
         n.updated_at AS updatedAt
  FROM notes n
  LEFT JOIN categories c ON c.id = n.category_id
`;

export function listNotes(database: ApothekeDatabase): Note[] {
  const rows = database
    .prepare(`${selectNotes} ORDER BY n.updated_at DESC`)
    .all() as NoteRow[];
  return rows.map((row) => hydrateNote(database, row));
}

export function getNote(database: ApothekeDatabase, id: string): Note {
  const row = database
    .prepare(`${selectNotes} WHERE n.id = ?`)
    .get(id) as NoteRow | undefined;
  if (!row) throw new AppError(404, 'Note not found.', 'NOTE_NOT_FOUND');
  return hydrateNote(database, row);
}

function replaceNoteTags(database: ApothekeDatabase, noteId: string, names: readonly string[]): void {
  const tagIds = ensureTags(database, names);
  database.prepare('DELETE FROM note_tags WHERE note_id = ?').run(noteId);
  const insert = database.prepare('INSERT INTO note_tags (note_id, tag_id) VALUES (?, ?)');
  for (const tagId of tagIds) insert.run(noteId, tagId);
}

export function createNote(database: ApothekeDatabase, input: CreateNoteInput): Note {
  const id = randomUUID();
  const now = new Date().toISOString();

  database.transaction(() => {
    const categoryId = ensureCategory(database, input.category);
    database
      .prepare(
        `INSERT INTO notes (id, title, content, category_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(id, input.title, input.content, categoryId, now, now);
    replaceNoteTags(database, id, input.tags);
    reindexNote(database, id);
  })();

  return getNote(database, id);
}

export function updateNote(database: ApothekeDatabase, id: string, input: UpdateNoteInput): Note {
  const current = getNote(database, id);
  const next = {
    title: input.title ?? current.title,
    content: input.content ?? current.content,
    category: input.category === undefined ? current.category?.name ?? null : input.category,
    tags: input.tags ?? current.tags.map((tag) => tag.name),
  };

  database.transaction(() => {
    const categoryId = ensureCategory(database, next.category);
    database
      .prepare(
        `UPDATE notes
         SET title = ?, content = ?, category_id = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(next.title, next.content, categoryId, new Date().toISOString(), id);
    replaceNoteTags(database, id, next.tags);
    reindexNote(database, id);
  })();

  return getNote(database, id);
}

export function deleteNote(database: ApothekeDatabase, id: string): void {
  getNote(database, id);
  database.transaction(() => {
    removeFromIndex(database, 'note', id);
    database.prepare('DELETE FROM notes WHERE id = ?').run(id);
  })();
}
