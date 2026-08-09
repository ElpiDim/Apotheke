import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type { Category, Task } from '@apotheke/contracts';
import {
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
  Image as ImageIcon,
  AlertTriangle,
  Bell,
  CheckCircle2,
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { onWorkspaceChange } from '../lib/workspaceEvents';

const navItems = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/documents', label: 'Documents', icon: FileText, end: false },
  { to: '/images', label: 'Images', icon: ImageIcon, end: false },
  { to: '/notes', label: 'Notes', icon: StickyNote, end: false },
  { to: '/integrations', label: 'Integrations', icon: PlugZap, end: false },
  { to: '/tasks', label: 'Tasks', icon: ListTodo, end: false },
] as const;

function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    let active = true;
    const load = () => api<{ categories: Category[] }>('/categories')
      .then((result) => { if (active) setCategories(result.categories); })
      .catch(() => undefined);
    void load();
    const unsubscribe = onWorkspaceChange((resources) => { if (resources.includes('categories')) void load(); });
    const refreshOnFocus = () => void load();
    window.addEventListener('focus', refreshOnFocus);
    return () => { active = false; unsubscribe(); window.removeEventListener('focus', refreshOnFocus); };
  }, []);

  return (
    <aside className={`fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-violet-700 bg-gradient-to-b from-violet-900 to-violet-950 text-violet-100 shadow-xl shadow-violet-950/10 transition-transform dark:border-violet-200 dark:from-[#f7f4ff] dark:to-[#ebe5fb] dark:text-violet-950 dark:shadow-black/20 sm:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="relative flex h-36 items-center justify-center border-b border-violet-700/70 px-3 dark:border-violet-200">
        <img src="/pinit-logo.png" alt="Pinit logo" className="h-auto w-[205px] shrink-0 drop-shadow-[0_12px_18px_rgba(20,10,55,0.28)]" />
        <button onClick={onClose} aria-label="Close navigation" className="absolute right-3 top-3 rounded-lg p-1.5 text-violet-300 hover:bg-violet-800 dark:text-violet-500 dark:hover:bg-violet-100 sm:hidden"><X size={17} /></button>
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
            <NavLink key={category.id} to={`/categories/${category.id}`} onClick={onClose} className={({ isActive }) => `flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs transition ${isActive ? 'bg-violet-700 font-semibold text-white dark:bg-white dark:text-violet-900' : 'text-violet-200 hover:bg-violet-800/60 dark:text-violet-700 dark:hover:bg-white'}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-teal-300" />
              <span className="truncate">{category.name}</span>
            </NavLink>
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
      <TaskNotifications />
    </header>
  );
}

function taskDay(value: string): string {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function TaskNotifications() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    const load = () => api<{ tasks: Task[] }>('/tasks').then((result) => { if (active) setTasks(result.tasks); }).catch(() => undefined);
    void load();
    const timer = window.setInterval(() => void load(), 15_000);
    const unsubscribe = onWorkspaceChange((resources) => { if (resources.includes('tasks')) void load(); });
    const refreshOnFocus = () => void load();
    window.addEventListener('focus', refreshOnFocus);
    return () => { active = false; window.clearInterval(timer); unsubscribe(); window.removeEventListener('focus', refreshOnFocus); };
  }, []);

  const today = taskDay(new Date().toISOString());
  const reminders = tasks.filter((task) => !task.completedAt && task.dueAt && taskDay(task.dueAt) <= today);
  const overdue = reminders.filter((task) => task.dueAt && taskDay(task.dueAt) < today);
  const dueToday = reminders.filter((task) => task.dueAt && taskDay(task.dueAt) === today);

  async function toggleNotifications() {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (!nextOpen || reminders.length === 0 || !('Notification' in window)) return;
    let permission = Notification.permission;
    if (permission === 'default') permission = await Notification.requestPermission();
    const storageKey = `pinit-task-reminder-${today}`;
    if (permission === 'granted' && !sessionStorage.getItem(storageKey)) {
      new Notification('Pinit task reminders', {
        body: `${overdue.length} overdue · ${dueToday.length} due today`,
        icon: '/pinit-logo.png',
      });
      sessionStorage.setItem(storageKey, 'shown');
    }
  }

  return (
    <div className="relative ml-2">
      <button onClick={() => void toggleNotifications()} aria-label="Task notifications" className="relative rounded-xl p-2 text-violet-500 hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-800"><Bell size={18} />{reminders.length > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral-500 px-1 text-[9px] font-bold text-white">{reminders.length > 9 ? '9+' : reminders.length}</span>}</button>
      {open && <><button aria-label="Close notifications" onClick={() => setOpen(false)} className="fixed inset-0 z-40 cursor-default" /><section className="absolute right-0 top-12 z-50 w-[min(340px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-2xl dark:border-violet-700 dark:bg-[#211b35]"><header className="flex items-center justify-between border-b border-violet-100 px-4 py-3 dark:border-violet-800"><div><h2 className="text-sm font-semibold text-violet-950 dark:text-white">Task reminders</h2><p className="mt-0.5 text-[10px] text-violet-400">Today and overdue</p></div>{reminders.length > 0 && <span className="rounded-full bg-coral-50 px-2 py-1 text-[10px] font-bold text-coral-600 dark:bg-coral-950">{reminders.length}</span>}</header><div className="max-h-80 overflow-auto p-2">{reminders.length === 0 ? <div className="px-4 py-8 text-center"><CheckCircle2 className="mx-auto mb-2 text-teal-400" size={24} /><p className="text-xs font-semibold text-violet-800 dark:text-violet-100">You’re all caught up</p><p className="mt-1 text-[10px] text-violet-400">No tasks due today or overdue.</p></div> : reminders.map((task) => { const isOverdue = Boolean(task.dueAt && taskDay(task.dueAt) < today); return <button key={task.id} onClick={() => { setOpen(false); navigate('/tasks'); }} className="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left hover:bg-violet-50 dark:hover:bg-violet-900"><div className={`mt-0.5 rounded-lg p-1.5 ${isOverdue ? 'bg-red-50 text-red-500 dark:bg-red-950' : 'bg-amber-50 text-amber-500 dark:bg-amber-950'}`}>{isOverdue ? <AlertTriangle size={14} /> : <Bell size={14} />}</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-violet-900 dark:text-violet-100">{task.title}</p><p className={`mt-1 text-[10px] font-medium ${isOverdue ? 'text-red-500' : 'text-amber-600'}`}>{isOverdue ? 'Overdue' : 'Due today'}{task.dueAt ? ` · ${new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date(task.dueAt))}` : ''}</p></div></button>; })}</div><button onClick={() => { setOpen(false); navigate('/tasks'); }} className="w-full border-t border-violet-100 px-4 py-3 text-xs font-semibold text-violet-600 hover:bg-violet-50 dark:border-violet-800 dark:text-violet-300 dark:hover:bg-violet-900">View all tasks</button></section></>}
    </div>
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
