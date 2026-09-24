import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { localApi, localBlob } from '../../web/src/lib/localWorkspace';
import type { Note, Task, DocumentRecord, IntegrationSpace, IntegrationFolder, IntegrationEntry } from '@peanut/contracts';
import { api, apiBlob } from '../../web/src/lib/api';
import { importLegacyGuest } from '../../web/src/lib/guestMigration';

const auth = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock('../../web/src/lib/authClient', () => ({ authClient: auth, cloudApiUrl: 'https://cloud.invalid' }));

const request = (method: string, body: unknown) => ({ method, body: JSON.stringify(body) });
beforeEach(async () => { await new Promise<void>((resolve, reject) => { const r = indexedDB.deleteDatabase('peanut-local-workspace'); r.onsuccess = () => resolve(); r.onerror = () => reject(r.error); }); });
describe('browser-only guest workspace', () => {
  it('copies legacy cloud files atomically, without deleting originals or duplicating retries', async () => {
    auth.getSession.mockResolvedValue({ data: null });
    vi.stubGlobal('localStorage', { getItem: () => '11111111-1111-4111-8111-111111111111' });
    const id = '22222222-2222-4222-8222-222222222222';
    const doc: DocumentRecord = { id, title: 'Old report', category: null, tags: [], currentVersion: { id, label: '1.0', originalFilename: 'old.txt', mimeType: 'text/plain', fileSize: 5, importedAt: '2026-09-13' }, createdAt: '2026-09-13', updatedAt: '2026-09-13' };
    let failFile = true;
    const network = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      expect(init?.method ?? 'GET').toBe('GET'); expect(init?.credentials).toBe('omit');
      const path = String(url).split('/api')[1];
      if (path?.endsWith('/file')) return failFile ? new Response('', { status: 500 }) : new Response('bonus');
      if (path === `/documents/${id}`) return Response.json({ extractedText: 'bonus' });
      const responses: Record<string, unknown> = { '/documents': { documents: [doc] }, '/notes': { notes: [] }, '/tasks': { tasks: [] }, '/categories': { categories: [] }, '/tags': { tags: [] }, '/integrations': { spaces: [], folders: [], entries: [] }, '/profile': { profile: { name: 'Guest', email: 'old@example.com', role: '', bio: '', updatedAt: '' } } };
      return Response.json(responses[path!]!);
    });
    try {
      await expect(importLegacyGuest()).rejects.toThrow('import was not saved');
      expect((await localApi<{ documents: DocumentRecord[] }>('/documents')).documents).toHaveLength(0);
      failFile = false;
      expect(await importLegacyGuest()).toBe(1); expect(await importLegacyGuest()).toBe(0);
      expect((await localApi<{ documents: DocumentRecord[] }>('/documents')).documents).toHaveLength(1);
      expect(await (await localBlob(`/documents/${id}/file`)).text()).toBe('bonus');
    } finally { network.mockRestore(); vi.unstubAllGlobals(); }
  });
  it('routes guests locally and signed-in users to cloud without mixing data', async () => {
    auth.getSession.mockResolvedValue({ data: null });
    const network = vi.spyOn(globalThis, 'fetch');
    try {
      await api('/notes', request('POST', { title: 'Guest only', content: 'private' }));
      expect(network).not.toHaveBeenCalled();
      auth.getSession.mockResolvedValue({ data: { user: { id: 'signed-in-user' } } });
      network.mockResolvedValueOnce(Response.json({ notes: [] }));
      expect((await api<{ notes: Note[] }>('/notes')).notes).toHaveLength(0);
      expect(network.mock.calls[0]?.[0]).toBe('https://cloud.invalid/api/notes');
      auth.getSession.mockResolvedValue({ error: { message: 'offline' } });
      await expect(api('/notes', request('POST', { title: 'No fallback', content: '' }))).rejects.toThrow('verify your session');
      await expect(apiBlob('/documents/unknown/file')).rejects.toThrow('verify your session');
      auth.getSession.mockResolvedValue({ data: null });
      expect((await api<{ notes: Note[] }>('/notes')).notes).toHaveLength(1);
    } finally { network.mockRestore(); }
  });
  it('rejects disguised files before storing any records', async () => {
    const form = new FormData(); form.set('file', new File(['Not a PDF'], 'fake.pdf'));
    await expect(localApi('/documents/import', { method: 'POST', body: form })).rejects.toThrow('contents');
    expect((await localApi<{ documents: DocumentRecord[] }>('/documents')).documents).toHaveLength(0);
  });
  it('persists notes and tasks across reads without network calls', async () => {
    const network = vi.spyOn(globalThis, 'fetch');
    try {
      const { note } = await localApi<{ note: Note }>('/notes', request('POST', { title: 'My note', content: 'Ένα BONUS network', category: 'Work', tags: ['test'] }));
      const { task } = await localApi<{ task: Task }>('/tasks', request('POST', { title: 'My task' }));
      expect((await localApi<{ notes: Note[] }>('/notes')).notes[0]?.id).toBe(note.id);
      await localApi(`/tasks/${task.id}`, request('PATCH', { completed: true }));
      expect((await localApi<{ tasks: Task[] }>('/tasks')).tasks[0]?.completedAt).toBeTruthy();
      const results = await localApi<{ results: Array<{ snippet: string }> }>('/search?q=bon');
      expect(results.results[0]?.snippet).toContain('[[[PINIT_MATCH]]]BON[[[/PINIT_MATCH]]]');
      expect(network).not.toHaveBeenCalled();
    } finally { network.mockRestore(); }
  });
  it('stores file bytes, extracted content and rejects duplicate uploads', async () => {
    const form = new FormData(); form.set('file', new File(['The bonus is inside this file.'], 'report.txt', { type: 'text/plain' }));
    const { document } = await localApi<{ document: DocumentRecord }>('/documents/import', { method: 'POST', body: form });
    expect(await (await localBlob(`/documents/${document.id}/file`)).text()).toContain('bonus');
    expect((await localApi<{ results: unknown[] }>('/search?q=BONUS')).results).toHaveLength(1);
    await expect(localApi('/documents/import', { method: 'POST', body: form })).rejects.toThrow('already saved');
    await localApi(`/documents/${document.id}`, { method: 'DELETE' });
    await expect(localBlob(`/documents/${document.id}/file`)).rejects.toThrow('not found');
  });
  it('removes descendant folders and rejects cyclic moves', async () => {
    const { space } = await localApi<{ space: IntegrationSpace }>('/integrations/spaces', request('POST', { name: 'Project' }));
    const { folder } = await localApi<{ folder: IntegrationFolder }>('/integrations/folders', request('POST', { name: 'Parent', spaceId: space.id }));
    const { folder: child } = await localApi<{ folder: IntegrationFolder }>('/integrations/folders', request('POST', { name: 'Child', spaceId: space.id, parentId: folder.id }));
    await localApi('/integrations/entries', request('POST', { title: 'Link', folderId: child.id, url: 'https://example.com' }));
    await expect(localApi(`/integrations/folders/${folder.id}`, request('PATCH', { parentId: child.id }))).rejects.toThrow('Invalid folder parent');
    await localApi(`/integrations/folders/${folder.id}`, { method: 'DELETE' });
    const workspace = await localApi<{ folders: IntegrationFolder[]; entries: IntegrationEntry[] }>('/integrations');
    expect(workspace.folders).toHaveLength(0); expect(workspace.entries).toHaveLength(0);
  });
  it('serializes concurrent writes and clears category links without deleting notes', async () => {
    await Promise.all(Array.from({ length: 10 }, (_, i) => localApi('/notes', request('POST', { title: `Note ${i}`, content: 'text', category: 'Shared' }))));
    let notes = (await localApi<{ notes: Note[] }>('/notes')).notes;
    expect(notes).toHaveLength(10);
    await localApi(`/categories/${notes[0]!.category!.id}`, { method: 'DELETE' });
    notes = (await localApi<{ notes: Note[] }>('/notes')).notes;
    expect(notes).toHaveLength(10); expect(notes.every(note => note.category === null)).toBe(true);
  });
});
