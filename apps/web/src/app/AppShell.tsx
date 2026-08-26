import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type { Category, IntegrationSpace, Task, UserProfile } from '@apotheke/contracts';
import {
  FileText,
  LayoutDashboard,
  FolderKanban,
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
  Pencil,
  Plus,
  Trash2,
  LockKeyhole,
  UserRound,
  Mail,
  Briefcase,
  Save,
} from 'lucide-react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { api, jsonRequest } from '../lib/api';
import { announceWorkspaceChange, onWorkspaceChange } from '../lib/workspaceEvents';
import { PiniAssistant } from '../components/PiniAssistant';
import { CommandPalette } from '../components/CommandPalette';

const navItems = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/documents', label: 'Documents', icon: FileText, end: false },
  { to: '/images', label: 'Images', icon: ImageIcon, end: false },
  { to: '/notes', label: 'Notes', icon: StickyNote, end: false },
  { to: '/tasks', label: 'Tasks', icon: ListTodo, end: false },
  { to: '/passwords', label: 'Passwords', icon: LockKeyhole, end: false },
] as const;

function Sidebar({ mobileOpen, onClose, onProfile }: { mobileOpen: boolean; onClose: () => void; onProfile: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [spaces, setSpaces] = useState<IntegrationSpace[]>([]);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [categoryQuery, setCategoryQuery] = useState('');

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

  useEffect(() => {
    let active = true;
    const load = () => api<{ spaces: IntegrationSpace[] }>('/integrations/spaces')
      .then((result) => { if (active) setSpaces(result.spaces); })
      .catch(() => undefined);
    void load();
    const unsubscribe = onWorkspaceChange((resources) => { if (resources.includes('integrations')) void load(); });
    return () => { active = false; unsubscribe(); };
  }, []);

  async function createSpace() {
    const name = window.prompt('Name your new section (for example, Projects):')?.trim();
    if (!name) return;
    const result = await api<{ space: IntegrationSpace }>('/integrations/spaces', jsonRequest('POST', { name }));
    announceWorkspaceChange('integrations');
    navigate(`/integrations?space=${result.space.id}`);
    onClose();
  }

  async function renameSpace(space: IntegrationSpace) {
    const name = window.prompt('Rename section:', space.name)?.trim();
    if (!name || name === space.name) return;
    await api(`/integrations/spaces/${space.id}`, jsonRequest('PATCH', { name }));
    announceWorkspaceChange('integrations');
  }

  async function removeSpace(space: IntegrationSpace) {
    if (!window.confirm(`Delete “${space.name}” and every folder and item inside it?`)) return;
    await api(`/integrations/spaces/${space.id}`, { method: 'DELETE' });
    announceWorkspaceChange('integrations');
    navigate('/');
  }

  return (
    <aside className={`fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-violet-700 bg-gradient-to-b from-violet-900 to-violet-950 text-violet-100 shadow-xl shadow-violet-950/10 transition-transform dark:border-violet-200 dark:from-[#f7f4ff] dark:to-[#ebe5fb] dark:text-violet-950 dark:shadow-black/20 sm:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="relative flex h-24 items-center justify-center border-b border-violet-700/70 px-3 dark:border-violet-200">
        <button onClick={onProfile} aria-label="Open your profile" title="My profile" className="group rounded-2xl px-2 py-1 transition hover:-translate-y-0.5 hover:bg-violet-800/50 dark:hover:bg-white"><img src="/peanut-logo.png" alt="Peanut logo" className="h-auto w-[145px] shrink-0 drop-shadow-[0_8px_12px_rgba(20,10,55,0.24)] transition group-hover:scale-[1.02]" /></button>
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
          <div className="!mt-3 flex items-center justify-between px-3 pb-1 pt-2">
            <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-violet-400 dark:text-violet-500">Folder spaces</span>
            <button onClick={() => void createSpace()} aria-label="Add folder section" className="rounded-md p-1 text-violet-300 hover:bg-violet-800 hover:text-white dark:text-violet-500 dark:hover:bg-white"><Plus size={13} /></button>
          </div>
          {spaces.map((space) => {
            const activeSpace = location.pathname === '/integrations' && new URLSearchParams(location.search).get('space') === space.id;
            return <div key={space.id} className={`group flex items-center rounded-md transition-colors ${activeSpace ? 'bg-violet-700 text-white shadow-sm ring-1 ring-violet-500/40 dark:bg-white dark:text-violet-800 dark:ring-violet-200' : 'text-violet-200 hover:bg-violet-800/70 hover:text-white dark:text-violet-700 dark:hover:bg-white dark:hover:text-violet-950'}`}>
              <Link to={`/integrations?space=${space.id}`} onClick={onClose} className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2 text-[13px] font-medium"><FolderKanban size={16} strokeWidth={1.8} className="shrink-0" /><span className="truncate">{space.name}</span></Link>
              <button onClick={() => void renameSpace(space)} aria-label={`Rename ${space.name}`} className="p-1 text-current opacity-0 transition hover:text-amber-300 group-hover:opacity-70"><Pencil size={12} /></button>
              <button onClick={() => void removeSpace(space)} aria-label={`Delete ${space.name}`} className="mr-2 p-1 text-current opacity-0 transition hover:text-red-300 group-hover:opacity-70"><Trash2 size={12} /></button>
            </div>;
          })}
        </div>
      </nav>

      <div className="min-h-0 flex-1 border-t border-violet-700/70 px-3 py-4 dark:border-violet-200">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-400 dark:text-violet-500">Categories</p>
        <div className="space-y-0.5">
          {categories.length === 0 ? (
            <p className="px-3 py-2 text-xs leading-5 text-violet-400 dark:text-violet-500">Categories appear here as you use them.</p>
          ) : categories.slice(0, 4).map((category) => (
            <NavLink key={category.id} to={`/categories/${category.id}`} onClick={onClose} className={({ isActive }) => `flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs transition ${isActive ? 'bg-violet-700 font-semibold text-white dark:bg-white dark:text-violet-900' : 'text-violet-200 hover:bg-violet-800/60 dark:text-violet-700 dark:hover:bg-white'}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-teal-300" />
              <span className="truncate">{category.name}</span>
            </NavLink>
          ))}
          {categories.length > 4 && <button onClick={() => { setCategoryQuery(''); setCategoriesOpen(true); }} className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[11px] font-semibold text-violet-300 transition hover:bg-violet-800/60 hover:text-white dark:text-violet-500 dark:hover:bg-white dark:hover:text-violet-900"><Search size={13} /><span>View all categories</span><span className="ml-auto rounded-full bg-violet-800 px-2 py-0.5 text-[9px] text-violet-200 dark:bg-violet-100 dark:text-violet-600">{categories.length}</span></button>}
        </div>
      </div>

      {categoriesOpen && <><button aria-label="Close categories" onClick={() => setCategoriesOpen(false)} className="fixed inset-0 z-40 cursor-default bg-violet-950/20 backdrop-blur-[1px]" /><section className="fixed bottom-5 left-3 z-50 w-[min(330px,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-violet-200 bg-white text-violet-950 shadow-2xl dark:border-violet-700 dark:bg-[#211b35] dark:text-white sm:left-5"><header className="flex items-center justify-between border-b border-violet-100 px-4 py-3 dark:border-violet-800"><div><h2 className="text-sm font-bold">All categories</h2><p className="mt-0.5 text-[10px] text-violet-400">Find and open a category</p></div><button onClick={() => setCategoriesOpen(false)} aria-label="Close" className="rounded-lg p-1.5 text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900"><X size={16} /></button></header><div className="p-3"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-violet-300" size={14} /><input autoFocus value={categoryQuery} onChange={(event) => setCategoryQuery(event.target.value)} placeholder="Search categories…" className="h-10 w-full rounded-xl border border-violet-200 bg-violet-50/60 pl-9 pr-3 text-xs outline-none focus:border-violet-400 dark:border-violet-700 dark:bg-violet-950" /></div><div className="mt-2 max-h-72 space-y-1 overflow-y-auto pr-1">{categories.filter((category) => category.name.toLocaleLowerCase().includes(categoryQuery.trim().toLocaleLowerCase())).map((category) => <NavLink key={category.id} to={`/categories/${category.id}`} onClick={() => { setCategoriesOpen(false); onClose(); }} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition ${isActive ? 'bg-violet-100 text-violet-800 dark:bg-violet-700 dark:text-white' : 'text-violet-700 hover:bg-violet-50 dark:text-violet-200 dark:hover:bg-violet-900'}`}><span className="h-2 w-2 shrink-0 rounded-full bg-teal-400" /><span className="min-w-0 flex-1 truncate">{category.name}</span></NavLink>)}</div></div></section></>}
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
      new Notification('Peanut task reminders', {
        body: `${overdue.length} overdue · ${dueToday.length} due today`,
        icon: '/peanut-logo.png',
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
  const [profileOpen, setProfileOpen] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem('apotheke-theme') === 'dark');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('apotheke-theme', dark ? 'dark' : 'light');
  }, [dark]);

  return (
    <div className="min-h-screen bg-[#fffaf3] dark:bg-[#171329]">
      {mobileOpen && <button aria-label="Close navigation" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-20 bg-violet-950/50 sm:hidden" />}
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} onProfile={() => { setMobileOpen(false); setProfileOpen(true); }} />
      <Topbar onMenu={() => setMobileOpen(true)} dark={dark} onToggleTheme={() => setDark((value) => !value)} />
      <main className="pt-16 sm:ml-60">
        <div className="app-content mx-auto max-w-[1440px] p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
      <PiniAssistant />
      <CommandPalette />
      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}
    </div>
  );
}

const emptyProfile: UserProfile = { name: '', email: '', role: '', bio: '', updatedAt: '' };

function ProfileModal({ onClose }: { onClose: () => void }) {
  const [profile, setProfile] = useState<UserProfile>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void api<{ profile: UserProfile }>('/profile').then((result) => setProfile(result.profile)).catch((reason: Error) => setError(reason.message)).finally(() => setLoading(false));
  }, []);

  async function saveProfile(event: FormEvent) {
    event.preventDefault(); setSaving(true); setSaved(false); setError('');
    try {
      const result = await api<{ profile: UserProfile }>('/profile', jsonRequest('PATCH', { name: profile.name, email: profile.email, role: profile.role, bio: profile.bio }));
      setProfile(result.profile); setSaved(true);
    } catch (reason) { setError((reason as Error).message); }
    finally { setSaving(false); }
  }

  const initials = profile.name.trim().split(/\s+/u).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase()).join('') || 'P';
  return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-violet-950/45 p-4 backdrop-blur-sm"><button onClick={onClose} aria-label="Close profile" className="absolute inset-0 cursor-default" /><section className="relative w-full max-w-xl overflow-hidden rounded-[28px] border border-violet-200 bg-[#fffdf9] shadow-2xl dark:border-violet-700 dark:bg-[#211b35]"><header className="relative overflow-hidden border-b border-violet-100 bg-gradient-to-r from-amber-50 via-orange-50 to-violet-100 px-6 py-5 dark:border-violet-800 dark:from-amber-950/30 dark:via-[#312039] dark:to-violet-950"><div className="absolute -right-6 -top-10 h-32 w-36 rounded-full bg-teal-200/70 dark:bg-teal-800/50" /><button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 z-10 rounded-xl p-2 text-violet-400 hover:bg-white/70 dark:hover:bg-violet-800"><X size={17} /></button><div className="relative flex items-center gap-4"><div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] bg-violet-700 font-serif text-xl font-bold text-white shadow-lg">{initials}</div><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-coral-600">Peanut profile</p><h2 className="mt-1 font-serif text-2xl font-bold text-violet-950 dark:text-white">{profile.name || 'Your profile'}</h2><p className="mt-1 text-xs text-violet-500 dark:text-violet-300">Personal information stored on this device.</p></div></div></header>{loading ? <div className="flex min-h-72 items-center justify-center text-sm text-violet-400">Loading profile…</div> : <form onSubmit={saveProfile} className="space-y-4 p-6"><ProfileField icon={<UserRound size={15} />} label="Name" value={profile.name} onChange={(value) => setProfile((current) => ({ ...current, name: value }))} placeholder="Your name" autoFocus /><ProfileField icon={<Mail size={15} />} label="Email" type="email" value={profile.email} onChange={(value) => setProfile((current) => ({ ...current, email: value }))} placeholder="you@example.com" /><ProfileField icon={<Briefcase size={15} />} label="Role or title" value={profile.role} onChange={(value) => setProfile((current) => ({ ...current, role: value }))} placeholder="e.g. Developer, Student" /><label className="block"><span className="mb-1.5 block text-xs font-semibold text-violet-600 dark:text-violet-300">About me</span><textarea value={profile.bio} onChange={(event) => setProfile((current) => ({ ...current, bio: event.target.value }))} placeholder="A few details about you…" className="min-h-28 w-full resize-none rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-sm text-violet-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-violet-700 dark:bg-violet-950 dark:text-violet-100" /></label>{error && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-300">{error}</p>}{saved && <p className="rounded-xl bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-700 dark:bg-teal-950/40 dark:text-teal-300">Profile saved.</p>}<div className="flex justify-end gap-2 pt-1"><button type="button" onClick={onClose} className="rounded-xl border border-violet-200 px-4 py-2.5 text-xs font-semibold text-violet-500 dark:border-violet-700 dark:text-violet-300">Close</button><button disabled={saving} className="flex items-center gap-2 rounded-xl bg-coral-500 px-4 py-2.5 text-xs font-bold text-white hover:bg-coral-600 disabled:opacity-50"><Save size={14} />{saving ? 'Saving…' : 'Save profile'}</button></div></form>}</section></div>;
}

function ProfileField({ icon, label, value, onChange, type = 'text', placeholder, autoFocus = false }: { icon: ReactNode; label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; autoFocus?: boolean }) {
  return <label className="block"><span className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-violet-600 dark:text-violet-300">{icon}{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} autoFocus={autoFocus} className="h-11 w-full rounded-xl border border-violet-200 bg-white px-3 text-sm text-violet-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-violet-700 dark:bg-violet-950 dark:text-violet-100" /></label>;
}
