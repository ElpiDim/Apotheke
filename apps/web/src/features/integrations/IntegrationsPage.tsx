import { useEffect, useMemo, useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from 'react';
import type { IntegrationEntry, IntegrationFolder } from '@apotheke/contracts';
import { ExternalLink, FileText, Folder, FolderPlus, Link2, Plus, Trash2, X } from 'lucide-react';
import { EmptyState } from '../../components/EmptyState';
import { PageHeader } from '../../components/PageHeader';
import { api, jsonRequest } from '../../lib/api';

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
  const [workspace, setWorkspace] = useState<IntegrationWorkspace>({ folders: [], entries: [] });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [folderOpen, setFolderOpen] = useState(false);
  const [entryOpen, setEntryOpen] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const result = await api<IntegrationWorkspace>('/integrations');
    setWorkspace(result);
    setSelectedId((current) => current && result.folders.some((folder) => folder.id === current)
      ? current
      : result.folders[0]?.id ?? null);
  }

  useEffect(() => {
    void load().catch((reason: Error) => setError(reason.message));
  }, []);

  const folderOptions = useMemo(() => flattenFolders(workspace.folders), [workspace.folders]);
  const selectedFolder = workspace.folders.find((folder) => folder.id === selectedId) ?? null;
  const selectedEntries = workspace.entries.filter((entry) => entry.folderId === selectedId);

  async function createFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') ?? '').trim();
    if (!name) return;
    setError('');
    try {
      const result = await api<{ folder: IntegrationFolder }>('/integrations/folders', jsonRequest('POST', {
        name,
        parentId: form.get('parentId') || null,
      }));
      await load();
      setSelectedId(result.folder.id);
      setFolderOpen(false);
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
      if (file instanceof File && file.size > 0) {
        form.set('folderId', selectedId);
        await api('/integrations/pdf', { method: 'POST', body: form });
      } else {
        await api('/integrations/entries', jsonRequest('POST', {
          folderId: selectedId,
          title: String(form.get('title') ?? ''),
          description: String(form.get('description') ?? ''),
          url: String(form.get('url') ?? ''),
        }));
      }
      await load();
      setEntryOpen(false);
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  async function removeFolder() {
    if (!selectedFolder || !window.confirm(`Delete “${selectedFolder.name}” and everything inside it?`)) return;
    await api(`/integrations/folders/${selectedFolder.id}`, { method: 'DELETE' });
    await load();
  }

  async function removeEntry(entry: IntegrationEntry) {
    if (!window.confirm(`Delete “${entry.title}”?`)) return;
    await api(`/integrations/entries/${entry.id}`, { method: 'DELETE' });
    await load();
  }

  return (
    <div>
      <PageHeader
        eyebrow="Connected workspace"
        title="Integrations"
        description="Organize useful tools, links and integration notes in your own folder structure."
        action={(
          <button onClick={() => setFolderOpen(true)} className="flex items-center gap-2 rounded-xl bg-coral-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-coral-600">
            <FolderPlus size={16} /> New folder
          </button>
        )}
      />

      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {workspace.folders.length === 0 ? (
        <EmptyState
          icon={FolderPlus}
          title="Create your first integration folder"
          description="Use folders for services, projects, environments or any structure that makes sense to you."
          action={<button onClick={() => setFolderOpen(true)} className="font-semibold text-violet-600 hover:text-violet-700">Create a folder</button>}
        />
      ) : (
        <div className="grid min-h-[620px] grid-cols-[280px_minmax(0,1fr)] overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-[0_4px_18px_rgba(82,65,168,0.05)]">
          <aside className="border-r border-violet-100 bg-violet-50/60 p-3">
            <div className="mb-2 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-400">Folders</div>
            {folderOptions.map((folder) => (
              <button
                key={folder.id}
                onClick={() => setSelectedId(folder.id)}
                className={`mb-1 flex w-full items-center gap-2 rounded-xl py-2.5 pr-3 text-left text-sm transition ${selectedId === folder.id ? 'bg-white font-semibold text-violet-800 shadow-sm ring-1 ring-violet-100' : 'text-violet-600 hover:bg-white/70'}`}
                style={{ paddingLeft: `${12 + folder.depth * 18}px` }}
              >
                <Folder size={16} className={selectedId === folder.id ? 'text-coral-500' : 'text-violet-400'} />
                <span className="truncate">{folder.name}</span>
              </button>
            ))}
          </aside>

          <section className="min-w-0 p-6">
            <div className="mb-6 flex items-center justify-between border-b border-violet-100 pb-5">
              <div>
                <h2 className="text-lg font-semibold text-violet-950">{selectedFolder?.name}</h2>
                <p className="mt-1 text-xs text-violet-400">{selectedEntries.length} {selectedEntries.length === 1 ? 'item' : 'items'}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEntryOpen(true)} className="flex items-center gap-2 rounded-xl bg-violet-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-violet-700"><Plus size={14} /> Add item</button>
                <button onClick={() => void removeFolder()} aria-label="Delete folder" className="rounded-xl p-2 text-violet-300 hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button>
              </div>
            </div>

            {selectedEntries.length === 0 ? (
              <div className="flex min-h-80 flex-col items-center justify-center text-center">
                <div className="mb-4 rounded-2xl bg-teal-50 p-3 text-teal-600"><Link2 size={22} /></div>
                <p className="text-sm font-semibold text-violet-900">This folder is ready</p>
                <p className="mt-1 text-xs text-violet-400">Add a useful link, tool or note.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {selectedEntries.map((entry) => (
                  <article key={entry.id} className="group rounded-2xl border border-violet-100 bg-[#fffdf9] p-5 transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(82,65,168,0.10)]">
                    <div className="flex items-start gap-3">
                      <div className={`rounded-xl p-2.5 ${entry.attachment ? 'bg-red-50 text-red-500' : 'bg-teal-50 text-teal-600'}`}>{entry.attachment ? <FileText size={17} /> : <Link2 size={17} />}</div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-semibold text-violet-950">{entry.title}</h3>
                        {entry.description && <p className="mt-1.5 line-clamp-3 text-xs leading-5 text-violet-500">{entry.description}</p>}
                        {entry.attachment && <p className="mt-2 truncate text-[10px] font-medium text-violet-400">{entry.attachment.originalFilename} · {(entry.attachment.fileSize / 1024 / 1024).toFixed(1)} MB</p>}
                      </div>
                      <button onClick={() => void removeEntry(entry)} aria-label={`Delete ${entry.title}`} className="text-violet-200 opacity-0 transition hover:text-red-500 group-hover:opacity-100"><Trash2 size={14} /></button>
                    </div>
                    {entry.url && <a href={entry.url} target="_blank" rel="noreferrer" className="mt-4 flex items-center gap-1.5 truncate text-xs font-semibold text-coral-600 hover:underline"><ExternalLink size={13} /> {entry.url}</a>}
                    {entry.attachment && <a href={`/api/integrations/entries/${entry.id}/pdf`} target="_blank" rel="noreferrer" className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-coral-600 hover:underline"><ExternalLink size={13} /> Open PDF</a>}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {folderOpen && (
        <Modal title="New folder" onClose={() => setFolderOpen(false)}>
          <form onSubmit={(event) => void createFolder(event)} className="space-y-4">
            <Field label="Folder name" name="name" autoFocus required />
            <label className="block"><span className="mb-1.5 block text-xs font-semibold text-violet-600">Inside folder</span><select name="parentId" defaultValue={selectedId ?? ''} className="h-10 w-full rounded-xl border border-violet-200 bg-white px-3 text-sm text-violet-900 outline-none focus:border-violet-400"><option value="">Top level</option>{folderOptions.map((folder) => <option key={folder.id} value={folder.id}>{'— '.repeat(folder.depth)}{folder.name}</option>)}</select></label>
            <Actions cancel={() => setFolderOpen(false)} label="Create folder" />
          </form>
        </Modal>
      )}

      {entryOpen && selectedFolder && (
        <Modal title={`Add to ${selectedFolder.name}`} onClose={() => setEntryOpen(false)}>
          <form onSubmit={(event) => void createEntry(event)} className="space-y-4">
            <Field label="Name" name="title" autoFocus placeholder="Optional when adding a PDF" />
            <Field label="URL (optional)" name="url" type="url" placeholder="https://…" />
            <label className="block"><span className="mb-1.5 block text-xs font-semibold text-violet-600">PDF (optional)</span><input name="file" type="file" accept="application/pdf,.pdf" className="block w-full rounded-xl border border-violet-200 bg-violet-50/50 px-3 py-2 text-xs text-violet-600 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-200 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-violet-700" /><span className="mt-1 block text-[10px] text-violet-400">Maximum 50 MB. If selected, the item will be saved as a PDF attachment.</span></label>
            <label className="block"><span className="mb-1.5 block text-xs font-semibold text-violet-600">Description or notes</span><textarea name="description" rows={5} className="w-full resize-none rounded-xl border border-violet-200 px-3 py-2 text-sm text-violet-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" /></label>
            <Actions cancel={() => setEntryOpen(false)} label="Add item" />
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
