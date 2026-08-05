# ADR 0001: Application boundaries

Status: Accepted

## Context

Apotheke starts as a local web application but is expected to gain substantially different capabilities later: document rendering, OCR, local AI, semantic search and possibly synchronization. A single undifferentiated `src` tree would make those concerns increasingly coupled.

## Decision

Use one npm workspace with three small boundaries:

- `apps/web`: React presentation and browser-side feature code.
- `apps/server`: Express API, persistence, extraction and filesystem access.
- `packages/contracts`: shared API schemas and TypeScript types.

Within web and server, organize domain code by feature (`documents`, `notes`, `search`) rather than by technical layer across the whole application.

## Why

The browser must never access the SQLite database or local file paths directly. Keeping those capabilities behind the server lets future OCR/AI processes plug into explicit services without contaminating the UI. Shared runtime contracts avoid duplicated request/response types.

## Alternatives considered

- One React/Express source tree: initially smaller, but makes browser/server boundaries less explicit.
- A large monorepo with many packages: more isolation, but unnecessary operational complexity for V1.
- Electron: rejected by product requirement; the browser plus localhost server is the intended runtime.
