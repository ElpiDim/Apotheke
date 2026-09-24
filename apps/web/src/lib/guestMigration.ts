import type { DocumentRecord, Note, Task, Category, Tag, IntegrationSpace, IntegrationFolder, IntegrationEntry, UserProfile } from '@peanut/contracts';
import { authClient, cloudApiUrl } from './authClient';
import { localTransaction } from './localWorkspace';

// Retain the old key solely for an explicit, read-only legacy import.
export const legacyGuestKey = 'peanut-guest-workspace';
export async function importLegacyGuest(): Promise<number> {
  const session = await authClient.getSession();
  if (session.error || session.data?.user) throw new Error('Sign out before importing a legacy guest workspace.');
  const token = localStorage.getItem(legacyGuestKey);
  if (!token || !/^[0-9a-f-]{36}$/iu.test(token)) throw new Error('No legacy guest workspace was found in this browser.');
  if (await localTransaction(state => state.migrations.includes(token))) return 0;
  const headers = { 'X-Peanut-Guest': token };
  async function read<T>(path: string): Promise<T> {
    const response = await fetch(`${cloudApiUrl}/api${path}`, { headers, credentials: 'omit' });
    if (!response.ok) throw new Error('Could not read your old guest workspace. Nothing was deleted. Retry later.');
    return response.json() as Promise<T>;
  }
  async function blob(path: string): Promise<Blob> {
    const response = await fetch(`${cloudApiUrl}/api${path}`, { headers, credentials: 'omit' });
    if (!response.ok) throw new Error('Could not copy an old file. The import was not saved; cloud files remain untouched.');
    return response.blob();
  }
  const [documents, notes, tasks, categories, tags, workspace, profile] = await Promise.all([
    read<{ documents: DocumentRecord[] }>('/documents'), read<{ notes: Note[] }>('/notes'), read<{ tasks: Task[] }>('/tasks'),
    read<{ categories: Category[] }>('/categories'), read<{ tags: Tag[] }>('/tags'),
    read<{ spaces: IntegrationSpace[]; folders: IntegrationFolder[]; entries: IntegrationEntry[] }>('/integrations'), read<{ profile: UserProfile }>('/profile'),
  ]);
  const copies: Array<{ key: string; value: Blob }> = []; const texts: Record<string, string> = {}; const hashes: Record<string, string> = {};
  // Sequential downloads avoid issuing a burst of requests or holding concurrent large buffers.
  for (const doc of documents.documents) {
    const file = await blob(`/documents/${doc.id}/file`); copies.push({ key: `document:${doc.id}`, value: file });
    texts[doc.id] = (await read<{ extractedText: string }>(`/documents/${doc.id}`)).extractedText;
    hashes[doc.id] = [...new Uint8Array(await crypto.subtle.digest('SHA-256', await file.arrayBuffer()))].map(value => value.toString(16).padStart(2, '0')).join('');
  }
  for (const entry of workspace.entries) if (entry.attachment) copies.push({ key: `integration:${entry.id}`, value: await blob(`/integrations/entries/${entry.id}/pdf`) });
  return localTransaction((state, files) => {
    if (state.migrations.includes(token)) return 0;
    const merge = <T extends { id: string }>(local: T[], old: T[]): T[] => [...local, ...old.filter(item => !local.some(existing => existing.id === item.id))];
    state.documents = merge(state.documents, documents.documents); state.notes = merge(state.notes, notes.notes); state.tasks = merge(state.tasks, tasks.tasks);
    state.categories = merge(state.categories, categories.categories); state.tags = merge(state.tags, tags.tags); state.spaces = merge(state.spaces, workspace.spaces); state.folders = merge(state.folders, workspace.folders); state.entries = merge(state.entries, workspace.entries);
    if (!state.profile.updatedAt) state.profile = { ...profile.profile, email: '', name: profile.profile.name === 'Guest' ? '' : profile.profile.name };
    Object.assign(state.text, texts); Object.assign(state.hashes, hashes); for (const copy of copies) files.put(copy.value, copy.key);
    state.migrations.push(token);
    return documents.documents.length + notes.notes.length + tasks.tasks.length + workspace.entries.length;
  }, true);
}
export async function legacyImported(): Promise<boolean> { const token = localStorage.getItem(legacyGuestKey); return !token || localTransaction(state => state.migrations.includes(token)); }
