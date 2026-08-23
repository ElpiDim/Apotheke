import { useEffect, useMemo, useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from 'react';
import type { Task } from '@apotheke/contracts';
import { CalendarDays, Check, ChevronLeft, ChevronRight, Circle, List, MoreVertical, Pencil, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { api, jsonRequest } from '../../lib/api';
import { announceWorkspaceChange } from '../../lib/workspaceEvents';
import { useSearchParams } from 'react-router-dom';

type TaskFilter = 'all' | 'open' | 'done';
type TaskView = 'list' | 'calendar';

function localDay(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDeadline(value: string): string {
  return new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

function toDateTimeInput(value: string): string {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function TasksPage() {
  const [params, setParams] = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [view, setView] = useState<TaskView>('list');
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [error, setError] = useState('');

  async function load() {
    const result = await api<{ tasks: Task[] }>('/tasks');
    setTasks(result.tasks);
  }

  useEffect(() => { void load().catch((reason: Error) => setError(reason.message)); }, []);

  const today = localDay(new Date());
  const filtered = tasks.filter((task) => filter === 'all' || filter === 'done' && task.completedAt || filter === 'open' && !task.completedAt);
  const activeTasks = filtered.filter((task) => !task.completedAt);
  const completedTasks = filtered.filter((task) => task.completedAt);
  const todayTasks = activeTasks.filter((task) => task.dueAt && localDay(task.dueAt) === today);
  const upcomingTasks = activeTasks.filter((task) => task.dueAt && localDay(task.dueAt) > today);
  const overdueTasks = filtered.filter((task) => task.dueAt && localDay(task.dueAt) < today && !task.completedAt);
  const undatedTasks = activeTasks.filter((task) => !task.dueAt);

  const weekStats = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(start); end.setDate(end.getDate() + 7);
    const week = tasks.filter((task) => task.dueAt && new Date(task.dueAt) >= start && new Date(task.dueAt) < end);
    const total = week.length;
    const done = week.filter((task) => task.completedAt).length;
    const overdue = tasks.filter((task) => !task.completedAt && task.dueAt && new Date(task.dueAt) < start).length;
    return { total, done, open: total - done, overdue, percent: total ? Math.round(done / total * 100) : 0 };
  }, [tasks]);

  const calendarDays = useMemo(() => {
    const firstWeekday = (month.getDay() + 6) % 7;
    const start = new Date(month.getFullYear(), month.getMonth(), 1 - firstWeekday);
    return Array.from({ length: 42 }, (_, index) => { const date = new Date(start); date.setDate(start.getDate() + index); return date; });
  }, [month]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const dueValue = String(form.get('dueAt') ?? '');
    const payload = { title: String(form.get('title') ?? ''), description: String(form.get('description') ?? ''), dueAt: dueValue ? new Date(dueValue).toISOString() : null };
    setError('');
    try {
      await api(editingTask ? `/tasks/${editingTask.id}` : '/tasks', jsonRequest(editingTask ? 'PATCH' : 'POST', payload));
      await load();
      announceWorkspaceChange('tasks');
      closeModal();
    } catch (reason) { setError((reason as Error).message); }
  }

  async function toggle(task: Task) {
    await api(`/tasks/${task.id}`, jsonRequest('PATCH', { completed: !task.completedAt }));
    await load();
    announceWorkspaceChange('tasks');
  }

  async function remove(task: Task) {
    if (!window.confirm(`Delete “${task.title}”?`)) return;
    await api(`/tasks/${task.id}`, { method: 'DELETE' });
    await load();
    announceWorkspaceChange('tasks');
  }

  function newTask(day?: string) { setEditingTask(null); setSelectedDay(day ?? null); setModalOpen(true); }
  function editTask(task: Task) { setEditingTask(task); setSelectedDay(null); setModalOpen(true); }
  function closeModal() { setModalOpen(false); setSelectedDay(null); setEditingTask(null); }

  useEffect(() => {
    if (params.get('action') !== 'new') return;
    newTask();
    const next = new URLSearchParams(params);
    next.delete('action');
    setParams(next, { replace: true });
  }, [params, setParams]);

  return (
    <div>
      <section className="relative mb-4 min-h-40 px-5 py-5 sm:px-7">
        <div className="tasks-title-blob" />
        <div className="absolute right-28 top-4 hidden h-14 w-14 rounded-full bg-teal-200 shadow-lg xl:block" />
        <Sparkles className="absolute right-12 top-12 hidden text-white xl:block" size={20} />
        <div className="relative z-10"><p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-coral-600">Plan your work</p><h1 className="font-serif text-4xl font-semibold tracking-[-0.035em] text-violet-950 dark:text-violet-50 lg:text-5xl">Tasks</h1><p className="mt-2 text-sm text-violet-600 dark:text-violet-300">Stay on top of your important work.</p><button onClick={() => newTask()} className="mt-5 flex items-center gap-2 rounded-2xl bg-coral-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(255,128,102,0.28)] transition hover:-translate-y-1 hover:bg-coral-600"><Plus size={16} /> New task</button></div>
      </section>

      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-violet-100 bg-white p-1 shadow-sm dark:border-violet-700 dark:bg-[#211b35]">{(['all', 'open', 'done'] as TaskFilter[]).map((value) => <button key={value} onClick={() => setFilter(value)} className={`rounded-full px-5 py-2 text-xs font-semibold capitalize ${filter === value ? 'bg-violet-600 text-white' : 'text-violet-400 hover:text-violet-700 dark:hover:text-violet-100'}`}>{value}</button>)}</div>
        <div className="flex rounded-xl border border-violet-100 bg-white p-1 dark:border-violet-700 dark:bg-[#211b35]"><button onClick={() => setView('list')} className={`rounded-lg p-2 ${view === 'list' ? 'bg-violet-100 text-violet-700 dark:bg-violet-700 dark:text-white' : 'text-violet-300'}`} aria-label="List view"><List size={16} /></button><button onClick={() => setView('calendar')} className={`rounded-lg p-2 ${view === 'calendar' ? 'bg-violet-100 text-violet-700 dark:bg-violet-700 dark:text-white' : 'text-violet-300'}`} aria-label="Calendar view"><CalendarDays size={16} /></button></div>
      </div>

      {view === 'list' ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
          <section className="overflow-hidden rounded-[24px] border border-violet-100 bg-white shadow-[0_12px_32px_rgba(82,65,168,0.08)] dark:border-violet-800 dark:bg-[#211b35]">
            <TaskGroup title="Today" tasks={todayTasks} onToggle={toggle} onEdit={editTask} onRemove={remove} />
            <TaskGroup title="Upcoming" tasks={upcomingTasks} onToggle={toggle} onEdit={editTask} onRemove={remove} />
            <TaskGroup title="Overdue" tasks={overdueTasks} onToggle={toggle} onEdit={editTask} onRemove={remove} danger />
            <TaskGroup title="No deadline" tasks={undatedTasks} onToggle={toggle} onEdit={editTask} onRemove={remove} />
            <TaskGroup title="Completed" tasks={completedTasks} onToggle={toggle} onEdit={editTask} onRemove={remove} completed />
            {filtered.length === 0 && <div className="flex min-h-56 flex-col items-center justify-center text-center"><img src="/pini-mascot.png" alt="Pini" className="mb-2 max-h-24 w-auto drop-shadow-[0_8px_8px_rgba(69,35,104,0.16)]" /><Check className="mb-2 text-teal-400" size={20} /><p className="text-sm font-semibold text-violet-900 dark:text-violet-100">Nothing here</p><p className="mt-1 text-xs text-violet-400">Create a task or choose another filter.</p></div>}
          </section>
          <WeekSummary {...weekStats} />
        </div>
      ) : (
        <CalendarView month={month} setMonth={setMonth} days={calendarDays} tasks={tasks} today={today} onNewTask={newTask} />
      )}

      {modalOpen && <TaskModal selectedDay={selectedDay} task={editingTask} onClose={closeModal} onSubmit={save} />}
    </div>
  );
}

function TaskGroup({ title, tasks, onToggle, onEdit, onRemove, danger = false, completed = false }: { title: string; tasks: Task[]; onToggle: (task: Task) => Promise<void>; onEdit: (task: Task) => void; onRemove: (task: Task) => Promise<void>; danger?: boolean; completed?: boolean }) {
  if (tasks.length === 0) return null;
  return <div className="border-b border-violet-100 p-5 last:border-0 dark:border-violet-800"><h2 className={`mb-3 font-serif text-lg font-semibold ${danger ? 'text-red-500' : completed ? 'text-teal-600 dark:text-teal-300' : 'text-violet-950 dark:text-violet-50'}`}>{title}</h2><div className="space-y-2">{tasks.map((task, index) => <div key={task.id} className={`group flex items-center gap-3 rounded-xl border px-3 py-2.5 transition hover:shadow-sm ${completed ? 'border-teal-100 bg-teal-50/40 hover:border-teal-200 dark:border-teal-900 dark:bg-teal-950/20' : 'border-violet-100 hover:border-violet-200 dark:border-violet-800 dark:hover:border-violet-600'}`}><button onClick={() => void onToggle(task)} className={task.completedAt ? 'text-teal-500' : 'text-violet-400'} aria-label={task.completedAt ? 'Mark as open' : 'Mark as done'}>{task.completedAt ? <Check size={18} /> : <Circle size={18} />}</button><button onClick={() => onEdit(task)} className="min-w-0 flex-1 text-left"><span className={`block truncate text-xs font-semibold ${task.completedAt ? 'text-violet-400 line-through dark:text-violet-500' : 'text-violet-900 dark:text-violet-100'}`}>{task.title}</span>{task.description && <span className="mt-0.5 block truncate text-[10px] text-violet-400">{task.description}</span>}</button>{task.dueAt && <span className="hidden text-[10px] text-violet-400 sm:block">{formatDeadline(task.dueAt)}</span>}<span className={`h-2 w-2 rounded-full ${completed ? 'bg-teal-400' : danger ? 'bg-red-500' : index % 3 === 0 ? 'bg-coral-500' : index % 3 === 1 ? 'bg-amber-400' : 'bg-teal-400'}`} /><div className="relative flex gap-1 opacity-0 transition group-hover:opacity-100"><button onClick={() => onEdit(task)} className="p-1 text-violet-300 hover:text-violet-600"><Pencil size={13} /></button><button onClick={() => void onRemove(task)} className="p-1 text-violet-300 hover:text-red-500"><Trash2 size={13} /></button><MoreVertical size={14} className="text-violet-300" /></div></div>)}</div></div>;
}

function WeekSummary({ total, done, open, overdue, percent }: { total: number; done: number; open: number; overdue: number; percent: number }) {
  const complete = total > 0 && done === total;
  return <aside className="relative h-fit overflow-hidden rounded-[24px] border border-violet-100 bg-white p-5 shadow-[0_12px_32px_rgba(82,65,168,0.08)] dark:border-violet-800 dark:bg-[#211b35]"><h2 className="font-serif text-lg font-semibold text-violet-950 dark:text-violet-50">This week</h2>{complete ? <div className="py-4 text-center"><img src="/pini-congrats.png" alt="Pini celebrating with one hand raised" className="mx-auto max-h-36 w-auto drop-shadow-[0_9px_9px_rgba(69,35,104,0.18)]" /><p className="mt-2 font-serif text-lg font-semibold text-violet-950 dark:text-white">You did it!</p><p className="mt-1 text-xs text-teal-600 dark:text-teal-300">Pini says: everything is done.</p></div> : <><div className="mx-auto mt-5 flex h-36 w-36 items-center justify-center rounded-full" style={{ background: `conic-gradient(#714cff ${percent * 3.6}deg, var(--apotheke-border) 0deg)` }}><div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-white dark:bg-[#211b35]"><span className="text-2xl font-semibold text-violet-950 dark:text-violet-50">{done} / {total}</span><span className="mt-1 text-[10px] text-violet-400">tasks done</span></div></div><p className="mt-3 text-center text-xs font-semibold text-violet-600 dark:text-violet-300">{percent}% completed</p></>}<div className="mt-5 space-y-3 border-t border-violet-100 pt-4 text-xs dark:border-violet-800"><Stat color="bg-teal-400" label="Done" value={done} /><Stat color="bg-violet-400" label="Open" value={open} /><Stat color="bg-red-500" label="Overdue" value={overdue} /></div></aside>;
}

function Stat({ color, label, value }: { color: string; label: string; value: number }) { return <div className="flex items-center"><span className={`mr-2 h-2 w-2 rounded-full ${color}`} /><span className="text-violet-500 dark:text-violet-300">{label}</span><span className="ml-auto font-semibold text-violet-800 dark:text-violet-100">{value}</span></div>; }

function CalendarView({ month, setMonth, days, tasks, today, onNewTask }: { month: Date; setMonth: (date: Date) => void; days: Date[]; tasks: Task[]; today: string; onNewTask: (day?: string) => void }) {
  return <section className="overflow-x-auto rounded-[24px] border border-violet-100 bg-white p-4 shadow-[0_12px_32px_rgba(82,65,168,0.08)] dark:border-violet-800 dark:bg-[#211b35] sm:p-5"><div className="mb-5 flex min-w-[640px] items-center justify-between"><h2 className="font-serif text-xl font-semibold text-violet-950 dark:text-violet-50">{new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(month)}</h2><div className="flex gap-1"><button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="rounded-lg p-2 text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900"><ChevronLeft size={17} /></button><button onClick={() => setMonth(new Date())} className="rounded-lg px-3 text-[11px] font-semibold text-violet-500">Today</button><button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="rounded-lg p-2 text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900"><ChevronRight size={17} /></button></div></div><div className="grid min-w-[640px] grid-cols-7 text-center text-[10px] font-semibold uppercase tracking-wide text-violet-300">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <div key={day} className="pb-2">{day}</div>)}</div><div className="grid min-w-[640px] grid-cols-7 overflow-hidden rounded-xl border border-violet-100 dark:border-violet-800">{days.map((date) => { const key = localDay(date); const dayTasks = tasks.filter((task) => task.dueAt && localDay(task.dueAt) === key); return <button key={key} onClick={() => onNewTask(key)} className="min-h-24 border-b border-r border-violet-100 p-2 text-left hover:bg-violet-50 dark:border-violet-800 dark:hover:bg-violet-900"><span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${key === today ? 'bg-coral-500 text-white' : 'text-violet-600 dark:text-violet-300'}`}>{date.getDate()}</span><div className="mt-1 space-y-1">{dayTasks.slice(0, 3).map((task) => <div key={task.id} className={`truncate rounded-md px-1.5 py-1 text-[9px] ${task.completedAt ? 'bg-teal-50 text-teal-500 line-through' : 'bg-violet-100 text-violet-700'}`}>{task.title}</div>)}</div></button>; })}</div></section>;
}

function TaskModal({ selectedDay, task, onClose, onSubmit }: { selectedDay: string | null; task: Task | null; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const defaultDue = task?.dueAt ? toDateTimeInput(task.dueAt) : selectedDay ? `${selectedDay}T09:00` : '';
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-violet-950/40 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-[24px] border border-violet-100 bg-white p-6 shadow-2xl dark:border-violet-700 dark:bg-[#211b35]"><div className="mb-5 flex items-center justify-between"><h2 className="font-serif text-xl font-semibold text-violet-950 dark:text-violet-50">{task ? 'Edit task' : 'New task'}</h2><button onClick={onClose} className="rounded-lg p-1.5 text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900"><X size={17} /></button></div><form onSubmit={onSubmit} className="space-y-4"><Field label="What needs to be done?" name="title" defaultValue={task?.title ?? ''} autoFocus required /><label className="block"><span className="mb-1.5 block text-xs font-semibold text-violet-600 dark:text-violet-300">Notes</span><textarea name="description" defaultValue={task?.description ?? ''} rows={4} className="w-full resize-none rounded-xl border border-violet-200 px-3 py-2 text-sm text-violet-900 outline-none focus:border-violet-400 dark:border-violet-700 dark:text-violet-100" /></label><Field label="Due date and time" name="dueAt" type="datetime-local" defaultValue={defaultDue} /><Actions onClose={onClose}>{task ? 'Save changes' : 'Create task'}</Actions></form></div></div>;
}

function Field({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) { return <label className="block"><span className="mb-1.5 block text-xs font-semibold text-violet-600 dark:text-violet-300">{label}</span><input {...props} className="h-10 w-full rounded-xl border border-violet-200 px-3 text-sm text-violet-900 outline-none focus:border-violet-400 dark:border-violet-700 dark:text-violet-100" /></label>; }
function Actions({ onClose, children }: { onClose: () => void; children: ReactNode }) { return <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={onClose} className="rounded-xl border border-violet-200 px-4 py-2 text-xs font-semibold text-violet-600 dark:border-violet-700 dark:text-violet-300">Cancel</button><button className="rounded-xl bg-coral-500 px-4 py-2 text-xs font-semibold text-white hover:bg-coral-600">{children}</button></div>; }
