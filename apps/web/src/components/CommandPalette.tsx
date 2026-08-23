import { useEffect, useMemo, useState } from 'react';
import type { SearchResult } from '@apotheke/contracts';
import { FilePlus2, FileText, Image, LayoutDashboard, ListTodo, PlugZap, Search, StickyNote, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

const actions = [
  { label: 'Overview', hint: 'Go to home', to: '/', icon: LayoutDashboard, keywords: 'home dashboard overview' },
  { label: 'Upload a file', hint: 'Document, PDF or image', to: '/documents?action=import', icon: FilePlus2, keywords: 'upload import pdf image file' },
  { label: 'Documents', hint: 'Open library', to: '/documents', icon: FileText, keywords: 'documents files pdf' },
  { label: 'Images', hint: 'Open visual library', to: '/images', icon: Image, keywords: 'images photos screenshots' },
  { label: 'Notes', hint: 'Open notes', to: '/notes', icon: StickyNote, keywords: 'notes write' },
  { label: 'New note', hint: 'Capture something quickly', to: '/notes?action=new', icon: StickyNote, keywords: 'create add note write' },
  { label: 'Tasks', hint: 'Open tasks and calendar', to: '/tasks', icon: ListTodo, keywords: 'tasks todos calendar' },
  { label: 'New task', hint: 'Add a to-do', to: '/tasks?action=new', icon: ListTodo, keywords: 'create add task todo' },
  { label: 'Integrations', hint: 'Open folders', to: '/integrations', icon: PlugZap, keywords: 'integrations folders links' },
] as const;

function targetFor(result: SearchResult, query: string) {
  if (result.entityType === 'document') return `/documents/${result.entityId}?q=${encodeURIComponent(query)}`;
  if (result.entityType === 'integration' && result.integrationFolderId) return `/integrations?folder=${result.integrationFolderId}`;
  return '/notes';
}

export function CommandPalette() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === 'k') {
        event.preventDefault();
        setOpen((value) => !value);
      }
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', keyboard);
    return () => window.removeEventListener('keydown', keyboard);
  }, []);

  useEffect(() => {
    if (!open || query.trim().length < 2) { setResults([]); setLoading(false); return; }
    const timer = window.setTimeout(() => {
      setLoading(true);
      void api<{ query: string; results: SearchResult[] }>(`/search?q=${encodeURIComponent(query.trim())}`)
        .then((response) => setResults(response.results.slice(0, 5)))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 180);
    return () => window.clearTimeout(timer);
  }, [open, query]);

  const filteredActions = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return actions.filter((action) => !needle || `${action.label} ${action.keywords}`.toLocaleLowerCase().includes(needle));
  }, [query]);

  function go(to: string) {
    setOpen(false);
    setQuery('');
    setResults([]);
    navigate(to);
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-violet-950/35 px-4 pt-[12vh] backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="w-full max-w-xl overflow-hidden rounded-[24px] border border-violet-200 bg-[#fffdf9] shadow-[0_28px_80px_rgba(32,16,66,0.32)] dark:border-violet-700 dark:bg-[#211b35]">
        <div className="relative border-b border-violet-100 p-3 dark:border-violet-800">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-violet-400" size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Peanut or run a command…" className="h-12 w-full bg-transparent pl-11 pr-12 text-sm text-violet-950 outline-none placeholder:text-violet-300 dark:text-white" autoFocus />
          <button onClick={() => setOpen(false)} className="absolute right-5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-800" aria-label="Close command bar"><X size={16} /></button>
        </div>
        <div className="max-h-[55vh] overflow-y-auto p-2">
          {filteredActions.length > 0 && <div><p className="px-3 py-2 text-[9px] font-bold uppercase tracking-[0.16em] text-violet-400">Quick actions</p>{filteredActions.map(({ label, hint, to, icon: Icon }) => <button key={to} onClick={() => go(to)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-violet-50 dark:hover:bg-violet-900"><span className="rounded-lg bg-violet-100 p-2 text-violet-600 dark:bg-violet-800 dark:text-violet-200"><Icon size={15} /></span><span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-violet-900 dark:text-white">{label}</span><span className="block text-[10px] text-violet-400">{hint}</span></span><kbd className="text-[9px] text-violet-300">Enter</kbd></button>)}</div>}
          {query.trim().length >= 2 && <div className="mt-1 border-t border-violet-100 pt-1 dark:border-violet-800"><p className="flex items-center justify-between px-3 py-2 text-[9px] font-bold uppercase tracking-[0.16em] text-violet-400"><span>Workspace results</span>{loading && <span>Searching…</span>}</p>{!loading && results.length === 0 ? <p className="px-3 py-5 text-center text-xs text-violet-400">No matching items yet.</p> : results.map((result) => <button key={`${result.entityType}-${result.entityId}`} onClick={() => go(targetFor(result, query.trim()))} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-violet-50 dark:hover:bg-violet-900"><span className="rounded-lg bg-amber-100 p-2 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300"><Search size={14} /></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-violet-900 dark:text-white">{result.title}</span><span className="block truncate text-[10px] capitalize text-violet-400">{result.entityType}{result.category ? ` · ${result.category}` : ''}</span></span></button>)}</div>}
        </div>
        <footer className="flex items-center justify-between border-t border-violet-100 bg-violet-50/60 px-4 py-2.5 text-[9px] text-violet-400 dark:border-violet-800 dark:bg-violet-950/40"><span>Navigate and search from anywhere</span><span><kbd className="rounded border border-violet-200 bg-white px-1.5 py-0.5 dark:border-violet-700 dark:bg-violet-900">Esc</kbd> close</span></footer>
      </section>
    </div>
  );
}
