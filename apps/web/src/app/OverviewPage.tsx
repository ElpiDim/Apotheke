import { useEffect, useState } from 'react';
import type { DocumentRecord, Note } from '@apotheke/contracts';
import { FileText, Library, Search, StickyNote } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { formatDate } from '../lib/format';

interface OverviewState {
  documents: DocumentRecord[];
  notes: Note[];
}

export function OverviewPage() {
  const [state, setState] = useState<OverviewState>({ documents: [], notes: [] });

  useEffect(() => {
    void Promise.all([
      api<{ documents: DocumentRecord[] }>('/documents'),
      api<{ notes: Note[] }>('/notes'),
    ]).then(([documents, notes]) => {
      setState({ documents: documents.documents, notes: notes.notes });
    }).catch(() => undefined);
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
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);

  const categories = new Set([
    ...state.documents.map((item) => item.category?.name).filter(Boolean),
    ...state.notes.map((item) => item.category?.name).filter(Boolean),
  ]).size;

  return (
    <div>
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">Knowledge base</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Your technical workspace</h1>
          <p className="mt-1.5 text-sm text-slate-500">Documents and notes stay searchable on this device.</p>
        </div>
        <Link to="/documents" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
          Import document
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Documents', value: state.documents.length, icon: FileText },
          { label: 'Notes', value: state.notes.length, icon: StickyNote },
          { label: 'Categories', value: categories, icon: Library },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><Icon size={17} /></div>
            <div className="text-2xl font-semibold text-slate-900">{value}</div>
            <div className="mt-0.5 text-xs font-medium text-slate-500">{label}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-[1.5fr_1fr] gap-6">
        <section className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-800">Recently updated</h2>
          </div>
          {recent.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
              <Library size={22} className="mb-3 text-slate-300" />
              <p className="text-sm font-medium text-slate-700">Your workspace is empty</p>
              <p className="mt-1 text-xs text-slate-500">Import a technical document or create your first note.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recent.map((item) => (
                <div key={`${item.kind}-${item.id}`} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="rounded-md bg-slate-100 p-2 text-slate-500">
                    {item.kind === 'Document' ? <FileText size={15} /> : <StickyNote size={15} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-slate-800">{item.title}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-400">{item.kind} · {item.meta}</p>
                  </div>
                  <span className="text-xs text-slate-400">{formatDate(item.date)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800"><Search size={16} /> Search syntax</div>
          <p className="mt-2 text-xs leading-5 text-slate-500">Full-text search covers document contents, notes, categories, tags and version labels.</p>
          <div className="mt-5 space-y-3 text-xs">
            <SyntaxRow code='"wallet API"' label="Exact phrase" />
            <SyntaxRow code="SDK AND token" label="Both terms" />
            <SyntaxRow code="DRS OR RabbitMQ" label="Either term" />
            <SyntaxRow code="API NOT legacy" label="Exclude term" />
          </div>
        </section>
      </div>
    </div>
  );
}

function SyntaxRow({ code, label }: { code: string; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-0">
      <code className="rounded bg-slate-100 px-2 py-1 text-[11px] text-slate-700">{code}</code>
      <span className="text-slate-400">{label}</span>
    </div>
  );
}
