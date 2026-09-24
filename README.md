# Peanut

Peanut is a playful personal workspace for documents, images, notes, tasks and organized knowledge. Guests use browser-local IndexedDB storage; signed-in users use a separate Cloudflare workspace (D1 metadata and R2 files). Guest files are not automatically uploaded when signing in.

## Privacy

Guest content stays in IndexedDB on the current browser and origin. Clearing site data, private browsing, browser eviction or changing domains can remove access to it. Keep original copies of important files. The web page and authentication checks still require network access; this is not a complete offline/PWA implementation. Signed-in content is stored in Cloudflare; Brevo delivers password-reset emails. Pini uses extractive search, not an external AI provider.

Browsers with the old `peanut-guest-workspace` key show an explicit option to copy their legacy cloud guest data locally. Import only reads cloud data, downloads attachments sequentially, and commits the complete copy in one IndexedDB transaction. Failed imports leave the local workspace unchanged. Originals and the old guest key are retained; cloud cleanup is a separate operation. Browser-local and signed-in cloud workspaces remain independent.

The legacy Express/SQLite service remains in the repository for existing local installations. Its data directory is not automatically imported into the new browser guest workspace and must not be deleted during migration.

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
- Search documents, images, notes, integrations and categories through SQLite FTS5
- Support quoted phrases and `AND`, `OR`, `NOT` operators
- Search partial words without caring about case or accents
- Ask Pini for extractive answers sourced from local workspace content
- Manage reusable categories and tags while editing content

See [`docs/architecture`](docs/architecture) for the decisions that keep later PDF viewing, OCR, version comparison and semantic search possible without changing the V1 foundations.
