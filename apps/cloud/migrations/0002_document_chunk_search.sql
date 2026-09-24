CREATE TABLE document_chunks (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL,
  version_id TEXT NOT NULL,
  page_number INTEGER,
  chunk_index INTEGER NOT NULL,
  text TEXT NOT NULL,
  UNIQUE(version_id, chunk_index),
  FOREIGN KEY(document_id, owner_id) REFERENCES documents(id, owner_id) ON DELETE CASCADE,
  FOREIGN KEY(version_id, owner_id) REFERENCES document_versions(id, owner_id) ON DELETE CASCADE
);

CREATE INDEX document_chunks_owner_document_idx
  ON document_chunks(owner_id, document_id, page_number, chunk_index);

CREATE VIRTUAL TABLE document_chunks_fts USING fts5(
  text,
  content='document_chunks',
  content_rowid='rowid',
  tokenize='unicode61 remove_diacritics 2'
);

CREATE TRIGGER document_chunks_ai AFTER INSERT ON document_chunks BEGIN
  INSERT INTO document_chunks_fts(rowid, text) VALUES (new.rowid, new.text);
END;

CREATE TRIGGER document_chunks_ad AFTER DELETE ON document_chunks BEGIN
  INSERT INTO document_chunks_fts(document_chunks_fts, rowid, text)
  VALUES ('delete', old.rowid, old.text);
END;

CREATE TRIGGER document_chunks_au AFTER UPDATE ON document_chunks BEGIN
  INSERT INTO document_chunks_fts(document_chunks_fts, rowid, text)
  VALUES ('delete', old.rowid, old.text);
  INSERT INTO document_chunks_fts(rowid, text) VALUES (new.rowid, new.text);
END;
