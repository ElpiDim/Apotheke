# ADR 0003: One FTS5 search index

Status: Accepted

## Context

V1 must search documents, notes, tags, categories and version labels with phrases and boolean operators. Later semantic search should augment this behavior rather than force UI changes.

## Decision

Maintain one SQLite FTS5 virtual table named `search_index`. Each index row identifies an entity (`document` or `note`) and contains searchable title, body and metadata text.

Application services explicitly reindex an entity inside the same transaction as its metadata change. Search requests go through a dedicated parser/service rather than exposing raw FTS syntax at API boundaries.

## Why

A unified index gives one ranking domain and one search endpoint. Explicit reindexing is easier to test and reason about than a network of SQLite triggers that concatenate tags and categories. A `SearchService` boundary also leaves room for a future hybrid FTS + vector implementation.

## Alternatives considered

- Separate FTS tables per entity: simpler individual queries, but requires result merging and ranking logic.
- Search raw tables with `LIKE`: inadequate ranking and poor full-text performance.
- Vector database now: violates V1's no-AI requirement and adds unnecessary infrastructure.
