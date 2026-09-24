import { useEffect, useMemo, useState } from 'react';
import type { SearchResult } from '@peanut/contracts';
import { ArrowUpRight, FileText, Search } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { EmptyState } from '../../components/EmptyState';
import { PageHeader } from '../../components/PageHeader';
import { api, ApiError } from '../../lib/api';

interface Passage {
  documentId: string;
  title: string;
  snippet: string;
  page: number | null;
  matchIndex: number;
}

export function SearchPage() {
  const [params] = useSearchParams();
  const query = params.get('q') ?? '';
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedDocuments, setExpandedDocuments] = useState<Set<string>>(() => new Set());

  const passages = useMemo<Passage[]>(() => results
    .filter((result) => result.entityType === 'document' && result.mimeType === 'application/pdf')
    .flatMap((result) => {
      const snippets = result.snippets?.length ? result.snippets : result.snippet ? [result.snippet] : [];
      return snippets.map((snippet, matchIndex) => ({
        documentId: result.entityId,
        title: result.title,
        snippet,
        page: result.matchPages?.[matchIndex] ?? null,
        matchIndex,
      }));
    }), [results]);
  const passageGroups = useMemo(() => {
    const groups = new Map<string, Passage[]>();
    for (const passage of passages) {
      const current = groups.get(passage.documentId) ?? [];
      current.push(passage);
      groups.set(passage.documentId, current);
    }
    return [...groups.entries()];
  }, [passages]);

  useEffect(() => {
    setExpandedDocuments(new Set());
    if (!query) { setResults([]); return; }
    setLoading(true);
    setError(null);
    void api<{ query: string; results: SearchResult[] }>(`/search?q=${encodeURIComponent(query)}`)
      .then((response) => setResults(response.results))
      .catch((caught) => setError(caught instanceof ApiError ? caught.message : 'Search failed.'))
      .finally(() => setLoading(false));
  }, [query]);

  return <div>
    <PageHeader eyebrow="PDF search" title="Search" description="Find the exact passages where your search appears inside your PDFs." />
    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-slate-400">
      <span><code className="text-slate-600">bonus campaign</code> nearby terms</span>
      <span><code className="text-slate-600">"bonus campaign"</code> exact phrase</span>
      <span><code className="text-slate-600">bonus OR campaign</code> either term</span>
    </div>

    {loading && <div className="mt-10 text-sm text-violet-400">Searching inside your PDFs…</div>}
    {error && <div className="mt-6 max-w-3xl rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

    {query && !loading && !error && <section className="mt-8 max-w-4xl">
      <p className="mb-5 text-xs font-medium text-violet-400">{passages.length} {passages.length === 1 ? 'passage' : 'passages'} for <span className="font-semibold text-violet-700 dark:text-violet-200">“{query}”</span></p>
      {passages.length === 0 ? <EmptyState icon={Search} title="No matching passages" description="No extracted PDF text contains this search. Try fewer terms, an exact phrase, or OR." />
        : <div className="overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-[0_8px_28px_rgba(82,65,168,0.06)] dark:border-violet-800 dark:bg-[#211b35]">
          {passageGroups.map(([documentId, documentPassages]) => {
            const expanded = expandedDocuments.has(documentId);
            const visible = expanded ? documentPassages : documentPassages.slice(0, 5);
            return <div key={documentId} className="contents">
              {visible.map((passage, index) => <PassageResult key={`${passage.documentId}-${passage.matchIndex}-${index}`} passage={passage} query={query} />)}
              {!expanded && documentPassages.length > 5 && <div className="border-b border-violet-100 px-5 py-3 text-center dark:border-violet-800"><button type="button" onClick={() => setExpandedDocuments((current) => new Set(current).add(documentId))} className="text-xs font-semibold text-violet-500 hover:text-coral-600">Show {documentPassages.length - 5} more from {documentPassages[0]?.title}</button></div>}
            </div>;
          })}
        </div>}
    </section>}
  </div>;
}

function PassageResult({ passage, query }: { passage: Passage; query: string }) {
  const target = `/documents/${passage.documentId}?q=${encodeURIComponent(query)}&match=${passage.matchIndex}${passage.page ? `&page=${passage.page}` : ''}`;
  return <Link to={target} className="group block border-b border-violet-100 px-5 py-5 transition last:border-b-0 hover:bg-violet-50/70 dark:border-violet-800 dark:hover:bg-violet-900/40">
    <p className="text-[15px] leading-7 text-violet-800 dark:text-violet-100"><HighlightedSnippet snippet={passage.snippet} /></p>
    <div className="mt-3 flex items-center gap-2 text-[10px] font-medium text-violet-400">
      <FileText size={12} />
      <span className="max-w-[70%] truncate">{passage.title}</span>
      {passage.page && <><span>·</span><span>Page {passage.page}</span></>}
      <ArrowUpRight size={13} className="ml-auto text-violet-300 opacity-0 transition group-hover:opacity-100" />
    </div>
  </Link>;
}

function HighlightedSnippet({ snippet }: { snippet: string }) {
  const parts = snippet.split(/(\[\[\[PINIT_MATCH\]\]\][\s\S]*?\[\[\[\/PINIT_MATCH\]\]\])/g);
  return <>{parts.map((part, index) => part.startsWith('[[[PINIT_MATCH]]]')
    ? <mark key={index} className="rounded bg-violet-200 px-1 py-0.5 font-semibold text-violet-950 dark:bg-violet-600 dark:text-white">{part.replace('[[[PINIT_MATCH]]]', '').replace('[[[/PINIT_MATCH]]]', '')}</mark>
    : part)}</>;
}
