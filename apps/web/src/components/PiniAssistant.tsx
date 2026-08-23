import { useState, type FormEvent } from 'react';
import type { ExtractiveAnswerResponse, ExtractiveAnswerSource } from '@apotheke/contracts';
import { ArrowUpRight, BookOpen, ListTodo, Search, Sparkles, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

function resultTarget(result: ExtractiveAnswerSource, query: string) {
  if (result.entityType === 'document') return `/documents/${result.entityId}?q=${encodeURIComponent(query)}`;
  if (result.entityType === 'integration' && result.integrationFolderId) return `/integrations?folder=${result.integrationFolderId}`;
  return '/notes';
}

export function PiniAssistant() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchedQuery, setSearchedQuery] = useState('');
  const [response, setResponse] = useState<ExtractiveAnswerResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search(event: FormEvent) {
    event.preventDefault();
    const nextQuery = query.trim();
    if (!nextQuery) return;
    setLoading(true);
    setError(null);
    setSearchedQuery(nextQuery);
    try {
      const answer = await api<ExtractiveAnswerResponse>(`/search/answer?q=${encodeURIComponent(nextQuery)}`);
      setResponse(answer);
    } catch {
      setResponse(null);
      setError('I could not search right now. Is the Peanut server running?');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 sm:bottom-6 sm:right-6">
      {open && (
        <section className="mb-3 flex max-h-[min(620px,calc(100vh-7rem))] w-[min(370px,calc(100vw-2rem))] flex-col overflow-hidden rounded-[26px] border border-violet-200 bg-[#fffdf9] shadow-[0_24px_70px_rgba(47,25,91,0.25)] dark:border-violet-700 dark:bg-[#211b35]">
          <header className="relative overflow-hidden border-b border-violet-100 bg-gradient-to-br from-amber-50 via-[#fff8eb] to-violet-100 px-5 pb-4 pt-5 dark:border-violet-800 dark:from-violet-950 dark:via-[#29203f] dark:to-violet-900">
            <div className="absolute -right-10 -top-12 h-32 w-32 rounded-full bg-coral-200/45 blur-2xl" />
            <button onClick={() => setOpen(false)} aria-label="Close Pini" className="absolute right-3 top-3 z-10 rounded-full p-2 text-violet-500 hover:bg-white/70 dark:text-violet-300 dark:hover:bg-violet-800"><X size={16} /></button>
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-16 shrink-0 items-end justify-center">
                <img src="/pini-mascot.png" alt="Pini" className="max-h-20 w-auto drop-shadow-[0_7px_8px_rgba(69,35,104,0.16)]" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-coral-500">Personal assistant</p>
                <h2 className="font-serif text-2xl font-bold text-violet-950 dark:text-white">Hi, I’m Pini!</h2>
                <p className="mt-1 text-xs leading-5 text-violet-600 dark:text-violet-200">I can find anything in your Peanut workspace.</p>
              </div>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <div className="mb-3 flex gap-2">
              <button onClick={() => navigate('/tasks')} className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-white px-3 py-2 text-[11px] font-semibold text-violet-700 hover:border-violet-400 dark:border-violet-700 dark:bg-violet-950 dark:text-violet-200"><ListTodo size={13} /> My tasks</button>
              <button onClick={() => { setQuery(''); setResponse(null); setSearchedQuery(''); }} className="rounded-full border border-violet-200 bg-white px-3 py-2 text-[11px] font-semibold text-violet-700 hover:border-violet-400 dark:border-violet-700 dark:bg-violet-950 dark:text-violet-200">New question</button>
            </div>

            {searchedQuery && !loading && !error && !response?.answer && <p className="mb-3 rounded-xl bg-violet-50 px-3 py-3 text-xs leading-5 text-violet-500 dark:bg-violet-950/50 dark:text-violet-300">I couldn’t find a reliable passage that answers “{searchedQuery}”. Try using one or two more specific terms.</p>}
            {error && <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
            {response?.answer && <div className="mb-4 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm dark:border-amber-800 dark:from-amber-950/35 dark:to-violet-950/40"><p className="mb-2 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-amber-600 dark:text-amber-300"><Sparkles size={12} /> Best matching answer</p><p className="text-xs leading-6 text-violet-800 dark:text-violet-100">{response.answer}</p><p className="mt-3 text-[9px] leading-4 text-violet-400">Local extractive answer · copied directly from your workspace</p></div>}
            {response && response.sources.length > 0 && <p className="mb-2 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-violet-400"><BookOpen size={12} /> Sources</p>}
            <div className="space-y-2">
              {response?.sources.map((result, index) => (
                <Link key={`${result.entityType}-${result.entityId}`} to={resultTarget(result, searchedQuery)} onClick={() => setOpen(false)} className="group block rounded-2xl border border-violet-100 bg-white p-3 transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md dark:border-violet-800 dark:bg-violet-950/55 dark:hover:border-violet-600">
                  <div className="flex items-start gap-3">
                    <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-[10px] font-bold text-violet-600 dark:bg-violet-900 dark:text-violet-300">{index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-violet-950 dark:text-white">{result.title}</p>
                      <p className="mt-1 line-clamp-3 text-[10px] leading-4 text-violet-500 dark:text-violet-300">{result.excerpt}</p>
                      <p className="mt-1.5 text-[9px] capitalize text-violet-300">{result.entityType}{result.category ? ` · ${result.category}` : ''}</p>
                    </div>
                    <ArrowUpRight className="mt-1 text-violet-300 transition group-hover:text-coral-500" size={13} />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <form onSubmit={search} className="border-t border-violet-100 bg-white p-3 dark:border-violet-800 dark:bg-[#211b35]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-violet-400" size={15} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ask a question about your docs…" className="h-11 w-full rounded-2xl border border-violet-200 bg-[#fffaf3] pl-9 pr-20 text-xs text-violet-950 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-violet-700 dark:bg-violet-950 dark:text-white" autoFocus />
              <button disabled={loading || !query.trim()} className="absolute right-1.5 top-1.5 h-8 rounded-xl bg-violet-700 px-3 text-[10px] font-bold text-white hover:bg-violet-800 disabled:opacity-40">{loading ? '…' : 'Ask'}</button>
            </div>
          </form>
        </section>
      )}

      <button onClick={() => setOpen((value) => !value)} aria-label={open ? 'Close Pini assistant' : 'Open Pini assistant'} className="group relative ml-auto flex h-[90px] w-[72px] items-end justify-center transition hover:-translate-y-1">
        {!open && <span className="absolute -left-24 top-2 rounded-full border border-violet-100 bg-white px-3 py-2 text-[11px] font-bold text-violet-800 opacity-0 shadow-md transition group-hover:opacity-100 dark:border-violet-700 dark:bg-violet-900 dark:text-white">Ask Pini</span>}
        <img src="/pini-mascot.png" alt="" className="max-h-[86px] w-auto drop-shadow-[0_9px_8px_rgba(69,35,104,0.22)] transition group-hover:scale-105" />
        <span className="absolute right-0 top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-teal-400 dark:border-violet-900" />
      </button>
    </div>
  );
}
