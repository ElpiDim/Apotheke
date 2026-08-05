import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type { Category } from '@apotheke/contracts';
import {
  BookOpen,
  FileText,
  LayoutDashboard,
  PlugZap,
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
  { to: '/search', label: 'Search', icon: Search, end: false },
] as const;

function Sidebar() {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    void api<{ categories: Category[] }>('/categories')
      .then((result) => setCategories(result.categories))
      .catch(() => undefined);
  }, []);

  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-60 flex-col border-r border-violet-800 bg-violet-950 text-violet-100">
      <div className="flex h-16 items-center gap-3 border-b border-violet-800 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-coral-500 text-white shadow-sm">
          <BookOpen size={17} />
        </div>
        <div>
          <div className="text-[15px] font-semibold tracking-wide text-white">Apotheke</div>
          <div className="text-[10px] uppercase tracking-[0.17em] text-violet-300">Local knowledge</div>
        </div>
      </div>

      <nav className="px-3 py-4">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-400">Workspace</p>
        <div className="space-y-0.5">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => [
                'flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition-colors',
                isActive ? 'bg-violet-700 text-white shadow-sm' : 'text-violet-200 hover:bg-violet-800/70 hover:text-white',
              ].join(' ')}
            >
              <Icon size={16} strokeWidth={1.8} />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="min-h-0 flex-1 border-t border-violet-800 px-3 py-4">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-400">Categories</p>
        <div className="max-h-full space-y-0.5 overflow-auto">
          {categories.length === 0 ? (
            <p className="px-3 py-2 text-xs leading-5 text-violet-400">Categories appear here as you use them.</p>
          ) : categories.map((category) => (
            <div key={category.id} className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs text-violet-200 hover:bg-violet-800/60">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-300" />
              <span className="truncate">{category.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-violet-800 px-5 py-3 text-[10px] uppercase tracking-[0.12em] text-violet-400">
        Private · On this device
      </div>
    </aside>
  );
}

function Topbar() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    if (trimmed) navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <header className="fixed left-60 right-0 top-0 z-10 flex h-16 items-center border-b border-orange-100 bg-[#fffdf9]/95 px-8">
      <form onSubmit={submit} className="relative w-full max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder='Search documents, notes, tags…  Try "exact phrase" AND API'
          className="h-9 w-full rounded-xl border border-violet-200 bg-white pl-9 pr-12 text-[13px] text-violet-950 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
        />
        <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-400">↵</kbd>
      </form>
      <div className="ml-auto pl-6 text-xs font-medium text-teal-700">
        <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-teal-500" />
        Local
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#fffaf3]">
      <Sidebar />
      <Topbar />
      <main className="ml-60 pt-16">
        <div className="mx-auto max-w-[1440px] p-8">{children}</div>
      </main>
    </div>
  );
}
