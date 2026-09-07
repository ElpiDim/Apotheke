PRAGMA foreign_keys = ON;

-- Better Auth core tables. These identities own every cloud workspace record.
CREATE TABLE "user" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  emailVerified INTEGER NOT NULL DEFAULT 0,
  image TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE session (
  id TEXT PRIMARY KEY,
  expiresAt TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  ipAddress TEXT,
  userAgent TEXT,
  userId TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);
CREATE INDEX session_user_idx ON session(userId);
CREATE INDEX session_expiry_idx ON session(expiresAt);

CREATE TABLE account (
  id TEXT PRIMARY KEY,
  accountId TEXT NOT NULL,
  providerId TEXT NOT NULL,
  userId TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  accessToken TEXT,
  refreshToken TEXT,
  idToken TEXT,
  accessTokenExpiresAt TEXT,
  refreshTokenExpiresAt TEXT,
  scope TEXT,
  password TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE INDEX account_user_idx ON account(userId);
CREATE UNIQUE INDEX account_provider_identity_idx ON account(providerId, accountId);

CREATE TABLE verification (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expiresAt TEXT NOT NULL,
  createdAt TEXT,
  updatedAt TEXT
);
CREATE INDEX verification_identifier_idx ON verification(identifier);

CREATE TABLE profiles (
  owner_id TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  name TEXT NOT NULL COLLATE NOCASE,
  color TEXT NOT NULL DEFAULT '#64748b',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(owner_id, name),
  UNIQUE(id, owner_id)
);
CREATE INDEX categories_owner_idx ON categories(owner_id, name);

CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  name TEXT NOT NULL COLLATE NOCASE,
  created_at TEXT NOT NULL,
  UNIQUE(owner_id, name),
  UNIQUE(id, owner_id)
);
CREATE INDEX tags_owner_idx ON tags(owner_id, name);

CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(id, owner_id),
  FOREIGN KEY(category_id, owner_id) REFERENCES categories(id, owner_id) ON DELETE SET NULL
);
CREATE INDEX documents_owner_updated_idx ON documents(owner_id, updated_at DESC);

CREATE TABLE document_versions (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL,
  version_label TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  storage_key TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL CHECK(file_size >= 0),
  content_hash TEXT,
  extracted_text TEXT NOT NULL DEFAULT '',
  imported_at TEXT NOT NULL,
  is_current INTEGER NOT NULL DEFAULT 1 CHECK(is_current IN (0, 1)),
  UNIQUE(document_id, version_label),
  UNIQUE(id, owner_id),
  FOREIGN KEY(document_id, owner_id) REFERENCES documents(id, owner_id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX document_current_version_idx
  ON document_versions(document_id) WHERE is_current = 1;
CREATE INDEX document_versions_owner_idx ON document_versions(owner_id, document_id);
CREATE INDEX document_versions_hash_idx ON document_versions(owner_id, content_hash);

CREATE TABLE document_tags (
  owner_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY(owner_id, document_id, tag_id),
  FOREIGN KEY(document_id, owner_id) REFERENCES documents(id, owner_id) ON DELETE CASCADE,
  FOREIGN KEY(tag_id, owner_id) REFERENCES tags(id, owner_id) ON DELETE CASCADE
);

CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  category_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(id, owner_id),
  FOREIGN KEY(category_id, owner_id) REFERENCES categories(id, owner_id) ON DELETE SET NULL
);
CREATE INDEX notes_owner_updated_idx ON notes(owner_id, updated_at DESC);

CREATE TABLE note_tags (
  owner_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  note_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY(owner_id, note_id, tag_id),
  FOREIGN KEY(note_id, owner_id) REFERENCES notes(id, owner_id) ON DELETE CASCADE,
  FOREIGN KEY(tag_id, owner_id) REFERENCES tags(id, owner_id) ON DELETE CASCADE
);

CREATE TABLE integration_spaces (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  name TEXT NOT NULL COLLATE NOCASE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(owner_id, name),
  UNIQUE(id, owner_id)
);
CREATE INDEX integration_spaces_owner_idx ON integration_spaces(owner_id, name);

CREATE TABLE integration_folders (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  space_id TEXT NOT NULL,
  parent_id TEXT,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(id, owner_id),
  FOREIGN KEY(space_id, owner_id) REFERENCES integration_spaces(id, owner_id) ON DELETE CASCADE,
  FOREIGN KEY(parent_id, owner_id) REFERENCES integration_folders(id, owner_id) ON DELETE CASCADE
);
CREATE INDEX integration_folders_owner_space_idx ON integration_folders(owner_id, space_id, parent_id, name);

CREATE TABLE integration_entries (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  folder_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  url TEXT,
  original_filename TEXT,
  storage_key TEXT UNIQUE,
  mime_type TEXT,
  file_size INTEGER CHECK(file_size IS NULL OR file_size >= 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(id, owner_id),
  FOREIGN KEY(folder_id, owner_id) REFERENCES integration_folders(id, owner_id) ON DELETE CASCADE
);
CREATE INDEX integration_entries_owner_folder_idx ON integration_entries(owner_id, folder_id, updated_at DESC);

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  due_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(id, owner_id)
);
CREATE INDEX tasks_owner_due_idx ON tasks(owner_id, due_at);
CREATE INDEX tasks_owner_completed_idx ON tasks(owner_id, completed_at, updated_at DESC);

-- The password vault intentionally remains device-only and is not represented here.
