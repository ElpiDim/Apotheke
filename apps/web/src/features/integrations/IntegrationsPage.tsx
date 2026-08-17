import { useEffect, useMemo, useState, type DragEvent, type FormEvent, type InputHTMLAttributes, type ReactNode } from 'react';
import type { IntegrationEntry, IntegrationFolder } from '@apotheke/contracts';
import { ChevronRight, ExternalLink, FileText, Folder, FolderOpen, FolderPlus, HardDrive, Link2, Pencil, Plus, Sparkles, Trash2, UploadCloud, X } from 'lucide-react';
import { EmptyState } from '../../components/EmptyState';
import { api, jsonRequest } from '../../lib/api';
import { Link, useSearchParams } from 'react-router-dom';
import { announceWorkspaceChange } from '../../lib/workspaceEvents';

interface IntegrationWorkspace {
  folders: IntegrationFolder[];
  entries: IntegrationEntry[];
}

interface FolderOption extends IntegrationFolder {
  depth: number;
}

function flattenFolders(folders: IntegrationFolder[], parentId: string | null = null, depth = 0): FolderOption[] {
  return folders
    .filter((folder) => folder.parentId === parentId)
    .flatMap((folder) => [
      { ...folder, depth },
      ...flattenFolders(folders, folder.id, depth + 1),
    ]);
}

export function IntegrationsPage() {
  const [params] = useSearchParams();
  const requestedFolderId = params.get('folder');
  const [workspace, setWorkspace] = useState<IntegrationWorkspace>({ folders: [], entries: [] });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [folderOpen, setFolderOpen] = useState(false);
  const [entryOpen, setEntryOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<IntegrationFolder | null>(null);
  const [editingEntry, setEditingEntry] = useState<IntegrationEntry | null>(null);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [uploadingDrop, setUploadingDrop] = useState(false);

  async function load() {
    const result = await api<IntegrationWorkspace>('/integrations');
    setWorkspace(result);
    setSelectedId((current) => {
      if (requestedFolderId && result.folders.some((folder) => folder.id === requestedFolderId)) return requestedFolderId;
      return current && result.folders.some((folder) => folder.id === current)
        ? current
        : result.folders[0]?.id ?? null;
    });
  }

  useEffect(() => {
    void load().catch((reason: Error) => setError(reason.message));
  }, []);

  const folderOptions = useMemo(() => flattenFolders(workspace.folders), [workspace.folders]);
  const selectedFolder = workspace.folders.find((folder) => folder.id === selectedId) ?? null;
  const selectedEntries = workspace.entries.filter((entry) => entry.folderId === selectedId);
  const childFolders = workspace.folders.filter((folder) => folder.parentId === selectedId);
  const selectedPath = useMemo(() => {
    const path: IntegrationFolder[] = [];
    let current = selectedFolder;
    while (current) {
      path.unshift(current);
      current = workspace.folders.find((folder) => folder.id === current?.parentId) ?? null;
    }
    return path;
  }, [selectedFolder, workspace.folders]);

  async function createFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') ?? '').trim();
    if (!name) return;
    setError('');
    try {
      const result = await api<{ folder: IntegrationFolder }>(editingFolder ? `/integrations/folders/${editingFolder.id}` : '/integrations/folders', jsonRequest(editingFolder ? 'PATCH' : 'POST', {
        name,
        parentId: form.get('parentId') || null,
      }));
      await load();
      announceWorkspaceChange('integrations');
      setSelectedId(result.folder.id);
      setFolderOpen(false);
      setEditingFolder(null);
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  async function createEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId) return;
    const form = new FormData(event.currentTarget);
    setError('');
    try {
      const file = form.get('file');
      if (!editingEntry && file instanceof File && file.size > 0) {
        form.set('folderId', selectedId);
        await api('/integrations/pdf', { method: 'POST', body: form });
      } else {
        await api(editingEntry ? `/integrations/entries/${editingEntry.id}` : '/integrations/entries', jsonRequest(editingEntry ? 'PATCH' : 'POST', {
          folderId: String(form.get('folderId') || selectedId),
          title: String(form.get('title') ?? ''),
          description: String(form.get('description') ?? ''),
          url: String(form.get('url') ?? ''),
        }));
      }
      await load();
      announceWorkspaceChange('integrations');
      setEntryOpen(false);
      setEditingEntry(null);
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  async function removeFolder() {
    if (!selectedFolder || !window.confirm(`Delete “${selectedFolder.name}” and everything inside it?`)) return;
    await api(`/integrations/folders/${selectedFolder.id}`, { method: 'DELETE' });
    await load();
    announceWorkspaceChange('integrations');
  }

  async function removeEntry(entry: IntegrationEntry) {
    if (!window.confirm(`Delete “${entry.title}”?`)) return;
    await api(`/integrations/entries/${entry.id}`, { method: 'DELETE' });
    await load();
    announceWorkspaceChange('integrations');
  }

  function newFolder() {
    setEditingFolder(null);
    setFolderOpen(true);
  }

  function editFolder(folder: IntegrationFolder) {
    setEditingFolder(folder);
    setFolderOpen(true);
  }

  function newEntry() {
    setEditingEntry(null);
    setEntryOpen(true);
  }

  function editEntry(entry: IntegrationEntry) {
    setEditingEntry(entry);
    setEntryOpen(true);
  }

  function dragOver(event: DragEvent<HTMLDivElement>) {
    if (!event.dataTransfer.types.includes('Files')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setDragActive(true);
  }

  async function dropPdf(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files[0];
    if (!file || !selectedId) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Integration folders accept PDF files only.');
      return;
    }
    const form = new FormData();
    form.set('file', file);
    form.set('folderId', selectedId);
    form.set('title', file.name.replace(/\.pdf$/i, ''));
    form.set('description', '');
    setUploadingDrop(true);
    setError('');
    try {
      await api('/integrations/pdf', { method: 'POST', body: form });
      await load();
      announceWorkspaceChange('integrations');
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setUploadingDrop(false);
    }
  }

  return (
    <div>
      <section className="relative mb-5 min-h-[190px] overflow-hidden rounded-[28px] px-6 py-7 sm:px-8">
        <div className="integrations-title-blob" aria-hidden="true" />
        <div className="absolute right-[10%] top-8 hidden h-16 w-16 rounded-full bg-teal-200/80 sm:block dark:bg-teal-500/30" aria-hidden="true" />
        <div className="absolute right-[4%] top-14 hidden text-violet-500 sm:block dark:text-violet-300" aria-hidden="true"><Sparkles size={28} /></div>
        <div className="relative z-10 max-w-xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-coral-500">Connected workspace</p>
          <h1 className="mt-1 font-serif text-4xl font-bold tracking-tight text-violet-950 sm:text-5xl dark:text-violet-50">Integrations</h1>
          <p className="mt-2 max-w-lg text-sm leading-6 text-violet-600 dark:text-violet-200">Keep useful tools, links, notes and PDFs organized in your own familiar folder structure.</p>
          <button onClick={newFolder} className="mt-5 flex items-center gap-2 rounded-2xl bg-coral-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(255,128,102,0.22)] transition hover:-translate-y-0.5 hover:bg-coral-600">
            <FolderPlus size={17} /> New folder
          </button>
        </div>
      </section>

      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {workspace.folders.length === 0 ? (
        <EmptyState
          icon={FolderPlus}
          title="Create your first integration folder"
          description="Use folders for services, projects, environments or any structure that makes sense to you."
          action={<button onClick={newFolder} className="font-semibold text-violet-600 hover:text-violet-700">Create a folder</button>}
        />
      ) : (
        <div onDragEnter={dragOver} onDragOver={dragOver} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragActive(false); }} onDrop={(event) => void dropPdf(event)} className="relative flex min-h-[620px] flex-col overflow-hidden rounded-[24px] border border-violet-100 bg-white shadow-[0_12px_36px_rgba(82,65,168,0.08)] dark:border-violet-800 dark:bg-[#211b35]">
          {(dragActive || uploadingDrop) && <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center border-2 border-dashed border-violet-400 bg-violet-100/90 text-center backdrop-blur-sm dark:bg-violet-950/90"><div><img src="/pini-mascot.png" alt="" className="mx-auto mb-2 max-h-28 w-auto drop-shadow-[0_9px_9px_rgba(69,35,104,0.2)]" /><UploadCloud size={24} className="mx-auto mb-2 text-coral-500" /><p className="font-serif text-xl font-semibold text-violet-950 dark:text-white">{uploadingDrop ? 'Pini is adding your PDF…' : `Drop PDF into ${selectedFolder?.name ?? 'this folder'}`}</p><p className="mt-1 text-xs text-violet-500 dark:text-violet-300">It will be searchable with the rest of your workspace.</p></div></div>}
          <div className="flex min-h-14 items-center gap-2 border-b border-violet-100 bg-[#fffdf9] px-4 dark:border-violet-800 dark:bg-[#1d1830]">
            <HardDrive size={17} className="shrink-0 text-violet-400" />
            <div className="flex min-w-0 flex-1 items-center overflow-x-auto rounded-xl border border-violet-100 bg-white px-3 py-2 text-xs shadow-inner dark:border-violet-800 dark:bg-[#28213e]">
              <span className="shrink-0 font-semibold text-violet-500">Peanut</span>
              {selectedPath.map((folder) => (
                <span key={folder.id} className="flex shrink-0 items-center">
                  <ChevronRight size={14} className="mx-1 text-violet-300" />
                  <button onClick={() => setSelectedId(folder.id)} className="font-medium text-violet-700 hover:text-violet-950 dark:text-violet-200 dark:hover:text-white">{folder.name}</button>
                </span>
              ))}
            </div>
            <button onClick={newFolder} aria-label="New folder" className="rounded-xl border border-violet-100 bg-white p-2 text-violet-500 hover:bg-violet-50 dark:border-violet-800 dark:bg-[#28213e] dark:hover:bg-violet-900/40"><FolderPlus size={17} /></button>
          </div>

          <div className="grid flex-1 grid-cols-1 sm:grid-cols-[220px_minmax(0,1fr)] lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="max-h-64 overflow-auto border-b border-violet-100 bg-violet-50/60 p-3 dark:border-violet-800 dark:bg-violet-950/50 sm:max-h-none sm:border-b-0 sm:border-r">
            <div className="mb-2 flex items-center gap-2 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-400"><FolderOpen size={14} /> Folders</div>
            {folderOptions.map((folder) => (
              <button
                key={folder.id}
                onClick={() => setSelectedId(folder.id)}
                className={`mb-1 flex w-full items-center gap-2 rounded-xl py-2.5 pr-3 text-left text-sm transition ${selectedId === folder.id ? 'bg-white font-semibold text-violet-800 shadow-sm ring-1 ring-violet-100' : 'text-violet-600 hover:bg-white/70'}`}
                style={{ paddingLeft: `${12 + folder.depth * 18}px` }}
              >
                <Folder size={17} className={selectedId === folder.id ? 'fill-amber-200 text-amber-500' : 'fill-amber-100 text-amber-400 dark:fill-amber-900/40'} />
                <span className="truncate">{folder.name}</span>
              </button>
            ))}
          </aside>

          <section className="min-w-0 p-4 sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-violet-100 pb-5 dark:border-violet-800">
              <div>
                <h2 className="text-lg font-semibold text-violet-950">{selectedFolder?.name}</h2>
                <p className="mt-1 text-xs text-violet-400">{childFolders.length} {childFolders.length === 1 ? 'folder' : 'folders'} · {selectedEntries.length} {selectedEntries.length === 1 ? 'item' : 'items'}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={newEntry} className="flex items-center gap-2 rounded-xl bg-violet-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-violet-700"><Plus size={14} /> Add item</button>
                {selectedFolder && <button onClick={() => editFolder(selectedFolder)} aria-label="Edit folder" className="rounded-xl p-2 text-violet-300 hover:bg-violet-50 hover:text-violet-600"><Pencil size={16} /></button>}
                <button onClick={() => void removeFolder()} aria-label="Delete folder" className="rounded-xl p-2 text-violet-300 hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button>
              </div>
            </div>

            {selectedEntries.length === 0 && childFolders.length === 0 ? (
              <div className="flex min-h-80 flex-col items-center justify-center text-center">
                <div className="mb-4 rounded-2xl bg-teal-50 p-3 text-teal-600"><Link2 size={22} /></div>
                <p className="text-sm font-semibold text-violet-900">This folder is ready</p>
                <p className="mt-1 text-xs text-violet-400">Add a useful link, PDF, tool or subfolder.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {childFolders.map((folder) => (
                  <button key={folder.id} onClick={() => setSelectedId(folder.id)} className="group flex min-h-24 items-center gap-4 rounded-2xl border border-violet-100 bg-[#fffdf9] p-5 text-left transition hover:-translate-y-0.5 hover:border-amber-200 hover:shadow-[0_8px_24px_rgba(82,65,168,0.10)] dark:border-violet-800 dark:bg-[#28213e] dark:hover:border-amber-700/60">
                    <Folder size={38} className="shrink-0 fill-amber-200 text-amber-500 transition group-hover:scale-105 dark:fill-amber-900/50 dark:text-amber-400" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-violet-950 dark:text-violet-50">{folder.name}</span>
                      <span className="mt-1 block text-[11px] text-violet-400">File folder</span>
                    </span>
                  </button>
                ))}
                {selectedEntries.map((entry) => (
                  <article key={entry.id} className="group rounded-2xl border border-violet-100 bg-[#fffdf9] p-5 transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(82,65,168,0.10)] dark:border-violet-800 dark:bg-[#28213e]">
                    <div className="flex items-start gap-3">
                      <div className={`rounded-xl p-2.5 ${entry.attachment ? 'bg-red-50 text-red-500' : 'bg-teal-50 text-teal-600'}`}>{entry.attachment ? <FileText size={17} /> : <Link2 size={17} />}</div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-semibold text-violet-950">{entry.title}</h3>
                        {entry.description && <p className="mt-1.5 line-clamp-3 text-xs leading-5 text-violet-500">{entry.description}</p>}
                        {entry.attachment && <p className="mt-2 truncate text-[10px] font-medium text-violet-400">{entry.attachment.originalFilename} · {(entry.attachment.fileSize / 1024 / 1024).toFixed(1)} MB</p>}
                      </div>
                      <div className="flex gap-2 opacity-0 transition group-hover:opacity-100"><button onClick={() => editEntry(entry)} aria-label={`Edit ${entry.title}`} className="text-violet-300 hover:text-violet-600"><Pencil size={14} /></button><button onClick={() => void removeEntry(entry)} aria-label={`Delete ${entry.title}`} className="text-violet-200 hover:text-red-500"><Trash2 size={14} /></button></div>
                    </div>
                    {entry.url && <a href={entry.url} target="_blank" rel="noreferrer" className="mt-4 flex items-center gap-1.5 truncate text-xs font-semibold text-coral-600 hover:underline"><ExternalLink size={13} /> {entry.url}</a>}
                    {entry.attachment && <Link to={`/integrations/pdf/${entry.id}`} className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-coral-600 hover:underline"><ExternalLink size={13} /> Open PDF</Link>}
                  </article>
                ))}
              </div>
            )}
          </section>
          </div>
        </div>
      )}

      {folderOpen && (
        <Modal title={editingFolder ? 'Edit folder' : 'New folder'} onClose={() => { setFolderOpen(false); setEditingFolder(null); }}>
          <form onSubmit={(event) => void createFolder(event)} className="space-y-4">
            <Field label="Folder name" name="name" defaultValue={editingFolder?.name ?? ''} autoFocus required />
            <label className="block"><span className="mb-1.5 block text-xs font-semibold text-violet-600">Inside folder</span><select name="parentId" defaultValue={editingFolder ? editingFolder.parentId ?? '' : selectedId ?? ''} className="h-10 w-full rounded-xl border border-violet-200 bg-white px-3 text-sm text-violet-900 outline-none focus:border-violet-400"><option value="">Top level</option>{folderOptions.filter((folder) => folder.id !== editingFolder?.id).map((folder) => <option key={folder.id} value={folder.id}>{'— '.repeat(folder.depth)}{folder.name}</option>)}</select></label>
            <Actions cancel={() => { setFolderOpen(false); setEditingFolder(null); }} label={editingFolder ? 'Save changes' : 'Create folder'} />
          </form>
        </Modal>
      )}

      {entryOpen && selectedFolder && (
        <Modal title={editingEntry ? `Edit ${editingEntry.title}` : `Add to ${selectedFolder.name}`} onClose={() => { setEntryOpen(false); setEditingEntry(null); }}>
          <form onSubmit={(event) => void createEntry(event)} className="space-y-4">
            <Field label="Name" name="title" defaultValue={editingEntry?.title ?? ''} autoFocus placeholder="Optional when adding a PDF" />
            <Field label="URL (optional)" name="url" defaultValue={editingEntry?.url ?? ''} type="url" placeholder="https://…" />
            <label className="block"><span className="mb-1.5 block text-xs font-semibold text-violet-600">Folder</span><select name="folderId" defaultValue={editingEntry?.folderId ?? selectedId ?? ''} className="h-10 w-full rounded-xl border border-violet-200 bg-white px-3 text-sm text-violet-900 outline-none focus:border-violet-400">{folderOptions.map((folder) => <option key={folder.id} value={folder.id}>{'— '.repeat(folder.depth)}{folder.name}</option>)}</select></label>
            {!editingEntry && <label className="block"><span className="mb-1.5 block text-xs font-semibold text-violet-600">PDF (optional)</span><input name="file" type="file" accept="application/pdf,.pdf" className="block w-full rounded-xl border border-violet-200 bg-violet-50/50 px-3 py-2 text-xs text-violet-600 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-200 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-violet-700" /><span className="mt-1 block text-[10px] text-violet-400">Maximum 50 MB. If selected, the item will be saved as a PDF attachment.</span></label>}
            <label className="block"><span className="mb-1.5 block text-xs font-semibold text-violet-600">Description or notes</span><textarea name="description" defaultValue={editingEntry?.description ?? ''} rows={5} className="w-full resize-none rounded-xl border border-violet-200 px-3 py-2 text-sm text-violet-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" /></label>
            <Actions cancel={() => { setEntryOpen(false); setEditingEntry(null); }} label={editingEntry ? 'Save changes' : 'Add item'} />
          </form>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-violet-950/35 p-6 backdrop-blur-[1px]"><div className="w-full max-w-md rounded-2xl border border-violet-100 bg-white p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between"><h2 className="text-base font-semibold text-violet-950">{title}</h2><button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-violet-300 hover:bg-violet-50 hover:text-violet-600"><X size={17} /></button></div>{children}</div></div>;
}

function Field(props: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...inputProps } = props;
  return <label className="block"><span className="mb-1.5 block text-xs font-semibold text-violet-600">{label}</span><input {...inputProps} className="h-10 w-full rounded-xl border border-violet-200 px-3 text-sm text-violet-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" /></label>;
}

function Actions({ cancel, label }: { cancel: () => void; label: string }) {
  return <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={cancel} className="rounded-xl border border-violet-200 px-4 py-2 text-xs font-semibold text-violet-600 hover:bg-violet-50">Cancel</button><button className="rounded-xl bg-coral-500 px-4 py-2 text-xs font-semibold text-white hover:bg-coral-600">{label}</button></div>;
}
