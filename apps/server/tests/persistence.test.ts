import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openDatabase, type ApothekeDatabase } from '../src/database/database.js';
import { createDocument, deleteDocument, listDocuments } from '../src/features/documents/documentRepository.js';
import { createNote, deleteNote } from '../src/features/notes/noteRepository.js';
import {
  createIntegrationEntry,
  createIntegrationFolder,
  createIntegrationSpace,
  deleteIntegrationSpace,
  deleteIntegrationFolder,
  listIntegrationEntries,
  listIntegrationFolders,
  listIntegrationSpaces,
  updateIntegrationEntry,
  updateIntegrationFolder,
  updateIntegrationSpace,
} from '../src/features/integrations/integrationRepository.js';
import { answerQuestion, search } from '../src/features/search/searchService.js';
import { createTask, deleteTask, listTasks, updateTask } from '../src/features/tasks/taskRepository.js';

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
    expect(search(database, 'rabbit')[0]?.entityId).toBe(note.id);
    expect(search(database, 'RABBIT')[0]?.entityId).toBe(note.id);
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
        contentHash: 'wallet-api-hash',
      },
    );

    const phraseResults = search(database, '"Debit transactions"');
    expect(phraseResults[0]?.entityId).toBe(document.id);
    expect(search(database, '2.4')[0]?.entityId).toBe(document.id);
    const answer = answerQuestion(database, 'What happens to the player balance during debit transactions?');
    expect(answer.answer).toContain('subtract funds');
    expect(answer.answer).toBe('Debit transactions subtract funds from the player balance.');
    expect(answer.sources[0]?.entityId).toBe(document.id);
  });

  it('indexes image titles and filenames without requiring extracted text', () => {
    const image = createDocument(
      database,
      { title: 'Summer inspiration board', category: 'Images', tags: ['moodboard'], version: '1.0' },
      {
        storedFilename: 'generated-image.png',
        originalFilename: 'purple-folder-reference.png',
        mimeType: 'image/png',
        fileSize: 128,
        extractedText: '',
        contentHash: 'image-hash',
      },
    );

    expect(search(database, 'Summer')[0]?.entityId).toBe(image.id);
    expect(search(database, 'purple-folder')[0]?.entityId).toBe(image.id);
    expect(deleteDocument(database, image.id)).toBe('generated-image.png');
    expect(listDocuments(database)).toHaveLength(0);
    expect(search(database, 'Summer')).toHaveLength(0);
  });

  it('stores nested integration folders and cascades their entries', () => {
    const defaultSpace = listIntegrationSpaces(database)[0]!;
    const parent = createIntegrationFolder(database, { name: 'Platforms', spaceId: defaultSpace.id, parentId: null });
    const child = createIntegrationFolder(database, { name: 'Payments', spaceId: defaultSpace.id, parentId: parent.id });
    const entry = createIntegrationEntry(database, {
      folderId: child.id,
      title: 'Stripe dashboard',
      description: 'Test environment',
      url: 'https://dashboard.stripe.com',
    });

    expect(listIntegrationFolders(database)).toHaveLength(2);
    expect(listIntegrationEntries(database)[0]?.folderId).toBe(child.id);
    const integrationResult = search(database, 'Stripe AND Payments')[0];
    expect(integrationResult?.entityType).toBe('integration');
    expect(integrationResult?.integrationFolderId).toBe(child.id);

    const renamed = updateIntegrationFolder(database, child.id, { name: 'Payment services' });
    expect(renamed.name).toBe('Payment services');
    const moved = updateIntegrationEntry(database, entry.id, {
      folderId: parent.id,
      title: 'Stripe operations dashboard',
    });
    expect(moved.folderId).toBe(parent.id);
    expect(search(database, 'operations AND Platforms')[0]?.entityId).toBe(entry.id);

    deleteIntegrationFolder(database, parent.id);
    expect(listIntegrationFolders(database)).toHaveLength(0);
    expect(listIntegrationEntries(database)).toHaveLength(0);
    expect(search(database, 'Stripe')).toHaveLength(0);
  });

  it('keeps custom folder sections independent and renameable', () => {
    const projects = createIntegrationSpace(database, { name: 'Projects' });
    const folder = createIntegrationFolder(database, { name: 'Peanut website', spaceId: projects.id, parentId: null });
    expect(folder.spaceId).toBe(projects.id);
    expect(updateIntegrationSpace(database, projects.id, { name: 'Client projects' }).name).toBe('Client projects');
    expect(listIntegrationSpaces(database).some((space) => space.name === 'Client projects')).toBe(true);
    deleteIntegrationSpace(database, projects.id);
    expect(listIntegrationFolders(database).some((item) => item.id === folder.id)).toBe(false);
  });

  it('stores task deadlines and completion state', () => {
    const task = createTask(database, {
      title: 'Review integration docs',
      description: 'Check the new PDF flow.',
      dueAt: '2026-08-10T09:00:00.000Z',
    });
    expect(listTasks(database)[0]?.dueAt).toBe('2026-08-10T09:00:00.000Z');

    const completed = updateTask(database, task.id, {
      title: 'Review and publish integration docs',
      dueAt: '2026-08-11T10:30:00.000Z',
      completed: true,
    });
    expect(completed.title).toBe('Review and publish integration docs');
    expect(completed.dueAt).toBe('2026-08-11T10:30:00.000Z');
    expect(completed.completedAt).not.toBeNull();

    deleteTask(database, task.id);
    expect(listTasks(database)).toHaveLength(0);
  });
});
