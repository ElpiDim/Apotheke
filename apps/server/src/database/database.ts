import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { migrations } from './migrations.js';

export type ApothekeDatabase = Database.Database;

export function openDatabase(databasePath: string): ApothekeDatabase {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });

  const database = new Database(databasePath);
  database.pragma('foreign_keys = ON');
  database.pragma('journal_mode = WAL');
  database.pragma('busy_timeout = 5000');

  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const hasMigration = database.prepare(
    'SELECT 1 FROM schema_migrations WHERE id = ?',
  );

  for (const migration of migrations) {
    if (hasMigration.get(migration.id)) continue;

    database.transaction(() => {
      database.exec(migration.sql);
      database
        .prepare(
          'INSERT INTO schema_migrations (id, name, applied_at) VALUES (?, ?, ?)',
        )
        .run(migration.id, migration.name, new Date().toISOString());
    })();
  }

  return database;
}
