import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type { Category } from '@apotheke/contracts';
import {
  BookOpen,
  FileText,
  LayoutDashboard,
  PlugZap,
  ListTodo,
  Menu,
  Moon,
  Sun,
  X,
  Search,
  StickyNote,
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

const navItems = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/documents', label: 'Documents', icon: FileText, end: false },
  { to: '/notes', label: 'Notes', icon: StickyNote, end: false },
  { to: '/integrations', label: 'Integrations', icon: PlugZap, end: false },
  { to: '/tasks', label: 'Tasks', icon: ListTodo, end: false },
] as const;

function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    void api<{ categories: Category[] }>('/categories')
      .then((result) => setCategories(result.categories))
      .catch(() => undefined);
  }, []);

  return (
    <aside className={`fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-violet-700 bg-gradient-to-b from-violet-900 to-violet-950 text-violet-100 shadow-xl shadow-violet-950/10 transition-transform dark:border-violet-200 dark:from-[#f7f4ff] dark:to-[#ebe5fb] dark:text-violet-950 dark:shadow-black/20 sm:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex h-16 items-center gap-3 border-b border-violet-700/70 px-5 dark:border-violet-200">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-coral-500 to-amber-400 text-white shadow-lg shadow-coral-500/20">
          <BookOpen size={17} />
        </div>
        <div>
          <div className="text-[15px] font-semibold tracking-wide text-white dark:text-violet-950">Apotheke</div>
          <div className="text-[10px] uppercase tracking-[0.17em] text-violet-300 dark:text-violet-500">Local knowledge</div>
        </div>
        <button onClick={onClose} aria-label="Close navigation" className="ml-auto rounded-lg p-1.5 text-violet-300 hover:bg-violet-800 dark:text-violet-500 dark:hover:bg-violet-100 sm:hidden"><X size={17} /></button>
      </div>

      <nav className="px-3 py-4">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-400 dark:text-violet-500">Workspace</p>
        <div className="space-y-0.5">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) => [
                'flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition-colors',
                isActive ? 'bg-violet-700 text-white shadow-sm ring-1 ring-violet-500/40 dark:bg-white dark:text-violet-800 dark:ring-violet-200' : 'text-violet-200 hover:translate-x-0.5 hover:bg-violet-800/70 hover:text-white dark:text-violet-700 dark:hover:bg-white dark:hover:text-violet-950',
              ].join(' ')}
            >
              <Icon size={16} strokeWidth={1.8} />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="min-h-0 flex-1 border-t border-violet-700/70 px-3 py-4 dark:border-violet-200">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-400 dark:text-violet-500">Categories</p>
        <div className="max-h-full space-y-0.5 overflow-auto">
          {categories.length === 0 ? (
            <p className="px-3 py-2 text-xs leading-5 text-violet-400 dark:text-violet-500">Categories appear here as you use them.</p>
          ) : categories.map((category) => (
            <div key={category.id} className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs text-violet-200 hover:bg-violet-800/60 dark:text-violet-700 dark:hover:bg-white">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-300" />
              <span className="truncate">{category.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-violet-700/70 px-5 py-3 text-[10px] uppercase tracking-[0.12em] text-violet-400 dark:border-violet-200 dark:text-violet-500">
        Private · On this device
      </div>
    </aside>
  );
}

function Topbar({ onMenu, dark, onToggleTheme }: { onMenu: () => void; dark: boolean; onToggleTheme: () => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    if (trimmed) navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <header className="fixed left-0 right-0 top-0 z-20 flex h-16 items-center border-b border-violet-100/80 bg-[#fffdf9]/85 px-4 shadow-[0_1px_12px_rgba(82,65,168,0.04)] backdrop-blur-xl dark:border-violet-800 dark:bg-[#1d1830]/85 sm:left-60 sm:px-5 lg:px-8">
      <button onClick={onMenu} aria-label="Open navigation" className="mr-3 rounded-lg p-2 text-violet-500 hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-800 sm:hidden"><Menu size={19} /></button>
      <form onSubmit={submit} className="relative w-full max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder='Search documents, notes, tags…  Try "exact phrase" AND API'
          className="h-9 w-full rounded-xl border border-violet-200 bg-white pl-9 pr-12 text-[13px] text-violet-950 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-violet-700 dark:bg-violet-950 dark:text-violet-50"
        />
        <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-400">↵</kbd>
      </form>
      <button onClick={onToggleTheme} aria-label={dark ? 'Use light mode' : 'Use dark mode'} className="ml-3 rounded-xl p-2 text-violet-500 hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-800">{dark ? <Sun size={17} /> : <Moon size={17} />}</button>
      <div className="ml-auto hidden pl-4 text-xs font-medium text-teal-700 sm:block">
        <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-teal-500" />
        Local
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem('apotheke-theme') === 'dark');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('apotheke-theme', dark ? 'dark' : 'light');
  }, [dark]);

  return (
    <div className="min-h-screen bg-[#fffaf3] dark:bg-[#171329]">
      {mobileOpen && <button aria-label="Close navigation" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-20 bg-violet-950/50 sm:hidden" />}
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <Topbar onMenu={() => setMobileOpen(true)} dark={dark} onToggleTheme={() => setDark((value) => !value)} />
      <main className="pt-16 sm:ml-60">
        <div className="app-content mx-auto max-w-[1440px] p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
