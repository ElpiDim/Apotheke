import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type InputHTMLAttributes } from 'react';
import type { DocumentRecord } from '@apotheke/contracts';
import { ChevronLeft, ChevronRight, FilePlus2, FileText, MoreHorizontal, Plus, Search, Star, X } from 'lucide-react';
import { EmptyState } from '../../components/EmptyState';
import { api, ApiError } from '../../lib/api';
import { formatBytes, formatDate } from '../../lib/format';

type FileFilter = 'all' | 'pdf' | 'docx' | 'text' | 'markdown';
type SortMode = 'updated' | 'name';

function extensionOf(document: DocumentRecord): string {
  return document.currentVersion.originalFilename.split('.').pop()?.toLowerCase() ?? '';
}

export function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FileFilter>('all');
  const [sort, setSort] = useState<SortMode>('updated');
  const [page, setPage] = useState(1);
  const pageSize = 6;

  const load = useCallback(async () => {
    try {
      const result = await api<{ documents: DocumentRecord[] }>('/documents');
      setDocuments(result.documents);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    const values = documents.filter((document) => {
      const extension = extensionOf(document);
      const matchesType = filter === 'all'
        || filter === 'text' && extension === 'txt'
        || filter === 'markdown' && ['md', 'markdown'].includes(extension)
        || extension === filter;
      const haystack = [document.title, document.currentVersion.originalFilename, document.category?.name, ...document.tags.map((tag) => tag.name)].filter(Boolean).join(' ').toLocaleLowerCase();
      return matchesType && (!needle || haystack.includes(needle));
    });
    return values.sort((a, b) => sort === 'name' ? a.title.localeCompare(b.title) : b.updatedAt.localeCompare(a.updatedAt));
  }, [documents, filter, query, sort]);

  useEffect(() => { setPage(1); }, [filter, query, sort]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div>
      <section className="relative mb-4 min-h-44 overflow-visible px-5 py-5 sm:px-6 sm:py-6 lg:px-8">
        <div className="documents-title-blob" />
        <div className="absolute left-[390px] top-1 hidden h-11 w-11 rounded-full bg-teal-200 shadow-lg xl:block" />
        <div className="absolute left-[430px] top-[142px] hidden h-1 w-16 rotate-[-18deg] rounded-full bg-coral-500 xl:block" />
        <div className="relative z-10">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-coral-600">Your library</p>
          <h1 className="font-serif text-4xl font-semibold tracking-[-0.035em] text-violet-950 dark:text-violet-50 lg:text-5xl">Documents</h1>
          <p className="mt-2 max-w-lg text-sm text-violet-600 dark:text-violet-300">Find, organize and manage all your documents in one place.</p>
          <button onClick={() => setImportOpen(true)} className="mt-5 flex items-center gap-2 rounded-2xl bg-coral-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(255,128,102,0.28)] transition hover:-translate-y-1 hover:bg-coral-600"><Plus size={16} /> Import document</button>
        </div>
      </section>

      {!loading && documents.length === 0 ? (
        <EmptyState icon={FilePlus2} title="No documents yet" description="Import a PDF, DOCX, TXT or Markdown file. Apotheke will extract its text locally and make it searchable." action={<button onClick={() => setImportOpen(true)} className="text-sm font-semibold text-violet-600 hover:text-coral-600">Import your first document</button>} />
      ) : (
        <>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {([
                ['all', 'All'], ['docx', 'Documents'], ['pdf', 'PDFs'], ['text', 'Text'], ['markdown', 'Markdown'],
              ] as [FileFilter, string][]).map(([value, label]) => <button key={value} onClick={() => setFilter(value)} className={`rounded-xl border px-3 py-2 text-xs font-semibold ${filter === value ? 'border-violet-600 bg-violet-600 text-white shadow-sm' : 'border-violet-100 bg-white text-violet-500 hover:border-violet-200 hover:text-violet-700 dark:border-violet-700 dark:bg-[#211b35] dark:text-violet-300'}`}><span>{label}</span></button>)}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="relative min-w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-violet-300" size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search documents…" className="h-10 w-full rounded-xl border border-violet-200 bg-white pl-9 pr-3 text-xs text-violet-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-violet-700 dark:bg-[#211b35] dark:text-violet-100" /></label>
              <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)} className="h-10 rounded-xl border border-violet-200 bg-white px-3 text-xs font-semibold text-violet-600 outline-none dark:border-violet-700 dark:bg-[#211b35] dark:text-violet-200"><option value="updated">Last updated</option><option value="name">Name A–Z</option></select>
            </div>
          </div>

          {visible.length === 0 ? <EmptyState icon={Search} title="No matching documents" description="Try another search term or file type." /> : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((document) => <DocumentCard key={document.id} document={document} />)}
            </div>
          )}

          <div className="mt-6 flex flex-col items-center justify-between gap-4 text-xs text-violet-500 sm:flex-row dark:text-violet-300">
            <span>Showing {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length} documents</span>
            <div className="flex items-center gap-2"><button disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="rounded-xl border border-violet-200 bg-white p-2 disabled:opacity-30 dark:border-violet-700 dark:bg-[#211b35]"><ChevronLeft size={15} /></button>{Array.from({ length: pageCount }, (_, index) => index + 1).slice(0, 5).map((value) => <button key={value} onClick={() => setPage(value)} className={`h-9 w-9 rounded-xl font-semibold ${page === value ? 'bg-violet-100 text-violet-700 dark:bg-violet-700 dark:text-white' : 'hover:bg-violet-50 dark:hover:bg-violet-900'}`}>{value}</button>)}<button disabled={page === pageCount} onClick={() => setPage((value) => value + 1)} className="rounded-xl border border-violet-200 bg-white p-2 disabled:opacity-30 dark:border-violet-700 dark:bg-[#211b35]"><ChevronRight size={15} /></button></div>
          </div>
        </>
      )}

      {importOpen && <ImportDialog onClose={() => setImportOpen(false)} onImported={() => { setImportOpen(false); void load(); }} />}
    </div>
  );
}

function DocumentCard({ document }: { document: DocumentRecord }) {
  const extension = extensionOf(document);
  const tone = extension === 'pdf' ? 'bg-red-50 text-red-500 dark:bg-red-950' : extension === 'txt' || extension === 'md' ? 'bg-teal-50 text-teal-600 dark:bg-teal-950' : 'bg-violet-100 text-violet-600 dark:bg-violet-900 dark:text-violet-300';
  return <article className="group rounded-2xl border border-violet-100 bg-white p-5 shadow-[0_6px_20px_rgba(82,65,168,0.05)] transition hover:-translate-y-1 hover:border-violet-200 hover:shadow-[0_12px_28px_rgba(82,65,168,0.10)] dark:border-violet-800 dark:bg-[#211b35] dark:hover:border-violet-600"><div className="flex items-start gap-3"><div className={`rounded-xl p-2.5 ${tone}`}><FileText size={18} /></div><div className="min-w-0 flex-1"><h2 className="truncate text-sm font-semibold text-violet-950 dark:text-violet-50">{document.title}</h2><p className="mt-1 truncate text-[10px] text-violet-400">{extension.toUpperCase() || 'Document'} · {document.category?.name ?? 'Uncategorized'}</p></div><button aria-label="More options" className="text-violet-300 opacity-0 transition group-hover:opacity-100"><MoreHorizontal size={16} /></button></div><div className="mt-5 flex flex-wrap gap-1.5">{document.tags.slice(0, 3).map((tag) => <span key={tag.id} className="rounded-full bg-violet-50 px-2 py-1 text-[9px] font-medium text-violet-500 dark:bg-violet-900 dark:text-violet-300">{tag.name}</span>)}</div><div className="mt-5 flex items-center border-t border-violet-100 pt-3 text-[10px] text-violet-400 dark:border-violet-800"><span>{formatDate(document.currentVersion.importedAt)}</span><span className="ml-2">· {formatBytes(document.currentVersion.fileSize)}</span><Star size={14} className="ml-auto transition hover:fill-amber-300 hover:text-amber-400" /></div></article>;
}

function ImportDialog({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = fileRef.current?.files?.[0];
    if (!file) { setError('Choose a file to import.'); return; }
    setSaving(true);
    setError(null);
    const values = new FormData(form);
    values.set('file', file);
    try { await api('/documents/import', { method: 'POST', body: values }); onImported(); }
    catch (caught) { setError(caught instanceof ApiError ? caught.message : 'The document could not be imported.'); }
    finally { setSaving(false); }
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-violet-950/40 p-4 backdrop-blur-sm"><div className="w-full max-w-lg rounded-2xl border border-violet-100 bg-white shadow-2xl dark:border-violet-700 dark:bg-[#211b35]"><div className="flex items-start justify-between border-b border-violet-100 px-6 py-5 dark:border-violet-800"><div><h2 className="font-serif text-xl font-semibold text-violet-950 dark:text-violet-50">Import document</h2><p className="mt-1 text-xs text-violet-500 dark:text-violet-300">PDF, DOCX, TXT or Markdown · maximum 50 MB</p></div><button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900"><X size={18} /></button></div><form onSubmit={submit} className="space-y-4 p-6"><label className="block"><span className="mb-1.5 block text-xs font-semibold text-violet-600 dark:text-violet-300">File</span><input ref={fileRef} name="file" type="file" accept=".pdf,.docx,.txt,.md,.markdown" className="block w-full rounded-xl border border-violet-200 bg-violet-50/50 px-3 py-2 text-xs text-violet-600 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-200 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-violet-700 dark:border-violet-700 dark:bg-violet-950 dark:text-violet-300" /></label><div className="grid grid-cols-[1fr_100px] gap-4"><Field label="Title" name="title" placeholder="Defaults to filename" /><Field label="Version" name="version" defaultValue="1.0" /></div><Field label="Category" name="category" placeholder="e.g. SDK" /><Field label="Tags" name="tags" placeholder="API, wallet, integration" hint="Separate tags with commas." />{error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}<div className="flex justify-end gap-2 pt-2"><button type="button" onClick={onClose} className="rounded-xl border border-violet-200 px-4 py-2 text-xs font-semibold text-violet-600 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-300 dark:hover:bg-violet-900">Cancel</button><button disabled={saving} className="rounded-xl bg-coral-500 px-4 py-2 text-xs font-semibold text-white hover:bg-coral-600 disabled:opacity-50">{saving ? 'Importing…' : 'Import document'}</button></div></form></div></div>;
}

function Field({ label, hint, ...props }: { label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return <label className="block"><span className="mb-1.5 block text-xs font-semibold text-violet-600 dark:text-violet-300">{label}</span><input {...props} className="h-10 w-full rounded-xl border border-violet-200 px-3 text-sm text-violet-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-violet-700 dark:bg-violet-950 dark:text-violet-100" />{hint && <span className="mt-1 block text-[11px] text-violet-400">{hint}</span>}</label>;
}
