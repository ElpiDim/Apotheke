import { useEffect, useState, type FormEvent } from 'react';
import type { SearchResult } from '@apotheke/contracts';
import { FileText, Search, StickyNote } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { PageHeader } from '../../components/PageHeader';
import { api, ApiError } from '../../lib/api';
import { formatDate } from '../../lib/format';

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const [input, setInput] = useState(query);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setInput(query);
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

  function submit(event: FormEvent) {
    event.preventDefault();
    const next = input.trim();
    setParams(next ? { q: next } : {});
  }

  return (
    <div>
      <PageHeader eyebrow="Retrieval" title="Search" description="Search document contents, notes and metadata with SQLite FTS5." />

      <form onSubmit={submit} className="relative max-w-3xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder='Try: "Bonus API" AND wallet NOT legacy'
          className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-24 text-sm text-slate-800 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          autoFocus
        />
        <button className="absolute right-2 top-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800">Search</button>
      </form>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-slate-400">
        <span><code className="text-slate-600">"exact phrase"</code> phrase</span>
        <span><code className="text-slate-600">AND</code> all terms</span>
        <span><code className="text-slate-600">OR</code> either term</span>
        <span><code className="text-slate-600">NOT</code> exclude following term</span>
      </div>

      {error && <div className="mt-6 max-w-3xl rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {query && !loading && !error && (
        <div className="mt-8">
          <div className="mb-3 text-xs font-medium text-slate-400">{results.length} {results.length === 1 ? 'result' : 'results'} for <span className="text-slate-700">“{query}”</span></div>
          {results.length === 0 ? (
            <EmptyState icon={Search} title="No matches" description="Try fewer terms, an OR query, or remove a filter word." />
          ) : (
            <div className="max-w-4xl overflow-hidden rounded-xl border border-slate-200 bg-white">
              {results.map((result) => (
                <div key={`${result.entityType}-${result.entityId}`} className="border-b border-slate-100 px-5 py-4 last:border-0 hover:bg-slate-50/70">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-md bg-slate-100 p-2 text-slate-500">
                      {result.entityType === 'document' ? <FileText size={15} /> : <StickyNote size={15} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-sm font-semibold text-slate-800">{result.title}</h3>
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{result.entityType}</span>
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-slate-500">{result.snippet || 'Match found in metadata.'}</p>
                      <div className="mt-2.5 flex items-center gap-1.5">
                        {result.category && <Badge>{result.category}</Badge>}
                        {result.version && <Badge>v{result.version}</Badge>}
                        {result.tags.slice(0, 4).map((tag) => <Badge key={tag}>{tag}</Badge>)}
                        <span className="ml-auto text-[10px] text-slate-400">Updated {formatDate(result.updatedAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
