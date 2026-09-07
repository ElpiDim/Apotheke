# ADR 0004: Cloud identity and tenant isolation

Status: Accepted

## Context

Peanut must remain usable without an account while optionally syncing a signed-in user's workspace between devices. Cloud records and R2 objects must never be shared across users. The encrypted password vault is more sensitive than ordinary workspace data and is outside the first cloud MVP.

## Decision

- Use Better Auth in a Cloudflare Worker for public Peanut accounts and server-side sessions.
- Store identities, sessions and synchronized workspace metadata in Cloudflare D1.
- Add a mandatory `owner_id` to every private workspace table.
- Derive `owner_id` only from the authenticated server session; never accept it from a client payload.
- Scope every read, update and delete by both resource ID and `owner_id`.
- Store file bytes in a private R2 bucket under `users/{ownerId}/...` keys while D1 stores only their metadata and storage keys.
- Keep the password vault local-only for the cloud MVP.
- Keep guest data on the device until the user explicitly chooses to upload it after creating an account.

## Enforcement

The schema uses composite foreign keys where a relationship could otherwise cross an ownership boundary. Application authorization remains mandatory because D1 does not provide PostgreSQL-style row-level security. Automated isolation tests must use at least two users and cover reads, updates, deletes and file access.

## Rollout

Apply migrations to a separate staging D1 database first. Populate it only with synthetic test users until authentication, authorization and account deletion tests pass. Importing an existing local workspace is a separate, explicit operation.
