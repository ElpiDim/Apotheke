import { useEffect, useMemo, useState } from 'react';
import type { SearchResult } from '@peanut/contracts';
import { ArrowUpRight, FileText, FolderOpen, Image as ImageIcon, PlugZap, Search, Sparkles, StickyNote } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { PageHeader } from '../../components/PageHeader';
import { ApiImage } from '../../components/ApiImage';
import { api, ApiError } from '../../lib/api';
import { formatDate } from '../../lib/format';

export function SearchPage() {
  const [params] = useSearchParams();
  const query = params.get('q') ?? '';
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<SearchFilter>('all');

  const counts = useMemo(() => ({
    all: results.length,
    documents: results.filter((result) => result.entityType === 'document' && !result.mimeType?.startsWith('image/')).length,
    images: results.filter((result) => result.entityType === 'document' && result.mimeType?.startsWith('image/')).length,
    notes: results.filter((result) => result.entityType === 'note').length,
    integrations: results.filter((result) => result.entityType === 'integration').length,
    categories: results.filter((result) => result.entityType === 'category').length,
  }), [results]);
  const visibleResults = useMemo(() => results.filter((result) => filter === 'all'
    || filter === 'documents' && result.entityType === 'document' && !result.mimeType?.startsWith('image/')
    || filter === 'images' && result.entityType === 'document' && Boolean(result.mimeType?.startsWith('image/'))
    || filter === 'notes' && result.entityType === 'note'
    || filter === 'integrations' && result.entityType === 'integration'
    || filter === 'categories' && result.entityType === 'category'), [filter, results]);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }
    setLoading(true);
    setError(null);
    void api<{ query: string; results: SearchResult[] }>(`/search?q=${encodeURIComponent(query)}`)
      .then((response) => setResults(response.results))
      .catch((caught) => setError(caught instanceof ApiError ? caught.message : 'Search failed.'))
      .finally(() => setLoading(false));
  }, [query]);

  return (
    <div>
      <PageHeader eyebrow="Retrieval" title="Search" description="Search documents, notes, integrations, folder names and metadata from the search bar above." />

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-slate-400">
        <span><code className="text-slate-600">"exact phrase"</code> phrase</span>
        <span><code className="text-slate-600">AND</code> all terms</span>
        <span><code className="text-slate-600">OR</code> either term</span>
        <span><code className="text-slate-600">NOT</code> exclude following term</span>
      </div>

      {error && <div className="mt-6 max-w-3xl rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {query && !loading && !error && (
        <div className="mt-8">
          <div className="mb-4 text-xs font-medium text-violet-400">{results.length} {results.length === 1 ? 'result' : 'results'} for <span className="font-semibold text-violet-700 dark:text-violet-200">“{query}”</span></div>
          <div className="mb-5 flex flex-wrap gap-2">{searchFilters.map((item) => <button key={item.id} type="button" onClick={() => setFilter(item.id)} className={`rounded-full border px-3 py-2 text-[10px] font-bold transition ${filter === item.id ? 'border-violet-600 bg-violet-600 text-white shadow-sm' : 'border-violet-100 bg-white text-violet-500 hover:border-violet-300 dark:border-violet-800 dark:bg-[#211b35] dark:text-violet-300'}`}>{item.label} <span className={`ml-1 ${filter === item.id ? 'text-violet-200' : 'text-violet-300'}`}>{counts[item.id]}</span></button>)}</div>
          {results.length === 0 ? (
            <EmptyState icon={Search} title="No matches" description="Try fewer terms, an OR query, or remove a filter word." />
          ) : visibleResults.length === 0 ? (
            <EmptyState icon={Search} title={`No ${filter} matches`} description="Choose another filter to see the remaining search results." />
          ) : (
            <div className="max-w-5xl space-y-4">
              {visibleResults.map((result) => (
                <article key={`${result.entityType}-${result.entityId}`} className="rounded-2xl border border-violet-100 bg-white px-5 py-5 shadow-[0_6px_20px_rgba(82,65,168,0.05)] transition hover:border-violet-200 hover:shadow-[0_10px_26px_rgba(82,65,168,0.09)] dark:border-violet-800 dark:bg-[#211b35] dark:hover:border-violet-600">
                  {result.mimeType?.startsWith('image/') && <Link to={`/documents/${result.entityId}?q=${encodeURIComponent(query)}`} className="mb-5 block h-52 overflow-hidden rounded-xl bg-violet-50 dark:bg-violet-950"><ApiImage path={`/documents/${result.entityId}/file`} alt={result.title} className="h-full w-full object-contain transition duration-300 hover:scale-[1.02]" /></Link>}
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 rounded-xl p-2.5 ${result.entityType === 'document' ? 'bg-violet-100 text-violet-600 dark:bg-violet-900 dark:text-violet-300' : result.entityType === 'note' ? 'bg-amber-50 text-amber-500 dark:bg-amber-950' : result.entityType === 'category' ? 'bg-orange-50 text-orange-500 dark:bg-orange-950' : 'bg-teal-50 text-teal-600 dark:bg-teal-950'}`}>
                      {result.mimeType?.startsWith('image/') ? <ImageIcon size={15} /> : result.entityType === 'document' ? <FileText size={15} /> : result.entityType === 'note' ? <StickyNote size={15} /> : result.entityType === 'category' ? <FolderOpen size={15} /> : <PlugZap size={15} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate font-serif text-lg font-semibold text-violet-950 dark:text-violet-50">{result.title}</h2>
                        <span className="rounded-full bg-violet-50 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-violet-400 dark:bg-violet-900/60 dark:text-violet-300">{result.entityType}</span>
                      </div>
                      <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3 dark:border-amber-900/60 dark:bg-amber-950/20">
                        <p className="mb-1.5 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-amber-600 dark:text-amber-400"><Sparkles size={11} /> {result.entityType === 'document' ? 'Found in document' : result.entityType === 'note' ? 'Found in note' : 'Matching result'}</p>
                        <p className="text-xs leading-6 text-violet-700 dark:text-violet-200"><HighlightedSnippet snippet={result.snippet} /></p>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        {result.category && <Badge>{result.category}</Badge>}
                        {result.version && <Badge>v{result.version}</Badge>}
                        {result.tags.slice(0, 4).map((tag) => <Badge key={tag}>{tag}</Badge>)}
                        <span className="text-[10px] text-violet-400 sm:ml-auto">Updated {formatDate(result.updatedAt)}</span>
                      </div>
                      <ResultLink result={result} query={query} />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type SearchFilter = 'all' | 'documents' | 'images' | 'notes' | 'integrations' | 'categories';
const searchFilters: { id: SearchFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'documents', label: 'Documents' },
  { id: 'images', label: 'Images' },
  { id: 'notes', label: 'Notes' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'categories', label: 'Categories' },
];

function HighlightedSnippet({ snippet }: { snippet: string }) {
  if (!snippet) return <>Match found in the title, category, tags or other metadata.</>;
  const parts = snippet.split(/(\[\[\[PINIT_MATCH\]\]\][\s\S]*?\[\[\[\/PINIT_MATCH\]\]\])/g);
  return <>{parts.map((part, index) => part.startsWith('[[[PINIT_MATCH]]]')
    ? <mark key={index} className="rounded bg-amber-200 px-1 py-0.5 font-semibold text-violet-950 dark:bg-amber-500/70 dark:text-white">{part.replace('[[[PINIT_MATCH]]]', '').replace('[[[/PINIT_MATCH]]]', '')}</mark>
    : part)}</>;
}

function ResultLink({ result, query }: { result: SearchResult; query: string }) {
  const target = result.entityType === 'document'
    ? `/documents/${result.entityId}?q=${encodeURIComponent(query)}`
    : result.entityType === 'integration' && result.integrationFolderId
      ? `/integrations?folder=${result.integrationFolderId}`
      : result.entityType === 'category'
        ? `/categories/${result.entityId}`
        : '/notes';
  return <Link to={target} className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-coral-600 hover:text-coral-700 hover:underline">Open {result.entityType} <ArrowUpRight size={13} /></Link>;
}
