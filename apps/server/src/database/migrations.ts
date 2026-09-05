export interface Migration {
  id: number;
  name: string;
  sql: string;
}

export const migrations: readonly Migration[] = [
  {
    id: 1,
    name: 'initial_schema',
    sql: `
      CREATE TABLE categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL COLLATE NOCASE UNIQUE,
        color TEXT NOT NULL DEFAULT '#64748b',
        created_at TEXT NOT NULL
      );

      CREATE TABLE tags (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL COLLATE NOCASE UNIQUE,
        created_at TEXT NOT NULL
      );

      CREATE TABLE documents (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE document_versions (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        version_label TEXT NOT NULL,
        original_filename TEXT NOT NULL,
        stored_filename TEXT NOT NULL UNIQUE,
        mime_type TEXT NOT NULL,
        file_size INTEGER NOT NULL CHECK (file_size >= 0),
        extracted_text TEXT NOT NULL,
        imported_at TEXT NOT NULL,
        is_current INTEGER NOT NULL DEFAULT 1 CHECK (is_current IN (0, 1)),
        UNIQUE(document_id, version_label)
      );

      CREATE UNIQUE INDEX one_current_version_per_document
        ON document_versions(document_id)
        WHERE is_current = 1;

      CREATE TABLE document_tags (
        document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY (document_id, tag_id)
      );

      CREATE TABLE notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE note_tags (
        note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
        tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY (note_id, tag_id)
      );

      CREATE VIRTUAL TABLE search_index USING fts5(
        entity_type UNINDEXED,
        entity_id UNINDEXED,
        title,
        content,
        metadata,
        tokenize = 'unicode61 remove_diacritics 2'
      );

      CREATE INDEX documents_updated_at_idx ON documents(updated_at DESC);
      CREATE INDEX notes_updated_at_idx ON notes(updated_at DESC);
      CREATE INDEX document_versions_document_idx ON document_versions(document_id);
    `,
  },
  {
    id: 2,
    name: 'integration_workspace',
    sql: `
      CREATE TABLE integration_folders (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        parent_id TEXT REFERENCES integration_folders(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE integration_entries (
        id TEXT PRIMARY KEY,
        folder_id TEXT NOT NULL REFERENCES integration_folders(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        url TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX integration_folders_parent_idx ON integration_folders(parent_id);
      CREATE INDEX integration_entries_folder_idx ON integration_entries(folder_id, updated_at DESC);
    `,
  },
  {
    id: 3,
    name: 'integration_pdf_attachments',
    sql: `
      ALTER TABLE integration_entries ADD COLUMN original_filename TEXT;
      ALTER TABLE integration_entries ADD COLUMN stored_filename TEXT;
      ALTER TABLE integration_entries ADD COLUMN mime_type TEXT;
      ALTER TABLE integration_entries ADD COLUMN file_size INTEGER CHECK (file_size IS NULL OR file_size >= 0);
      CREATE UNIQUE INDEX integration_entries_stored_file_idx
        ON integration_entries(stored_filename)
        WHERE stored_filename IS NOT NULL;
    `,
  },
  {
    id: 4,
    name: 'index_existing_integrations',
    sql: `
      INSERT INTO search_index (entity_type, entity_id, title, content, metadata)
      SELECT 'integration', e.id, e.title, e.description,
             TRIM(COALESCE(e.url, '') || ' ' || COALESCE(e.original_filename, '') || ' ' || f.name)
      FROM integration_entries e
      JOIN integration_folders f ON f.id = e.folder_id;
    `,
  },
  {
    id: 5,
    name: 'tasks_and_deadlines',
    sql: `
      CREATE TABLE tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        due_at TEXT,
        completed_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX tasks_due_at_idx ON tasks(due_at);
      CREATE INDEX tasks_completed_at_idx ON tasks(completed_at, updated_at DESC);
    `,
  },
  {
    id: 6,
    name: 'document_content_hashes',
    sql: `
      ALTER TABLE document_versions ADD COLUMN content_hash TEXT;
      CREATE INDEX document_versions_content_hash_idx
        ON document_versions(content_hash)
        WHERE content_hash IS NOT NULL;
    `,
  },
  {
    id: 7,
    name: 'custom_workspace_sections',
    sql: `
      CREATE TABLE integration_spaces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL COLLATE NOCASE UNIQUE,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      INSERT INTO integration_spaces (id, name, created_at, updated_at)
      VALUES ('00000000-0000-4000-8000-000000000001', 'Integrations', datetime('now'), datetime('now'));

      ALTER TABLE integration_folders
        ADD COLUMN space_id TEXT NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';

      CREATE INDEX integration_folders_space_idx
        ON integration_folders(space_id, parent_id, name);
    `,
  },
  {
    id: 8,
    name: 'encrypted_password_vault',
    sql: `
      CREATE TABLE vault_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        salt TEXT NOT NULL,
        verifier_iv TEXT NOT NULL,
        verifier_ciphertext TEXT NOT NULL,
        verifier_tag TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE vault_entries (
        id TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        payload_iv TEXT NOT NULL,
        payload_ciphertext TEXT NOT NULL,
        payload_tag TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX vault_entries_updated_idx ON vault_entries(updated_at DESC);
    `,
  },
  {
    id: 9,
    name: 'local_user_profile',
    sql: `
      CREATE TABLE user_profile (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        name TEXT NOT NULL DEFAULT '',
        email TEXT NOT NULL DEFAULT '',
        role TEXT NOT NULL DEFAULT '',
        bio TEXT NOT NULL DEFAULT '',
        updated_at TEXT NOT NULL
      );
      INSERT INTO user_profile (id, name, email, role, bio, updated_at)
      VALUES (1, '', '', '', '', datetime('now'));
    `,
  },
  {
    id: 10,
    name: 'local_authentication',
    sql: `
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL COLLATE NOCASE UNIQUE,
        password_salt TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX users_email_idx ON users(email COLLATE NOCASE);
    `,
  },
];
