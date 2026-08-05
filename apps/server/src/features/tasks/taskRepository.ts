import { randomUUID } from 'node:crypto';
import type { CreateTaskInput, Task, UpdateTaskInput } from '@apotheke/contracts';
import type { ApothekeDatabase } from '../../database/database.js';
import { AppError } from '../../middleware/errors.js';

interface TaskRow {
  id: string;
  title: string;
  description: string;
  dueAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const selectTasks = `
  SELECT id, title, description, due_at AS dueAt, completed_at AS completedAt,
         created_at AS createdAt, updated_at AS updatedAt
  FROM tasks
`;

export function listTasks(database: ApothekeDatabase): Task[] {
  return database.prepare(`${selectTasks}
    ORDER BY completed_at IS NOT NULL, due_at IS NULL, due_at, created_at DESC
  `).all() as TaskRow[];
}

export function getTask(database: ApothekeDatabase, id: string): Task {
  const task = database.prepare(`${selectTasks} WHERE id = ?`).get(id) as TaskRow | undefined;
  if (!task) throw new AppError(404, 'Task not found.', 'TASK_NOT_FOUND');
  return task;
}

export function createTask(database: ApothekeDatabase, input: CreateTaskInput): Task {
  const id = randomUUID();
  const now = new Date().toISOString();
  database.prepare(`
    INSERT INTO tasks (id, title, description, due_at, completed_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, NULL, ?, ?)
  `).run(id, input.title, input.description, input.dueAt, now, now);
  return getTask(database, id);
}

export function updateTask(database: ApothekeDatabase, id: string, input: UpdateTaskInput): Task {
  const current = getTask(database, id);
  const completedAt = input.completed === undefined
    ? current.completedAt
    : input.completed ? new Date().toISOString() : null;
  database.prepare(`
    UPDATE tasks SET title = ?, description = ?, due_at = ?, completed_at = ?, updated_at = ?
    WHERE id = ?
  `).run(
    input.title ?? current.title,
    input.description ?? current.description,
    input.dueAt === undefined ? current.dueAt : input.dueAt,
    completedAt,
    new Date().toISOString(),
    id,
  );
  return getTask(database, id);
}

export function deleteTask(database: ApothekeDatabase, id: string): void {
  const result = database.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  if (result.changes === 0) throw new AppError(404, 'Task not found.', 'TASK_NOT_FOUND');
}
