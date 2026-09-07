# Peanut

Peanut is a playful, local-first personal workspace for documents, images, notes, tasks and organized knowledge. It uses strict TypeScript, explicit module boundaries, SQLite/FTS5 search and private file storage on the local filesystem.

## Privacy

Peanut is local-first. Its API binds to `127.0.0.1` by default, workspace metadata lives in SQLite and imported files remain in the private local data directory. Cloudflare R2 support is optional and currently used only for a storage connection check; there is no telemetry, advertising or external AI integration.

## Requirements

- Node.js 20.19 or newer
- npm 10 or newer

## Start locally

From CMD or PowerShell in the project root:

```text
npm install
npm run dev
```

Then open `http://localhost:5173`.

The Vite development server proxies `/api` to the local Express server at `127.0.0.1:4070`.

## Useful commands

```text
npm run dev
npm run typecheck
npm test
npm run build
npm run check
```

## Project layout

```text
apps/
  web/          React UI; feature modules own their screens and client logic
  server/       Express API; feature modules own routes/services/repositories
packages/
  contracts/    Runtime-validated API contracts shared by web and server
docs/
  architecture/ Architecture Decision Records (ADRs)
data/           Local runtime data; ignored by Git
```

Inside `data/`, Peanut creates its SQLite database, `files/`, and `tmp/`. Backing up that directory is sufficient to preserve V1 user content. Existing installations continue to use the legacy `apotheke.sqlite` filename so no local data is lost during the product rename.

## Current scope

- Import PDF, DOCX, TXT, Markdown and image files and extract searchable text where supported
- Keep document metadata: title, original filename, category, tags, version and import date
- Create, edit and delete searchable notes
- Organize nested folders, custom folder spaces and integration links or PDFs
- Track tasks, deadlines and completion state
- Keep an encrypted local password vault
- Search documents, images, notes, integrations and categories through SQLite FTS5
- Support quoted phrases and `AND`, `OR`, `NOT` operators
- Search partial words without caring about case or accents
- Ask Pini for extractive answers sourced from local workspace content
- Manage reusable categories and tags while editing content

See [`docs/architecture`](docs/architecture) for the decisions that keep later PDF viewing, OCR, version comparison and semantic search possible without changing the V1 foundations.
