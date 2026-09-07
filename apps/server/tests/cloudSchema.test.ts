import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';

const migrationPath = path.resolve(process.cwd(), '../cloud/migrations/0001_identity_and_workspace.sql');

function createCloudDatabase(): Database.Database {
  const database = new Database(':memory:');
  database.pragma('foreign_keys = ON');
  database.exec(fs.readFileSync(migrationPath, 'utf8'));
  return database;
}

function addUser(database: Database.Database, id: string, email: string): void {
  const now = new Date().toISOString();
  database.prepare(`INSERT INTO "user" (id, name, email, emailVerified, createdAt, updatedAt)
    VALUES (?, ?, ?, 1, ?, ?)`).run(id, id, email, now, now);
}

describe('cloud D1 schema', () => {
  it('requires an owner for private workspace records', () => {
    const database = createCloudDatabase();
    expect(() => database.prepare(`INSERT INTO notes (id, title, created_at, updated_at)
      VALUES ('note-1', 'Private note', 'now', 'now')`).run()).toThrow();
    database.close();
  });

  it('prevents relationships from crossing user boundaries', () => {
    const database = createCloudDatabase();
    addUser(database, 'user-a', 'a@example.com');
    addUser(database, 'user-b', 'b@example.com');
    database.prepare(`INSERT INTO categories (id, owner_id, name, created_at, updated_at)
      VALUES ('category-a', 'user-a', 'Private', 'now', 'now')`).run();

    expect(() => database.prepare(`INSERT INTO documents
      (id, owner_id, title, category_id, created_at, updated_at)
      VALUES ('document-b', 'user-b', 'Wrong owner', 'category-a', 'now', 'now')`).run()).toThrow();
    database.close();
  });

  it('cascades a deleted account without defining a cloud password vault', () => {
    const database = createCloudDatabase();
    addUser(database, 'user-a', 'a@example.com');
    database.prepare(`INSERT INTO notes (id, owner_id, title, created_at, updated_at)
      VALUES ('note-a', 'user-a', 'Private note', 'now', 'now')`).run();
    database.prepare(`DELETE FROM "user" WHERE id = 'user-a'`).run();

    expect(database.prepare(`SELECT id FROM notes WHERE owner_id = 'user-a'`).all()).toHaveLength(0);
    expect(database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'vault%'").all()).toHaveLength(0);
    database.close();
  });
});
