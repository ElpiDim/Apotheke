import { useEffect, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent } from 'react';
import type { ExtractiveAnswerResponse, ExtractiveAnswerSource } from '@peanut/contracts';
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
  const [position, setPosition] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('pini-position') ?? '') as { x?: number; y?: number };
      if (Number.isFinite(saved.x) && Number.isFinite(saved.y)) return { x: saved.x!, y: saved.y! };
    } catch { /* Use the default position. */ }
    return { x: Math.max(12, window.innerWidth - 96), y: Math.max(12, window.innerHeight - 114) };
  });
  const floatingRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ pointerId: number; offsetX: number; offsetY: number; startX: number; startY: number; x: number; y: number; moved: boolean } | null>(null);

  useEffect(() => {
    const keepInsideWindow = () => setPosition((current) => ({
      x: Math.min(Math.max(8, current.x), Math.max(8, window.innerWidth - 80)),
      y: Math.min(Math.max(8, current.y), Math.max(8, window.innerHeight - 98)),
    }));
    window.addEventListener('resize', keepInsideWindow);
    return () => window.removeEventListener('resize', keepInsideWindow);
  }, []);

  function startDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    drag.current = { pointerId: event.pointerId, offsetX: event.clientX - position.x, offsetY: event.clientY - position.y, startX: event.clientX, startY: event.clientY, x: position.x, y: position.y, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    if (Math.hypot(event.clientX - active.startX, event.clientY - active.startY) > 4) active.moved = true;
    if (!active.moved) return;
    active.x = Math.min(Math.max(8, event.clientX - active.offsetX), Math.max(8, window.innerWidth - 80));
    active.y = Math.min(Math.max(8, event.clientY - active.offsetY), Math.max(8, window.innerHeight - 98));
    if (floatingRef.current) {
      floatingRef.current.style.left = `${active.x}px`;
      floatingRef.current.style.top = `${active.y}px`;
    }
  }

  function finishDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    drag.current = null;
    if (!active.moved) {
      setOpen(true);
      return;
    }
    const nextPosition = { x: active.x, y: active.y };
    setPosition(nextPosition);
    localStorage.setItem('pini-position', JSON.stringify(nextPosition));
  }

  function cancelDrag() {
    drag.current = null;
  }

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
    <div ref={floatingRef} className={open ? 'fixed bottom-4 right-4 z-40 sm:bottom-6 sm:right-6' : 'fixed z-40'} style={open ? undefined : { left: position.x, top: position.y }}>
      {open && (
        <section className="flex max-h-[min(560px,calc(100vh-8rem))] w-[min(370px,calc(100vw-2rem))] flex-col overflow-hidden rounded-[26px] border border-violet-200 bg-[#fffdf9] shadow-[0_24px_70px_rgba(47,25,91,0.25)] dark:border-violet-700 dark:bg-[#211b35]">
          <header className="relative shrink-0 overflow-hidden border-b border-violet-100 bg-gradient-to-br from-amber-50 via-[#fff8eb] to-violet-100 px-5 pb-4 pt-5 dark:border-violet-800 dark:from-violet-950 dark:via-[#29203f] dark:to-violet-900">
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
            {response?.answer && <div className="mb-4 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm dark:border-amber-800 dark:from-amber-950/35 dark:to-violet-950/40"><p className="mb-2 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-amber-600 dark:text-amber-300"><Sparkles size={12} /> Best matching answer</p><p className="text-xs leading-6 text-violet-800 dark:text-violet-100">{response.answer}</p></div>}
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

          <form onSubmit={search} className="shrink-0 border-t border-violet-100 bg-white p-3 dark:border-violet-800 dark:bg-[#211b35]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-violet-400" size={15} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ask a question about your docs…" className="h-11 w-full rounded-2xl border border-violet-200 bg-[#fffaf3] pl-9 pr-20 text-xs text-violet-950 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-violet-700 dark:bg-violet-950 dark:text-white" autoFocus />
              <button disabled={loading || !query.trim()} className="absolute right-1.5 top-1.5 h-8 rounded-xl bg-violet-700 px-3 text-[10px] font-bold text-white hover:bg-violet-800 disabled:opacity-40">{loading ? '…' : 'Ask'}</button>
            </div>
          </form>
        </section>
      )}

      {!open && <button onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={finishDrag} onPointerCancel={cancelDrag} aria-label="Open or move Pini assistant" title="Click to open · drag to move" className="group relative ml-auto flex h-[90px] w-[72px] touch-none cursor-grab select-none items-end justify-center transition active:cursor-grabbing">
        <span className="absolute -left-24 top-2 rounded-full border border-violet-100 bg-white px-3 py-2 text-[11px] font-bold text-violet-800 opacity-0 shadow-md transition group-hover:opacity-100 dark:border-violet-700 dark:bg-violet-900 dark:text-white">Ask Pini</span>
        <img src="/pini-mascot.png" alt="" draggable={false} className="pointer-events-none max-h-[86px] w-auto select-none drop-shadow-[0_9px_8px_rgba(69,35,104,0.22)] transition group-hover:scale-105" />
        <span className="absolute right-0 top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-teal-400 dark:border-violet-900" />
      </button>}
    </div>
  );
}
