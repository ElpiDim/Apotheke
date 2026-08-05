# ADR 0002: Filesystem storage and document versions

Status: Accepted

## Context

Imported files can be large and future features need direct file access for PDF viewing, OCR and comparisons. Version history is also a stated product direction.

## Decision

Keep original file bytes in `data/files` under generated UUID filenames. SQLite stores metadata and extracted text. Represent a document with two levels:

- `documents`: stable logical identity and shared metadata.
- `document_versions`: a concrete imported file, its version label, extraction result and import timestamp.

V1 creates a new logical document on import. The model already permits a later “add version” action without migrating existing rows.

## Why

Storing user-supplied filenames as paths risks collisions and path handling bugs. Storing large BLOBs in SQLite would make file streaming, backups and external processing less convenient. Separating identity from file versions is a small V1 cost that directly protects the version-comparison roadmap.

## Failure handling

Uploads first land in `data/tmp`. Text extraction must succeed before a database record is committed. The file is moved to its final UUID path immediately before the database transaction; if the transaction fails, the final file is removed. This avoids intentionally leaving partially imported records behind.
