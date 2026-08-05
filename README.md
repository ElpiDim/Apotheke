# Apotheke

Apotheke is a local-first personal knowledge system for technical documentation. It is designed as a long-lived product: strict TypeScript, explicit module boundaries, SQLite/FTS5 search, and original files stored on the local filesystem.

## Privacy contract

Version 1 makes no runtime network requests to third-party services. There is no AI integration, telemetry, analytics, cloud storage, or external CDN. The API binds to `127.0.0.1` by default. Installing npm packages is the only network-dependent setup step.

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

Inside `data/`, Apotheke creates `apotheke.sqlite`, `files/`, and `tmp/`. Backing up that directory is sufficient to preserve V1 user content.

## V1 scope

- Import PDF, DOCX, TXT and Markdown files and extract searchable text
- Keep document metadata: title, original filename, category, tags, version and import date
- Create, edit and delete searchable notes
- Search documents and notes through SQLite FTS5
- Support quoted phrases and `AND`, `OR`, `NOT` operators
- Manage reusable categories and tags implicitly while editing content

See [`docs/architecture`](docs/architecture) for the decisions that keep later PDF viewing, OCR, version comparison and semantic search possible without changing the V1 foundations.
