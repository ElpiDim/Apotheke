import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openDatabase, type ApothekeDatabase } from '../src/database/database.js';
import { createDocument } from '../src/features/documents/documentRepository.js';
import { createNote, deleteNote } from '../src/features/notes/noteRepository.js';
import { search } from '../src/features/search/searchService.js';

describe('local knowledge persistence', () => {
  let directory: string;
  let database: ApothekeDatabase;

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'apotheke-test-'));
    database = openDatabase(path.join(directory, 'test.sqlite'));
  });

  afterEach(() => {
    database.close();
    fs.rmSync(directory, { recursive: true, force: true });
  });

  it('indexes note content, category and tags together', () => {
    const note = createNote(database, {
      title: 'DRS consumer notes',
      content: 'RabbitMQ queues should not be allowed to pile up.',
      category: 'Altenar',
      tags: ['DRS', 'integration'],
    });

    expect(search(database, 'RabbitMQ')[0]?.entityId).toBe(note.id);
    expect(search(database, 'Altenar AND integration')[0]?.entityId).toBe(note.id);

    deleteNote(database, note.id);
    expect(search(database, 'RabbitMQ')).toHaveLength(0);
  });

  it('indexes extracted document text and version metadata', () => {
    const document = createDocument(
      database,
      { title: 'Wallet API', category: 'Web API', tags: ['wallet'], version: '2.4' },
      {
        storedFilename: 'example.txt',
        originalFilename: 'wallet-api.txt',
        mimeType: 'text/plain',
        fileSize: 42,
        extractedText: 'Debit transactions subtract funds from the player balance.',
      },
    );

    const phraseResults = search(database, '"Debit transactions"');
    expect(phraseResults[0]?.entityId).toBe(document.id);
    expect(search(database, '2.4')[0]?.entityId).toBe(document.id);
  });
});
