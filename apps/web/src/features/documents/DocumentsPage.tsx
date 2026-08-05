import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import type { DocumentRecord } from '@apotheke/contracts';
import { FilePlus2, FileText, Plus, X } from 'lucide-react';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { PageHeader } from '../../components/PageHeader';
import { api, ApiError } from '../../lib/api';
import { formatBytes, formatDate } from '../../lib/format';

export function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await api<{ documents: DocumentRecord[] }>('/documents');
      setDocuments(result.documents);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <>
      <PageHeader
        eyebrow="Library"
        title="Documents"
        description="Original files stay local. Apotheke indexes their text and metadata for fast retrieval."
        action={(
          <button onClick={() => setImportOpen(true)} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
            <Plus size={16} /> Import
          </button>
        )}
      />

      {!loading && documents.length === 0 ? (
        <EmptyState
          icon={FilePlus2}
          title="No documents yet"
          description="Import a PDF, DOCX, TXT or Markdown file. Apotheke will extract its text locally and make it searchable."
          action={<button onClick={() => setImportOpen(true)} className="text-sm font-semibold text-blue-600 hover:text-blue-700">Import your first document</button>}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="grid grid-cols-[minmax(260px,1.5fr)_0.7fr_0.8fr_0.55fr_0.65fr] border-b border-slate-200 bg-slate-50/70 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
            <span>Document</span><span>Category</span><span>Tags</span><span>Version</span><span>Imported</span>
          </div>
          <div className="divide-y divide-slate-100">
            {documents.map((document) => (
              <div key={document.id} className="grid grid-cols-[minmax(260px,1.5fr)_0.7fr_0.8fr_0.55fr_0.65fr] items-center px-5 py-3.5 text-sm hover:bg-slate-50/70">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="rounded-lg bg-blue-50 p-2 text-blue-600"><FileText size={17} /></div>
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold text-slate-800">{document.title}</div>
                    <div className="mt-0.5 flex gap-2 truncate text-[11px] text-slate-400">
                      <span className="truncate">{document.currentVersion.originalFilename}</span>
                      <span>·</span><span>{formatBytes(document.currentVersion.fileSize)}</span>
                    </div>
                  </div>
                </div>
                <div className="truncate pr-3 text-xs text-slate-600">{document.category?.name ?? <span className="text-slate-300">—</span>}</div>
                <div className="flex min-w-0 gap-1 overflow-hidden pr-3">
                  {document.tags.slice(0, 2).map((tag) => <Badge key={tag.id}>{tag.name}</Badge>)}
                  {document.tags.length > 2 && <span className="text-xs text-slate-400">+{document.tags.length - 2}</span>}
                </div>
                <div><Badge>v{document.currentVersion.label}</Badge></div>
                <div className="text-xs text-slate-400">{formatDate(document.currentVersion.importedAt)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {importOpen && <ImportDialog onClose={() => setImportOpen(false)} onImported={() => { setImportOpen(false); void load(); }} />}
    </>
  );
}

function ImportDialog({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError('Choose a file to import.');
      return;
    }

    setSaving(true);
    setError(null);
    const values = new FormData(form);
    values.set('file', file);
    try {
      await api('/documents/import', { method: 'POST', body: values });
      onImported();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'The document could not be imported.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-6 backdrop-blur-[1px]">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/15">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Import document</h2>
            <p className="mt-1 text-xs text-slate-500">PDF, DOCX, TXT or Markdown · maximum 50 MB</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="space-y-4 p-6">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">File</span>
            <input ref={fileRef} name="file" type="file" accept=".pdf,.docx,.txt,.md,.markdown" className="block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-200 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700" />
          </label>
          <div className="grid grid-cols-[1fr_110px] gap-4">
            <Field label="Title" name="title" placeholder="Defaults to filename" />
            <Field label="Version" name="version" defaultValue="1.0" />
          </div>
          <Field label="Category" name="category" placeholder="e.g. SDK" />
          <Field label="Tags" name="tags" placeholder="API, wallet, integration" hint="Separate tags with commas." />
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{saving ? 'Importing…' : 'Import document'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, hint, ...props }: { label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</span>
      <input {...props} className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
      {hint && <span className="mt-1 block text-[11px] text-slate-400">{hint}</span>}
    </label>
  );
}
