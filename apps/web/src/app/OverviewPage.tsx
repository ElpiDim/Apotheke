import { useEffect, useState } from 'react';
import type { DocumentRecord, Note } from '@apotheke/contracts';
import { BookOpen, ChevronRight, FileText, Library, Search, Sparkles, Star, StickyNote } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { formatDate } from '../lib/format';
import { onWorkspaceChange } from '../lib/workspaceEvents';

interface OverviewState {
  documents: DocumentRecord[];
  notes: Note[];
}

export function OverviewPage() {
  const [state, setState] = useState<OverviewState>({ documents: [], notes: [] });

  useEffect(() => {
    let active = true;
    const load = () => Promise.all([
      api<{ documents: DocumentRecord[] }>('/documents'),
      api<{ notes: Note[] }>('/notes'),
    ]).then(([documents, notes]) => {
      if (active) setState({ documents: documents.documents, notes: notes.notes });
    }).catch(() => undefined);
    void load();
    const unsubscribe = onWorkspaceChange((resources) => {
      if (resources.some((resource) => ['documents', 'notes', 'categories'].includes(resource))) void load();
    });
    const refreshOnFocus = () => void load();
    window.addEventListener('focus', refreshOnFocus);
    return () => { active = false; unsubscribe(); window.removeEventListener('focus', refreshOnFocus); };
  }, []);

  const recent = [
    ...state.documents.map((document) => ({
      id: document.id,
      kind: 'Document',
      title: document.title,
      date: document.updatedAt,
      meta: document.category?.name ?? document.currentVersion.originalFilename,
    })),
    ...state.notes.map((note) => ({
      id: note.id,
      kind: 'Note',
      title: note.title,
      date: note.updatedAt,
      meta: note.category?.name ?? 'Uncategorized',
    })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);

  const categories = new Set([
    ...state.documents.map((item) => item.category?.name).filter(Boolean),
    ...state.notes.map((item) => item.category?.name).filter(Boolean),
  ]).size;

  return (
    <div className="overview-playful">
      <section className="relative grid min-h-[360px] grid-cols-1 items-center gap-4 pb-20 sm:grid-cols-[0.78fr_1.22fr] sm:pb-16 lg:gap-8">
        <div className="relative z-10 px-1 sm:pl-2 lg:pl-4">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-coral-600">Knowledge base</p>
          <h1 className="max-w-md font-serif text-4xl font-semibold leading-[0.98] tracking-[-0.04em] text-violet-950 dark:text-violet-50 lg:text-[54px]">Your technical<br />workspace</h1>
          <p className="mt-5 max-w-xs text-sm leading-6 text-violet-600 dark:text-violet-300">Documents and notes stay searchable on this device.</p>
          <Link to="/documents" className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-coral-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(255,128,102,0.30)] transition hover:-translate-y-1 hover:bg-coral-600"><FileText size={15} /> Import document</Link>
          <Sparkles className="absolute -bottom-3 -left-2 text-violet-500" size={25} />
        </div>

        <div className="relative min-h-[280px] sm:min-h-[310px] lg:min-h-[330px]">
          <HeroArtwork />
          <div className="absolute -bottom-14 left-1/2 z-10 grid w-[98%] -translate-x-1/2 grid-cols-3 gap-1.5 sm:-bottom-8 sm:w-[96%] lg:w-[88%] lg:gap-3">
            <Metric to="/documents" label="Documents" value={state.documents.length} icon={FileText} tone="violet" />
            <Metric to="/notes" label="Notes" value={state.notes.length} icon={StickyNote} tone="coral" />
            <Metric to="/categories" label="Categories" value={categories} icon={Library} tone="teal" />
          </div>
        </div>
      </section>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-[1.45fr_0.95fr]">
        <section className="paper-panel relative overflow-hidden rounded-[24px] border border-violet-100 bg-white p-5 shadow-[0_12px_32px_rgba(82,65,168,0.08)] dark:border-violet-800 dark:bg-[#211b35] sm:p-6">
          <div className="absolute -bottom-5 -left-4 h-16 w-16 rounded-full border-4 border-dotted border-teal-300/70" />
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-serif text-lg font-semibold text-violet-950 dark:text-violet-50">Recently updated</h2>
            <span className="h-1 w-8 rounded-full bg-violet-500" />
          </div>
          {recent.length === 0 ? (
            <div className="flex min-h-44 flex-col items-center justify-center text-center"><Library size={22} className="mb-3 text-violet-300" /><p className="text-sm font-medium text-violet-700 dark:text-violet-200">Your workspace is empty</p><p className="mt-1 text-xs text-violet-400">Import a document or create your first note.</p></div>
          ) : (
            <div className="divide-y divide-violet-100 dark:divide-violet-800">
              {recent.map((item) => (
                <div key={`${item.kind}-${item.id}`} className="group flex items-center gap-3 py-3.5">
                  <div className="rounded-xl bg-violet-100 p-2.5 text-violet-600 dark:bg-violet-900 dark:text-violet-300">{item.kind === 'Document' ? <FileText size={15} /> : <StickyNote size={15} />}</div>
                  <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-semibold text-violet-900 dark:text-violet-100">{item.title}</p><p className="mt-0.5 truncate text-[11px] text-violet-400">{item.kind} · {item.meta}</p></div>
                  <span className="hidden text-[10px] text-violet-400 sm:block">{formatDate(item.date)}</span>
                  <Star size={14} className="text-violet-300 transition group-hover:fill-amber-300 group-hover:text-amber-400" />
                </div>
              ))}
            </div>
          )}
          <div className="mt-5 flex justify-center"><Link to="/documents" className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-5 py-2.5 text-xs font-semibold text-violet-700 shadow-sm hover:-translate-y-0.5 hover:shadow-md dark:border-violet-700 dark:bg-violet-950 dark:text-violet-200">View all <ChevronRight size={14} /></Link></div>
        </section>

        <section className="paper-panel paper-panel-tilted relative rounded-[24px] border border-violet-100 bg-white p-5 shadow-[8px_10px_0_rgba(139,123,224,0.18)] dark:border-violet-800 dark:bg-[#211b35] sm:p-6">
          <div className="absolute -right-2 -top-3 h-7 w-20 rotate-12 bg-violet-300/70" />
          <div className="mb-2 flex items-center gap-2 font-serif text-lg font-semibold text-violet-950 dark:text-violet-50"><Search size={17} /> Search syntax <Sparkles size={14} className="text-violet-400" /></div>
          <p className="text-xs leading-5 text-violet-500 dark:text-violet-300">Full-text search covers document contents, notes, integrations, folders and PDF filenames.</p>
          <div className="mt-5 space-y-1 text-xs">
            <SyntaxRow code='"wallet API"' label="Exact phrase" />
            <SyntaxRow code="SDK AND token" label="Both terms" />
            <SyntaxRow code="DRS OR RabbitMQ" label="Either term" />
            <SyntaxRow code="API NOT legacy" label="Exclude term" />
          </div>
          <div className="pointer-events-none absolute -bottom-5 -right-5 h-16 w-16 rounded-full border-2 border-violet-500/50 border-l-transparent border-t-transparent" />
        </section>
      </div>
    </div>
  );
}

function HeroArtwork() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute left-[8%] top-[8%] h-[78%] w-[82%] rounded-[46%_54%_42%_58%/56%_38%_62%_44%] bg-gradient-to-br from-violet-400 via-violet-500 to-violet-700 shadow-[0_24px_60px_rgba(103,85,195,0.25)]" />
      <div className="absolute left-[5%] top-[10%] h-14 w-14 rounded-full bg-teal-200 shadow-lg sm:h-16 sm:w-16" />
      <div className="absolute right-[8%] top-0 h-16 w-16 rounded-full bg-coral-500 shadow-lg sm:h-20 sm:w-20" />
      <div className="absolute left-[26%] top-[23%] h-40 w-28 -rotate-6 rounded-xl bg-white p-4 shadow-2xl dark:bg-violet-50">
        <span className="absolute -right-1 -top-1 h-8 w-8 bg-violet-100 [clip-path:polygon(0_0,100%_100%,0_100%)]" />
        <div className="mt-4 space-y-2"><div className="h-1.5 w-14 rounded bg-violet-200" /><div className="h-1.5 w-16 rounded bg-violet-200" /><div className="h-1.5 w-12 rounded bg-violet-200" /><div className="h-1.5 w-14 rounded bg-violet-200" /></div>
      </div>
      <div className="absolute right-[25%] top-[28%] h-40 w-28 rotate-[15deg] rounded-xl bg-violet-800 p-4 shadow-2xl ring-4 ring-violet-700"><BookOpen className="mx-auto mt-9 text-violet-200" size={36} /><div className="absolute right-2 top-3 h-5 w-12 rounded bg-violet-300/70" /></div>
      <div className="absolute left-[49%] top-[48%] h-20 w-20 rotate-6 rounded-lg bg-amber-300 p-3 shadow-xl"><div className="mt-7 h-px w-10 rotate-6 bg-violet-700" /><div className="mt-2 h-px w-8 -rotate-6 bg-violet-700" /></div>
      <img src="/pini-mascot.png" alt="Pini, your Peanut assistant" className="absolute bottom-[9%] right-[8%] z-10 max-h-[132px] w-auto drop-shadow-[0_12px_12px_rgba(48,27,90,0.28)] sm:max-h-[155px] lg:max-h-[175px]" />
      <Sparkles className="absolute right-[18%] top-[14%] text-amber-200" size={22} />
      <Sparkles className="absolute bottom-[18%] left-[17%] text-white" size={15} />
      <div className="absolute bottom-[15%] right-[10%] h-12 w-24 rotate-12 border-t-2 border-violet-900" />
    </div>
  );
}

function Metric({ to, label, value, icon: Icon, tone }: { to: string; label: string; value: number; icon: typeof FileText; tone: 'violet' | 'coral' | 'teal' }) {
  const colors = { violet: 'bg-violet-100 text-violet-600', coral: 'bg-orange-100 text-coral-600', teal: 'bg-teal-100 text-teal-700' };
  return <Link to={to} className="group flex min-w-0 items-center gap-2 rounded-full border border-violet-100 bg-white px-3 py-3 shadow-[0_10px_24px_rgba(82,65,168,0.14)] transition hover:-translate-y-1 dark:border-violet-700 dark:bg-[#28213e] sm:gap-3 sm:px-5"><div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full sm:h-11 sm:w-11 ${colors[tone]}`}><Icon size={18} /></div><div className="min-w-0"><div className="text-sm font-semibold text-violet-950 dark:text-violet-50">{value}</div><div className="truncate text-[9px] font-medium text-violet-500 dark:text-violet-300 sm:text-[10px]">{label}</div></div></Link>;
}

function SyntaxRow({ code, label }: { code: string; label: string }) {
  return <div className="flex items-center justify-between gap-3 border-b border-violet-100 py-2.5 last:border-0 dark:border-violet-800"><code className="rounded-md bg-violet-50 px-2 py-1 text-[10px] text-violet-700 dark:bg-violet-950 dark:text-violet-200">{code}</code><span className="text-[10px] text-violet-400">{label}</span></div>;
}
