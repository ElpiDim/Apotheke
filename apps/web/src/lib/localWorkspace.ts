import { createNoteSchema, updateNoteSchema, createTaskSchema, updateTaskSchema, updateUserProfileSchema, createIntegrationSpaceSchema, updateIntegrationSpaceSchema, createIntegrationFolderSchema, updateIntegrationFolderSchema, createIntegrationEntrySchema, updateIntegrationEntrySchema, importDocumentFieldsSchema, type Note, type Task, type Category, type Tag, type DocumentRecord, type IntegrationSpace, type IntegrationFolder, type IntegrationEntry, type UserProfile } from '@peanut/contracts';
import { searchRecords, type SearchRow } from '@peanut/contracts';
import { validateUploadSelection, validatePdf, validateLocalFileContents } from './uploadRules';

export interface LocalState {
  profile: UserProfile; notes: Note[]; tasks: Task[]; categories: Category[]; tags: Tag[];
  documents: DocumentRecord[]; text: Record<string, string>; hashes: Record<string, string>;
  spaces: IntegrationSpace[]; folders: IntegrationFolder[]; entries: IntegrationEntry[];
  migrations: string[];
}
const fresh = (): LocalState => ({ profile: { name: '', email: '', role: '', bio: '', updatedAt: '' }, notes: [], tasks: [], categories: [], tags: [], documents: [], text: {}, hashes: {}, spaces: [], folders: [], entries: [], migrations: [] });
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('peanut-local-workspace', 1);
    request.onupgradeneeded = () => { request.result.createObjectStore('state'); request.result.createObjectStore('files'); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Local storage is unavailable. Please allow browser storage.'));
  });
}
export async function localTransaction<T>(change: (state: LocalState, files: IDBObjectStore) => T, write = false): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['state', 'files'], write ? 'readwrite' : 'readonly');
    const store = tx.objectStore('state');
    const request = store.get('workspace');
    let result: T;
    let failure: unknown;
    request.onsuccess = () => {
      try { const state = (request.result as LocalState | undefined) ?? fresh(); result = change(state, tx.objectStore('files')); if (write) store.put(state, 'workspace'); }
      catch (error) { failure = error; tx.abort(); }
    };
    tx.oncomplete = () => { db.close(); resolve(result); };
    tx.onabort = () => { db.close(); reject(failure ?? new Error('Could not save locally. Browser storage may be full. No cloud upload was attempted.')); };
    tx.onerror = () => { failure ??= new Error('Could not save locally. Browser storage may be full.'); };
  });
}
function requireItem<T extends { id: string }>(items: T[], id: string): T { const item = items.find(item => item.id === id); if (!item) throw new Error('Item not found in this local workspace.'); return item; }
function category(state: LocalState, name: string | null): Category | null { if (!name?.trim()) return null; const found = state.categories.find(item => item.name.toLowerCase() === name.trim().toLowerCase()); if (found) return found; const item = { id: crypto.randomUUID(), name: name.trim(), color: '#64748b' }; state.categories.push(item); return item; }
function tags(state: LocalState, names: string[]): Tag[] { return [...new Set(names)].map(name => { const found = state.tags.find(item => item.name.toLowerCase() === name.toLowerCase()); if (found) return found; const item = { id: crypto.randomUUID(), name }; state.tags.push(item); return item; }); }
const timestamp = () => new Date().toISOString();
function search(state: LocalState, query: string) {
  const records: SearchRow[] = [
    ...state.documents.map(item => ({ entityType: 'document' as const, entityId: item.id, title: item.title, content: state.text[item.id] ?? '', metadata: item.currentVersion.originalFilename, category: item.category?.name ?? null, tags: item.tags.map(tag => tag.name).join(' '), version: item.currentVersion.label, mimeType: item.currentVersion.mimeType, integrationFolderId: null, updatedAt: item.updatedAt })),
    ...state.notes.map(item => ({ entityType: 'note' as const, entityId: item.id, title: item.title, content: item.content, metadata: null, category: item.category?.name ?? null, tags: item.tags.map(tag => tag.name).join(' '), version: null, mimeType: null, integrationFolderId: null, updatedAt: item.updatedAt })),
    ...state.entries.map(item => { const folder = state.folders.find(folder => folder.id === item.folderId); return { entityType: 'integration' as const, entityId: item.id, title: item.title, content: item.description, metadata: `${item.attachment?.originalFilename ?? ''} ${folder?.name ?? ''} ${state.spaces.find(space => space.id === folder?.spaceId)?.name ?? ''}`, category: null, tags: null, version: null, mimeType: item.attachment?.mimeType ?? null, integrationFolderId: item.folderId, updatedAt: item.updatedAt }; }),
    ...state.categories.map(item => ({ entityType: 'category' as const, entityId: item.id, title: item.name, content: '', metadata: null, category: item.name, tags: null, version: null, mimeType: null, integrationFolderId: null, updatedAt: '' })),
  ];
  return searchRecords(records, query);
}
function deleteFolders(state: LocalState, files: IDBObjectStore, ids: Set<string>) {
  let grew = true;
  while (grew) { grew = false; for (const folder of state.folders) if (folder.parentId && ids.has(folder.parentId) && !ids.has(folder.id)) { ids.add(folder.id); grew = true; } }
  for (const item of state.entries.filter(item => ids.has(item.folderId))) files.delete(`integration:${item.id}`);
  state.entries = state.entries.filter(item => !ids.has(item.folderId)); state.folders = state.folders.filter(item => !ids.has(item.id));
}
const mimes: Record<string, string> = { pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', txt: 'text/plain', md: 'text/markdown', markdown: 'text/markdown', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', avif: 'image/avif' };
export async function localApi<T>(path: string, init?: RequestInit): Promise<T> {
  const method = init?.method ?? 'GET'; const url = new URL(path, 'https://local.invalid'); const route = url.pathname;
  const body = typeof init?.body === 'string' ? JSON.parse(init.body) : {};
  const form = init?.body instanceof FormData ? init.body : null;
  const file = form?.get('file'); let digest = ''; let text = '';
  if (form) {
    if (!(file instanceof File)) throw new Error('Choose a file.');
    const error = route === '/integrations/pdf' ? validatePdf(file) : validateUploadSelection([file]); if (error) throw new Error(error);
    await validateLocalFileContents(file);
    digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', await file.arrayBuffer()))].map(value => value.toString(16).padStart(2, '0')).join('');
    text = String(form.get('extractedText') ?? '') || (/\.(txt|md|markdown)$/iu.test(file.name) ? await file.text() : '');
  }
  return localTransaction((state, files) => {
    const now = timestamp(); const id = crypto.randomUUID();
    if (route === '/profile') { if (method === 'PATCH') state.profile = { ...updateUserProfileSchema.parse(body), email: '', updatedAt: now }; return { profile: state.profile } as T; }
    if (route === '/categories' && method === 'GET') return { categories: state.categories } as T;
    if (route === '/tags' && method === 'GET') return { tags: state.tags } as T;
    if (route.startsWith('/categories/') && method === 'DELETE') { const cid = route.split('/')[2]!; requireItem(state.categories, cid); state.categories = state.categories.filter(item => item.id !== cid); for (const item of [...state.notes, ...state.documents]) if (item.category?.id === cid) item.category = null; return undefined as T; }
    if (route === '/notes' && method === 'GET') return { notes: state.notes } as T;
    if (route === '/notes' && method === 'POST') { const input = createNoteSchema.parse(body); const item = { ...input, id, category: category(state, input.category), tags: tags(state, input.tags), createdAt: now, updatedAt: now }; state.notes.unshift(item); return { note: item } as T; }
    if (route.startsWith('/notes/')) { const item = requireItem(state.notes, route.split('/')[2]!); if (method === 'DELETE') { state.notes = state.notes.filter(note => note.id !== item.id); return undefined as T; } if (method === 'PATCH') { const input = updateNoteSchema.parse(body); Object.assign(item, { title: input.title ?? item.title, content: input.content ?? item.content, category: input.category === undefined ? item.category : category(state, input.category), tags: input.tags === undefined ? item.tags : tags(state, input.tags), updatedAt: now }); } return { note: item } as T; }
    if (route === '/tasks' && method === 'GET') return { tasks: state.tasks } as T;
    if (route === '/tasks' && method === 'POST') { const item = { ...createTaskSchema.parse(body), id, completedAt: null, createdAt: now, updatedAt: now }; state.tasks.unshift(item); return { task: item } as T; }
    if (route.startsWith('/tasks/')) { const item = requireItem(state.tasks, route.split('/')[2]!); if (method === 'DELETE') { state.tasks = state.tasks.filter(task => task.id !== item.id); return undefined as T; } const input = updateTaskSchema.parse(body); Object.assign(item, { title: input.title ?? item.title, description: input.description ?? item.description, dueAt: input.dueAt === undefined ? item.dueAt : input.dueAt, completedAt: input.completed === undefined ? item.completedAt : input.completed ? now : null, updatedAt: now }); return { task: item } as T; }
    if (route === '/documents' && method === 'GET') return { documents: state.documents } as T;
    if (route === '/documents/pending-text') return { documents: state.documents.filter(item => item.currentVersion.mimeType === 'application/pdf' ? !state.text[item.id]?.includes('[[[PINIT_PAGE:') : !state.text[item.id] && /wordprocessingml/u.test(item.currentVersion.mimeType)).map(item => ({ id: item.id, originalFilename: item.currentVersion.originalFilename })) } as T;
    if (route === '/documents/import' && form && file instanceof File) {
      const duplicate = state.documents.find(item => state.hashes[item.id] === digest); if (duplicate) throw new Error(`This file is already saved as “${duplicate.title}”.`);
      const rawTags = String(form.get('tags') ?? ''); const input = importDocumentFieldsSchema.parse({ title: String(form.get('title') ?? '').trim() || file.name.replace(/\.[^.]+$/u, ''), category: String(form.get('category') ?? '').trim() || null, tags: rawTags.startsWith('[') ? JSON.parse(rawTags) : rawTags.split(',').map(tag => tag.trim()).filter(Boolean), version: String(form.get('version') ?? '1.0') });
      const item: DocumentRecord = { id, title: input.title, category: category(state, input.category), tags: tags(state, input.tags), currentVersion: { id: crypto.randomUUID(), label: input.version, originalFilename: file.name, mimeType: mimes[file.name.split('.').pop()!.toLowerCase()]!, fileSize: file.size, importedAt: now }, createdAt: now, updatedAt: now };
      state.documents.unshift(item); state.text[id] = text.slice(0, 4_000_000); state.hashes[id] = digest; files.put(file, `document:${id}`); return { document: item } as T;
    }
    if (route.startsWith('/documents/')) { const item = requireItem(state.documents, route.split('/')[2]!); if (method === 'DELETE') { state.documents = state.documents.filter(doc => doc.id !== item.id); delete state.text[item.id]; delete state.hashes[item.id]; files.delete(`document:${item.id}`); return undefined as T; } if (route.endsWith('/extracted-text') && method === 'PATCH') { if (typeof body.extractedText !== 'string') throw new Error('Extracted text is required.'); state.text[item.id] = body.extractedText.slice(0, 4_000_000) || '[PINIT_NO_TEXT]'; return undefined as T; } return { document: item, extractedText: state.text[item.id] === '[PINIT_NO_TEXT]' ? '' : (state.text[item.id] ?? '').replace(/\[\[\[PINIT_PAGE:\d+\]\]\]\s*/gu, '') } as T; }
    if (route === '/integrations') return { spaces: state.spaces, folders: state.folders, entries: state.entries } as T;
    if (route === '/integrations/spaces' && method === 'GET') return { spaces: state.spaces } as T;
    if (route === '/integrations/spaces' && method === 'POST') { const input = createIntegrationSpaceSchema.parse(body); if (state.spaces.some(item => item.name.toLowerCase() === input.name.toLowerCase())) throw new Error('A section with this name already exists.'); const item = { ...input, id, createdAt: now, updatedAt: now }; state.spaces.push(item); return { space: item } as T; }
    if (route.startsWith('/integrations/spaces/')) { const item = requireItem(state.spaces, route.split('/')[3]!); if (method === 'DELETE') { deleteFolders(state, files, new Set(state.folders.filter(folder => folder.spaceId === item.id).map(folder => folder.id))); state.spaces = state.spaces.filter(space => space.id !== item.id); return undefined as T; } Object.assign(item, updateIntegrationSpaceSchema.parse(body), { updatedAt: now }); return { space: item } as T; }
    if (route === '/integrations/folders' && method === 'POST') { const input = createIntegrationFolderSchema.parse(body); requireItem(state.spaces, input.spaceId); if (input.parentId && requireItem(state.folders, input.parentId).spaceId !== input.spaceId) throw new Error('A folder must stay inside its section.'); const item = { ...input, id, createdAt: now, updatedAt: now }; state.folders.push(item); return { folder: item } as T; }
    if (route.startsWith('/integrations/folders/')) { const item = requireItem(state.folders, route.split('/')[3]!); if (method === 'DELETE') { deleteFolders(state, files, new Set([item.id])); return undefined as T; } const input = updateIntegrationFolderSchema.parse(body); let parent = input.parentId ? requireItem(state.folders, input.parentId) : null; const visited = new Set<string>(); while (parent) { if (parent.id === item.id || visited.has(parent.id) || parent.spaceId !== item.spaceId) throw new Error('Invalid folder parent.'); visited.add(parent.id); parent = parent.parentId ? requireItem(state.folders, parent.parentId) : null; } Object.assign(item, input, { updatedAt: now }); return { folder: item } as T; }
    if (route === '/integrations/entries' && method === 'POST') { const input = createIntegrationEntrySchema.parse(body); requireItem(state.folders, input.folderId); const item = { ...input, id, attachment: null, createdAt: now, updatedAt: now }; state.entries.unshift(item); return { entry: item } as T; }
    if (route === '/integrations/pdf' && form && file instanceof File) { const folderId = String(form.get('folderId')); requireItem(state.folders, folderId); const item = { id, folderId, title: String(form.get('title') ?? '').trim() || file.name.replace(/\.pdf$/iu, ''), description: String(form.get('description') ?? '').slice(0, 20000), url: null, attachment: { originalFilename: file.name, mimeType: 'application/pdf', fileSize: file.size }, createdAt: now, updatedAt: now }; state.entries.unshift(item); files.put(file, `integration:${id}`); return { entry: item } as T; }
    if (route.startsWith('/integrations/entries/')) { const item = requireItem(state.entries, route.split('/')[3]!); if (method === 'DELETE') { state.entries = state.entries.filter(entry => entry.id !== item.id); files.delete(`integration:${item.id}`); return undefined as T; } const input = updateIntegrationEntrySchema.parse(body); if (input.folderId) requireItem(state.folders, input.folderId); Object.assign(item, input, { updatedAt: now }); return { entry: item } as T; }
    if (route === '/search') return search(state, url.searchParams.get('q') ?? '') as T;
    if (route === '/search/answer') { const question = url.searchParams.get('q') ?? ''; const query = question.match(/[\p{L}\p{N}_-]+/gu)?.filter(word => word.length > 2).join(' OR ') ?? ''; const sources = search(state, query).results.filter(item => item.entityType !== 'category' && !item.mimeType?.startsWith('image/')).slice(0, 5).map(item => ({ entityType: item.entityType, entityId: item.entityId, title: item.title, excerpt: item.snippet.replaceAll('[[[PINIT_MATCH]]]', '').replaceAll('[[[/PINIT_MATCH]]]', ''), category: item.category, mimeType: item.mimeType, integrationFolderId: item.integrationFolderId })); return { question, answer: sources[0]?.excerpt ?? null, sources } as T; }
    throw new Error(`Unsupported local operation: ${method} ${route}`);
  }, method !== 'GET');
}
export async function localBlob(path: string): Promise<Blob> {
  const match = path.match(/^\/documents\/([^/]+)\/file$|^\/integrations\/entries\/([^/]+)\/pdf$/u); if (!match) throw new Error('Unsupported local file request.');
  const db = await open();
  return new Promise((resolve, reject) => { const tx = db.transaction('files'); const request = tx.objectStore('files').get(match[1] ? `document:${match[1]}` : `integration:${match[2]}`); request.onsuccess = () => request.result instanceof Blob ? resolve(request.result) : reject(new Error('Local file not found.')); request.onerror = () => reject(new Error('Could not read local file.')); tx.oncomplete = () => db.close(); });
}
