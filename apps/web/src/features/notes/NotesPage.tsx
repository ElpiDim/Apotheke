import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CreateNoteInput, Note } from '@apotheke/contracts';
import { Clock3, Plus, Save, Sparkles, Star, StickyNote, Trash2, X } from 'lucide-react';
import { EmptyState } from '../../components/EmptyState';
import { api, ApiError, jsonRequest } from '../../lib/api';
import { formatDate } from '../../lib/format';
import { announceWorkspaceChange, onWorkspaceChange } from '../../lib/workspaceEvents';
import { useSearchParams } from 'react-router-dom';

const emptyDraft: CreateNoteInput = { title: '', content: '', category: null, tags: [] };
type NoteFilter = 'all' | 'important' | 'recent';

export function NotesPage() {
  const [params, setParams] = useSearchParams();
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CreateNoteInput>(emptyDraft);
  const [tagText, setTagText] = useState('');
  const [filter, setFilter] = useState<NoteFilter>('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await api<{ notes: Note[] }>('/notes');
    setNotes(result.notes);
  }, []);

  useEffect(() => {
    void load().catch(() => undefined);
    const unsubscribe = onWorkspaceChange((resources) => {
      if (resources.includes('notes')) void load().catch(() => undefined);
    });
    const refreshOnFocus = () => void load().catch(() => undefined);
    window.addEventListener('focus', refreshOnFocus);
    return () => { unsubscribe(); window.removeEventListener('focus', refreshOnFocus); };
  }, [load]);

  const selected = useMemo(() => notes.find((note) => note.id === selectedId) ?? null, [notes, selectedId]);
  const visible = useMemo(() => notes.filter((note) => {
    if (filter === 'important') return note.category?.name.toLowerCase() === 'important' || note.tags.some((tag) => tag.name.toLowerCase() === 'important');
    if (filter === 'recent') return Date.now() - new Date(note.updatedAt).getTime() < 7 * 24 * 60 * 60 * 1000;
    return true;
  }), [filter, notes]);

  function selectNote(note: Note) {
    setSelectedId(note.id);
    setDraft({ title: note.title, content: note.content, category: note.category?.name ?? null, tags: note.tags.map((tag) => tag.name) });
    setTagText(note.tags.map((tag) => tag.name).join(', '));
    setError(null);
    setEditorOpen(true);
  }

  function newNote() {
    setSelectedId(null);
    setDraft(emptyDraft);
    setTagText('');
    setError(null);
    setEditorOpen(true);
  }

  useEffect(() => {
    if (params.get('action') !== 'new') return;
    newNote();
    const next = new URLSearchParams(params);
    next.delete('action');
    setParams(next, { replace: true });
  }, [params, setParams]);

  function closeEditor() {
    setEditorOpen(false);
    setError(null);
  }

  async function save() {
    const input = { ...draft, tags: tagText.split(',').map((tag) => tag.trim()).filter(Boolean) };
    if (!input.title.trim()) { setError('A note needs a title.'); return; }
    setSaving(true);
    setError(null);
    try {
      await (selectedId
        ? api<{ note: Note }>(`/notes/${selectedId}`, jsonRequest('PATCH', input))
        : api<{ note: Note }>('/notes', jsonRequest('POST', input)));
      announceWorkspaceChange('notes', 'categories');
      await load();
      setEditorOpen(false);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'The note could not be saved.');
    } finally { setSaving(false); }
  }

  async function remove() {
    if (!selectedId || !window.confirm(`Delete “${selected?.title ?? 'this note'}”?`)) return;
    await api(`/notes/${selectedId}`, { method: 'DELETE' });
    announceWorkspaceChange('notes', 'categories');
    setEditorOpen(false);
    setSelectedId(null);
    await load();
  }

  return (
    <div>
      <section className="relative mb-6 min-h-40 px-5 py-5 sm:px-7">
        <div className="notes-title-blob" />
        <div className="absolute right-8 top-5 hidden h-20 w-20 rounded-full border-4 border-dotted border-violet-400/60 xl:block" />
        <div className="relative z-10">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-coral-600">Notes</p>
          <h1 className="font-serif text-4xl font-semibold tracking-[-0.035em] text-violet-950 dark:text-violet-50 lg:text-5xl">Notes</h1>
          <p className="mt-2 text-sm text-violet-600 dark:text-violet-300">Capture thoughts, snippets and ideas.</p>
          <button onClick={newNote} className="mt-5 flex items-center gap-2 rounded-2xl bg-coral-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(255,128,102,0.28)] transition hover:-translate-y-1 hover:bg-coral-600"><Plus size={16} /> New note</button>
          <Sparkles className="absolute left-64 top-24 hidden text-coral-500 xl:block" size={20} />
        </div>
      </section>

      <div className="mb-6 flex justify-end">
        <div className="inline-flex rounded-full border border-violet-100 bg-white p-1.5 shadow-[0_8px_24px_rgba(82,65,168,0.08)] dark:border-violet-700 dark:bg-[#211b35]">
          {([
            ['all', 'All'], ['important', 'Important'], ['recent', 'Recent'],
          ] as [NoteFilter, string][]).map(([value, label]) => <button key={value} onClick={() => setFilter(value)} className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold ${filter === value ? 'bg-violet-100 text-violet-700 dark:bg-violet-700 dark:text-white' : 'text-violet-400 hover:text-violet-700 dark:hover:text-violet-100'}`}>{value === 'important' && <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />}{value === 'recent' && <Clock3 size={12} />}{label}</button>)}
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState icon={StickyNote} title={notes.length === 0 ? 'No notes yet' : 'No matching notes'} description={notes.length === 0 ? 'Create your first note to start capturing ideas.' : 'Try another filter.'} action={notes.length === 0 ? <button onClick={newNote} className="font-semibold text-violet-600">Create a note</button> : undefined} />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((note, index) => <NoteCard key={note.id} note={note} index={index} onClick={() => selectNote(note)} />)}
        </div>
      )}

      {editorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-violet-950/45 p-4 backdrop-blur-sm">
          <section className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[26px] border border-violet-100 bg-white shadow-2xl dark:border-violet-700 dark:bg-[#211b35]">
            <header className="flex items-center justify-between border-b border-violet-100 px-5 py-4 dark:border-violet-800"><span className="text-xs font-semibold uppercase tracking-[0.14em] text-coral-600">{selectedId ? 'Edit note' : 'New note'}</span><div className="flex gap-2">{selectedId && <button onClick={() => void remove()} className="rounded-xl p-2 text-violet-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"><Trash2 size={16} /></button>}<button onClick={closeEditor} className="rounded-xl p-2 text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900"><X size={17} /></button></div></header>
            <div className="overflow-auto p-5 sm:p-7"><input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Note title" autoFocus className="w-full border-0 bg-transparent font-serif text-3xl font-semibold text-violet-950 outline-none placeholder:text-violet-200 dark:text-violet-50 dark:placeholder:text-violet-700" /><div className="mt-5 grid grid-cols-1 gap-3 border-y border-violet-100 py-4 sm:grid-cols-2 dark:border-violet-800"><input value={draft.category ?? ''} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value || null }))} placeholder="Category" className="rounded-xl border border-violet-200 px-3 py-2 text-xs outline-none focus:border-violet-400 dark:border-violet-700" /><input value={tagText} onChange={(event) => setTagText(event.target.value)} placeholder="Tags, separated by commas" className="rounded-xl border border-violet-200 px-3 py-2 text-xs outline-none focus:border-violet-400 dark:border-violet-700" /></div><textarea value={draft.content} onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))} placeholder="Write your note…" className="mt-5 min-h-[360px] w-full resize-none border-0 bg-transparent text-sm leading-7 text-violet-800 outline-none placeholder:text-violet-300 dark:text-violet-100 dark:placeholder:text-violet-700" />{error && <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}</div>
            <footer className="flex justify-end gap-2 border-t border-violet-100 px-5 py-4 dark:border-violet-800"><button onClick={closeEditor} className="rounded-xl border border-violet-200 px-4 py-2 text-xs font-semibold text-violet-600 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-300 dark:hover:bg-violet-900">Cancel</button><button onClick={() => void save()} disabled={saving} className="flex items-center gap-2 rounded-xl bg-coral-500 px-4 py-2 text-xs font-semibold text-white hover:bg-coral-600 disabled:opacity-50"><Save size={14} />{saving ? 'Saving…' : 'Save note'}</button></footer>
          </section>
        </div>
      )}
    </div>
  );
}

function NoteCard({ note, index, onClick }: { note: Note; index: number; onClick: () => void }) {
  const tones = [
    'bg-white dark:bg-[#211b35]',
    'bg-violet-50 dark:bg-[#28213e]',
    'bg-orange-50 dark:bg-[#312039]',
    'bg-teal-50 dark:bg-[#183538]',
  ];
  const tapes = ['bg-violet-300', 'bg-fuchsia-300', 'bg-orange-300', 'bg-teal-300'];
  return <button onClick={onClick} className={`group relative min-h-48 overflow-visible rounded-[18px] border border-violet-100 p-5 text-left shadow-[0_10px_24px_rgba(82,65,168,0.08)] transition hover:-translate-y-1 hover:shadow-[0_16px_32px_rgba(82,65,168,0.13)] dark:border-violet-800 ${tones[index % tones.length]}`}><span className={`absolute -left-2 -top-2 h-5 w-12 -rotate-12 opacity-70 ${tapes[index % tapes.length]}`} /><h2 className="font-serif text-base font-semibold text-violet-950 dark:text-violet-50">{note.title}</h2><p className="mt-3 line-clamp-5 whitespace-pre-line text-xs leading-5 text-violet-600 dark:text-violet-300">{note.content || 'Empty note'}</p><div className="absolute bottom-4 left-5 right-5 flex items-center gap-2"><span className="max-w-[45%] truncate rounded-md bg-violet-100 px-2 py-1 text-[9px] font-semibold text-violet-600 dark:bg-violet-900 dark:text-violet-300">{note.category?.name ?? 'Personal'}</span><span className="ml-auto text-[9px] text-violet-400">Updated {formatDate(note.updatedAt)}</span><Star size={14} className="text-violet-300 transition group-hover:fill-amber-300 group-hover:text-amber-400" /></div></button>;
}
