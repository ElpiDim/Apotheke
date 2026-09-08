import { createNoteSchema, createTaskSchema, updateNoteSchema, updateTaskSchema, updateUserProfileSchema, type Category, type Note, type Tag, type Task, type UserProfile } from '@peanut/contracts';

interface CategoryRow { id: string; name: string; color: string }
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
interface NoteTagRow { noteId: string; id: string; name: string }

export class WorkspaceError extends Error {
  constructor(public readonly status: number, message: string, public readonly code: string) {
    super(message);
  }
}

interface ProfileRow { name: string; email: string; role: string | null; bio: string | null; updatedAt: string }

export async function getUserProfile(database: D1Database, ownerId: string): Promise<UserProfile> {
  const row = await database.prepare(`
    SELECT u.name, u.email, p.role, p.bio, COALESCE(p.updated_at, u.updatedAt) AS updatedAt
    FROM "user" u LEFT JOIN profiles p ON p.owner_id = u.id WHERE u.id = ?
  `).bind(ownerId).first<ProfileRow>();
  if (!row) throw new WorkspaceError(404, 'Profile not found.', 'PROFILE_NOT_FOUND');
  return { name: row.name, email: row.email, role: row.role ?? '', bio: row.bio ?? '', updatedAt: row.updatedAt };
}

export async function updateUserProfile(database: D1Database, ownerId: string, body: unknown): Promise<UserProfile> {
  const input = updateUserProfileSchema.parse(body);
  const now = new Date().toISOString();
  await database.batch([
    database.prepare('UPDATE "user" SET name = ?, updatedAt = ? WHERE id = ?').bind(input.name, now, ownerId),
    database.prepare(`INSERT INTO profiles (owner_id, role, bio, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(owner_id) DO UPDATE SET role = excluded.role, bio = excluded.bio, updated_at = excluded.updated_at`)
      .bind(ownerId, input.role, input.bio, now, now),
  ]);
  return getUserProfile(database, ownerId);
}

export async function listCategories(database: D1Database, ownerId: string): Promise<Category[]> {
  const result = await database.prepare(
    'SELECT id, name, color FROM categories WHERE owner_id = ? ORDER BY name COLLATE NOCASE',
  ).bind(ownerId).all<CategoryRow>();
  return result.results;
}

export async function listTags(database: D1Database, ownerId: string): Promise<Tag[]> {
  const result = await database.prepare('SELECT id, name FROM tags WHERE owner_id = ? ORDER BY name COLLATE NOCASE').bind(ownerId).all<Tag>();
  return result.results;
}

export async function deleteCategory(database: D1Database, ownerId: string, id: string): Promise<void> {
  const result = await database.prepare('DELETE FROM categories WHERE id = ? AND owner_id = ?').bind(id, ownerId).run();
  if (!result.meta.changes) throw new WorkspaceError(404, 'Category not found.', 'CATEGORY_NOT_FOUND');
}

export async function ensureCategory(database: D1Database, ownerId: string, name: string | null): Promise<string | null> {
  const normalized = name?.trim();
  if (!normalized) return null;
  const existing = await database.prepare(
    'SELECT id FROM categories WHERE owner_id = ? AND name = ? COLLATE NOCASE',
  ).bind(ownerId, normalized).first<{ id: string }>();
  if (existing) return existing.id;
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await database.prepare(
    'INSERT INTO categories (id, owner_id, name, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).bind(id, ownerId, normalized, '#64748b', now, now).run();
  return id;
}

export async function ensureTags(database: D1Database, ownerId: string, names: readonly string[]): Promise<string[]> {
  const ids: string[] = [];
  for (const rawName of [...new Set(names.map((name) => name.trim()).filter(Boolean))]) {
    const existing = await database.prepare(
      'SELECT id FROM tags WHERE owner_id = ? AND name = ? COLLATE NOCASE',
    ).bind(ownerId, rawName).first<{ id: string }>();
    if (existing) {
      ids.push(existing.id);
      continue;
    }
    const id = crypto.randomUUID();
    await database.prepare(
      'INSERT INTO tags (id, owner_id, name, created_at) VALUES (?, ?, ?, ?)',
    ).bind(id, ownerId, rawName, new Date().toISOString()).run();
    ids.push(id);
  }
  return ids;
}

const selectNotes = `
  SELECT n.id, n.title, n.content, n.category_id AS categoryId,
         c.name AS categoryName, c.color AS categoryColor,
         n.created_at AS createdAt, n.updated_at AS updatedAt
  FROM notes n
  LEFT JOIN categories c ON c.id = n.category_id AND c.owner_id = n.owner_id
  WHERE n.owner_id = ?`;

async function hydrateNotes(database: D1Database, ownerId: string, rows: NoteRow[]): Promise<Note[]> {
  if (rows.length === 0) return [];
  const tagResult = await database.prepare(`
    SELECT nt.note_id AS noteId, t.id, t.name
    FROM note_tags nt
    JOIN tags t ON t.id = nt.tag_id AND t.owner_id = nt.owner_id
    WHERE nt.owner_id = ?
    ORDER BY t.name COLLATE NOCASE
  `).bind(ownerId).all<NoteTagRow>();
  const tagsByNote = new Map<string, Tag[]>();
  for (const row of tagResult.results) {
    const tags = tagsByNote.get(row.noteId) ?? [];
    tags.push({ id: row.id, name: row.name });
    tagsByNote.set(row.noteId, tags);
  }
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    content: row.content,
    category: row.categoryId && row.categoryName && row.categoryColor
      ? { id: row.categoryId, name: row.categoryName, color: row.categoryColor }
      : null,
    tags: tagsByNote.get(row.id) ?? [],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

export async function listNotes(database: D1Database, ownerId: string): Promise<Note[]> {
  const result = await database.prepare(`${selectNotes} ORDER BY n.updated_at DESC`).bind(ownerId).all<NoteRow>();
  return hydrateNotes(database, ownerId, result.results);
}

export async function getNote(database: D1Database, ownerId: string, id: string): Promise<Note> {
  const row = await database.prepare(`${selectNotes} AND n.id = ?`).bind(ownerId, id).first<NoteRow>();
  if (!row) throw new WorkspaceError(404, 'Note not found.', 'NOTE_NOT_FOUND');
  return (await hydrateNotes(database, ownerId, [row]))[0]!;
}

export async function createNote(database: D1Database, ownerId: string, body: unknown): Promise<Note> {
  const input = createNoteSchema.parse(body);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const categoryId = await ensureCategory(database, ownerId, input.category);
  const tagIds = await ensureTags(database, ownerId, input.tags);
  await database.batch([
    database.prepare('INSERT INTO notes (id, owner_id, title, content, category_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(id, ownerId, input.title, input.content, categoryId, now, now),
    ...tagIds.map((tagId) => database.prepare('INSERT INTO note_tags (owner_id, note_id, tag_id) VALUES (?, ?, ?)').bind(ownerId, id, tagId)),
  ]);
  return getNote(database, ownerId, id);
}

export async function updateNote(database: D1Database, ownerId: string, id: string, body: unknown): Promise<Note> {
  const input = updateNoteSchema.parse(body);
  const current = await getNote(database, ownerId, id);
  const next = {
    title: input.title ?? current.title,
    content: input.content ?? current.content,
    category: input.category === undefined ? current.category?.name ?? null : input.category,
    tags: input.tags ?? current.tags.map((tag) => tag.name),
  };
  const categoryId = await ensureCategory(database, ownerId, next.category);
  const tagIds = await ensureTags(database, ownerId, next.tags);
  await database.batch([
    database.prepare('UPDATE notes SET title = ?, content = ?, category_id = ?, updated_at = ? WHERE id = ? AND owner_id = ?').bind(next.title, next.content, categoryId, new Date().toISOString(), id, ownerId),
    database.prepare('DELETE FROM note_tags WHERE note_id = ? AND owner_id = ?').bind(id, ownerId),
    ...tagIds.map((tagId) => database.prepare('INSERT INTO note_tags (owner_id, note_id, tag_id) VALUES (?, ?, ?)').bind(ownerId, id, tagId)),
  ]);
  return getNote(database, ownerId, id);
}

export async function deleteNote(database: D1Database, ownerId: string, id: string): Promise<void> {
  const result = await database.prepare('DELETE FROM notes WHERE id = ? AND owner_id = ?').bind(id, ownerId).run();
  if (!result.meta.changes) throw new WorkspaceError(404, 'Note not found.', 'NOTE_NOT_FOUND');
}

interface TaskRow {
  id: string;
  title: string;
  description: string;
  dueAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const selectTasks = `SELECT id, title, description, due_at AS dueAt, completed_at AS completedAt,
  created_at AS createdAt, updated_at AS updatedAt FROM tasks WHERE owner_id = ?`;

export async function listTasks(database: D1Database, ownerId: string): Promise<Task[]> {
  const result = await database.prepare(`${selectTasks} ORDER BY completed_at IS NOT NULL, due_at IS NULL, due_at, created_at DESC`).bind(ownerId).all<TaskRow>();
  return result.results;
}

async function getTask(database: D1Database, ownerId: string, id: string): Promise<Task> {
  const task = await database.prepare(`${selectTasks} AND id = ?`).bind(ownerId, id).first<TaskRow>();
  if (!task) throw new WorkspaceError(404, 'Task not found.', 'TASK_NOT_FOUND');
  return task;
}

export async function createTask(database: D1Database, ownerId: string, body: unknown): Promise<Task> {
  const input = createTaskSchema.parse(body);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await database.prepare('INSERT INTO tasks (id, owner_id, title, description, due_at, completed_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NULL, ?, ?)').bind(id, ownerId, input.title, input.description, input.dueAt, now, now).run();
  return getTask(database, ownerId, id);
}

export async function updateTask(database: D1Database, ownerId: string, id: string, body: unknown): Promise<Task> {
  const input = updateTaskSchema.parse(body);
  const current = await getTask(database, ownerId, id);
  const completedAt = input.completed === undefined ? current.completedAt : input.completed ? new Date().toISOString() : null;
  await database.prepare('UPDATE tasks SET title = ?, description = ?, due_at = ?, completed_at = ?, updated_at = ? WHERE id = ? AND owner_id = ?').bind(
    input.title ?? current.title,
    input.description ?? current.description,
    input.dueAt === undefined ? current.dueAt : input.dueAt,
    completedAt,
    new Date().toISOString(),
    id,
    ownerId,
  ).run();
  return getTask(database, ownerId, id);
}

export async function deleteTask(database: D1Database, ownerId: string, id: string): Promise<void> {
  const result = await database.prepare('DELETE FROM tasks WHERE id = ? AND owner_id = ?').bind(id, ownerId).run();
  if (!result.meta.changes) throw new WorkspaceError(404, 'Task not found.', 'TASK_NOT_FOUND');
}
