import { useEffect, useState } from 'react';
import type { DocumentRecord } from '@apotheke/contracts';
import { ArrowLeft, Download, FileSearch, FileText, Image as ImageIcon, Tag, Trash2 } from 'lucide-react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { formatBytes, formatDate } from '../../lib/format';
import { announceWorkspaceChange } from '../../lib/workspaceEvents';

interface ViewerResponse {
  document: DocumentRecord;
  extractedText: string;
}

export function DocumentViewerPage() {
  const { documentId = '' } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const searchQuery = params.get('q')?.trim() ?? '';
  const [data, setData] = useState<ViewerResponse | null>(null);
  const [error, setError] = useState('');
  const [pdfMode, setPdfMode] = useState<'pdf' | 'text'>(() => searchQuery ? 'text' : 'pdf');

  useEffect(() => {
    void api<ViewerResponse>(`/documents/${documentId}`)
      .then(setData)
      .catch((reason: Error) => setError(reason.message));
  }, [documentId]);

  if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>;
  if (!data) return <div className="text-sm text-violet-400">Loading document…</div>;

  const { document, extractedText } = data;
  const fileUrl = `/api/documents/${document.id}/file`;
  const extension = document.currentVersion.originalFilename.split('.').pop()?.toLowerCase() ?? '';
  const isPdf = extension === 'pdf' || document.currentVersion.mimeType === 'application/pdf';
  const isImage = document.currentVersion.mimeType.startsWith('image/');

  async function remove() {
    if (!window.confirm(`Delete “${document.title}” permanently?`)) return;
    try {
      await api(`/documents/${document.id}`, { method: 'DELETE' });
      announceWorkspaceChange('documents', 'categories');
      navigate(isImage ? '/images' : '/documents', { replace: true });
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  return (
    <div className="overflow-hidden rounded-[24px] border border-violet-100 bg-white shadow-[0_12px_36px_rgba(82,65,168,0.09)] dark:border-violet-800 dark:bg-[#211b35]">
      <header className="flex flex-wrap items-center gap-3 border-b border-violet-100 bg-[#fffdf9] px-4 py-3 dark:border-violet-800 dark:bg-[#1d1830] sm:px-5">
        <Link to="/documents" className="rounded-xl p-2 text-violet-400 hover:bg-violet-100 hover:text-violet-700 dark:hover:bg-violet-900 dark:hover:text-white" aria-label="Back to documents"><ArrowLeft size={18} /></Link>
        <div className={`rounded-xl p-2.5 ${isPdf ? 'bg-red-50 text-red-500 dark:bg-red-950' : isImage ? 'bg-fuchsia-50 text-fuchsia-500 dark:bg-fuchsia-950' : 'bg-violet-100 text-violet-600 dark:bg-violet-900 dark:text-violet-300'}`}>{isImage ? <ImageIcon size={18} /> : <FileText size={18} />}</div>
        <div className="min-w-0 flex-1"><h1 className="truncate text-sm font-semibold text-violet-950 dark:text-violet-50">{document.title}</h1><p className="truncate text-[10px] text-violet-400">{document.currentVersion.originalFilename} · {formatBytes(document.currentVersion.fileSize)}</p></div>
        <button onClick={() => void remove()} aria-label={`Delete ${document.title}`} className="rounded-xl p-2.5 text-violet-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"><Trash2 size={16} /></button>
        <a href={fileUrl} download={document.currentVersion.originalFilename} className="flex items-center gap-2 rounded-xl bg-coral-500 px-3.5 py-2 text-xs font-semibold text-white hover:bg-coral-600"><Download size={14} /> Download</a>
      </header>

      <div className="grid min-h-[calc(100vh-12rem)] grid-cols-1 lg:grid-cols-[minmax(0,1fr)_260px]">
        <main className="relative min-h-[640px] bg-violet-950/5 dark:bg-[#171329]">
          {isPdf && <div className="sticky top-2 z-10 mx-auto flex w-fit rounded-full border border-violet-100 bg-white/90 p-1 shadow-md backdrop-blur dark:border-violet-700 dark:bg-[#211b35]/90"><button onClick={() => setPdfMode('pdf')} className={`rounded-full px-3 py-1.5 text-[10px] font-semibold ${pdfMode === 'pdf' ? 'bg-violet-600 text-white' : 'text-violet-400'}`}>PDF</button><button onClick={() => setPdfMode('text')} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-semibold ${pdfMode === 'text' ? 'bg-violet-600 text-white' : 'text-violet-400'}`}><FileSearch size={12} /> Searchable text</button></div>}
          {isImage ? (
            <div className="flex min-h-[640px] items-center justify-center p-5 sm:p-8"><img src={fileUrl} alt={document.title} className="max-h-[calc(100vh-15rem)] max-w-full rounded-xl object-contain shadow-[0_16px_50px_rgba(35,24,75,0.2)]" /></div>
          ) : isPdf && pdfMode === 'pdf' ? (
            <iframe title={document.title} src={fileUrl} className="h-full min-h-[640px] w-full border-0 bg-slate-700" />
          ) : (
            <div className="mx-auto my-6 min-h-[600px] max-w-4xl rounded-lg bg-white px-7 py-9 text-sm leading-7 text-violet-900 shadow-[0_8px_30px_rgba(41,31,85,0.12)] dark:bg-[#28213e] dark:text-violet-100 sm:px-12">
              <h2 className="mb-7 font-serif text-2xl font-semibold">{document.title}</h2>
              {searchQuery && <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">Highlighted matches for <strong>“{searchQuery}”</strong></div>}
              <pre className="whitespace-pre-wrap break-words font-sans"><HighlightedText text={extractedText || 'No readable text was extracted from this document.'} query={searchQuery} /></pre>
            </div>
          )}
        </main>

        <aside className="border-t border-violet-100 bg-violet-50/50 p-5 dark:border-violet-800 dark:bg-violet-950/30 lg:border-l lg:border-t-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-coral-500">Document details</p>
          <dl className="mt-5 space-y-4 text-xs"><Detail label="Type" value={extension.toUpperCase() || document.currentVersion.mimeType} /><Detail label="Version" value={document.currentVersion.label} /><Detail label="Category" value={document.category?.name ?? 'Uncategorized'} /><Detail label="Imported" value={formatDate(document.currentVersion.importedAt)} /><Detail label="Size" value={formatBytes(document.currentVersion.fileSize)} /></dl>
          {document.tags.length > 0 && <div className="mt-6 border-t border-violet-100 pt-5 dark:border-violet-800"><p className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-violet-400"><Tag size={13} /> Tags</p><div className="flex flex-wrap gap-2">{document.tags.map((tag) => <span key={tag.id} className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-violet-500 shadow-sm dark:bg-violet-900 dark:text-violet-200">{tag.name}</span>)}</div></div>}
        </aside>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-[10px] font-semibold uppercase tracking-wide text-violet-400">{label}</dt><dd className="mt-1 break-words font-medium text-violet-800 dark:text-violet-200">{value}</dd></div>;
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query) return text;
  const terms = Array.from(query.matchAll(/"([^"]+)"|([^\s]+)/g))
    .map((match) => ({ value: (match[1] ?? match[2] ?? '').trim(), exact: Boolean(match[1]) }))
    .filter(({ value }) => value && !['AND', 'OR', 'NOT'].includes(value.toUpperCase()));
  if (terms.length === 0) return text;
  const escaped = terms.map(({ value, exact }) => {
    const safe = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return exact ? safe : `${safe}[\\p{L}\\p{N}_-]*`;
  });
  const matcher = new RegExp(`(${escaped.join('|')})`, 'giu');
  const matchPart = new RegExp(`^(?:${escaped.join('|')})$`, 'iu');
  return text.split(matcher).map((part, index) => matchPart.test(part)
    ? <mark key={index} className="rounded bg-amber-200 px-0.5 text-violet-950 dark:bg-amber-500/70 dark:text-white">{part}</mark>
    : part);
}
