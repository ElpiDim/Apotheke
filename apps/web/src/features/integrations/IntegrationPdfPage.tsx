import { useEffect, useState } from 'react';
import type { IntegrationEntry } from '@apotheke/contracts';
import { ArrowLeft, Download, FileText } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../lib/api';

export function IntegrationPdfPage() {
  const { entryId = '' } = useParams();
  const [entry, setEntry] = useState<IntegrationEntry | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    void api<{ entries: IntegrationEntry[] }>('/integrations')
      .then((result) => {
        const match = result.entries.find((item) => item.id === entryId && item.attachment);
        if (!match) throw new Error('PDF not found.');
        setEntry(match);
      })
      .catch((reason: Error) => setError(reason.message));
  }, [entryId]);

  if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>;
  if (!entry) return <div className="text-sm text-violet-400">Loading PDF…</div>;

  const pdfUrl = `/api/integrations/entries/${entry.id}/pdf`;
  return (
    <div className="-m-8 flex h-[calc(100vh-4rem)] min-h-[640px] flex-col bg-violet-950">
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-violet-800 bg-violet-950 px-5 text-white">
        <Link to={`/integrations?folder=${entry.folderId}`} className="rounded-xl p-2 text-violet-300 hover:bg-violet-800 hover:text-white" aria-label="Back to integrations"><ArrowLeft size={18} /></Link>
        <div className="rounded-xl bg-red-500/15 p-2 text-red-300"><FileText size={17} /></div>
        <div className="min-w-0 flex-1"><h1 className="truncate text-sm font-semibold">{entry.title}</h1><p className="truncate text-[10px] text-violet-400">{entry.attachment?.originalFilename}</p></div>
        <a href={pdfUrl} download={entry.attachment?.originalFilename} className="flex items-center gap-2 rounded-xl bg-coral-500 px-3.5 py-2 text-xs font-semibold text-white hover:bg-coral-600"><Download size={14} /> Download</a>
      </header>
      <iframe title={entry.title} src={pdfUrl} className="min-h-0 w-full flex-1 border-0 bg-slate-700" />
    </div>
  );
}
