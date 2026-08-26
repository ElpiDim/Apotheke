import { useEffect, useState } from 'react';
import type { IntegrationEntry } from '@apotheke/contracts';
import { ArrowLeft, Download, FileText, Maximize2, Minimize2 } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../lib/api';

export function IntegrationPdfPage() {
  const { entryId = '' } = useParams();
  const [entry, setEntry] = useState<IntegrationEntry | null>(null);
  const [error, setError] = useState('');
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    void api<{ entries: IntegrationEntry[] }>('/integrations')
      .then((result) => {
        const match = result.entries.find((item) => item.id === entryId && item.attachment);
        if (!match) throw new Error('PDF not found.');
        setEntry(match);
      })
      .catch((reason: Error) => setError(reason.message));
  }, [entryId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFullscreen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>;
  if (!entry) return <div className="text-sm text-violet-400">Loading PDF…</div>;

  const pdfUrl = `/api/integrations/entries/${entry.id}/pdf`;
  return (
    <div className={`fixed bottom-0 right-0 top-0 z-50 flex min-h-0 flex-col overflow-hidden bg-violet-950 ${fullscreen ? 'left-0' : 'left-0 sm:left-60'}`}>
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-violet-800 bg-violet-950 px-3 text-white sm:px-4">
        <Link to={`/integrations?folder=${entry.folderId}`} className="rounded-lg p-1.5 text-violet-300 hover:bg-violet-800 hover:text-white" aria-label="Back to folder"><ArrowLeft size={17} /></Link>
        <div className="rounded-lg bg-red-500/15 p-1.5 text-red-300"><FileText size={15} /></div>
        <div className="min-w-0 flex-1"><h1 className="truncate text-sm font-semibold">{entry.title}</h1><p className="truncate text-[10px] text-violet-400">{entry.attachment?.originalFilename}</p></div>
        <button onClick={() => setFullscreen((value) => !value)} className="rounded-lg p-2 text-violet-300 hover:bg-violet-800 hover:text-white" aria-label={fullscreen ? 'Show sidebar' : 'Use full screen'} title={fullscreen ? 'Show sidebar (Esc)' : 'Full screen'}>{fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</button>
        <a href={pdfUrl} download={entry.attachment?.originalFilename} className="flex items-center gap-2 rounded-lg bg-coral-500 px-3 py-2 text-[11px] font-semibold text-white hover:bg-coral-600"><Download size={14} /><span className="hidden sm:inline">Download</span></a>
      </header>
      <iframe title={entry.title} src={`${pdfUrl}#view=FitH`} className="block h-0 min-h-0 w-full flex-1 border-0 bg-slate-700" />
    </div>
  );
}
