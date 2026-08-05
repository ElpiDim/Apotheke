import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CreateNoteInput, Note } from '@apotheke/contracts';
import { Plus, Save, StickyNote, Trash2 } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { api, ApiError, jsonRequest } from '../../lib/api';
import { formatDate } from '../../lib/format';

const emptyDraft: CreateNoteInput = { title: '', content: '', category: null, tags: [] };

export function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CreateNoteInput>(emptyDraft);
  const [tagText, setTagText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await api<{ notes: Note[] }>('/notes');
    setNotes(result.notes);
  }, []);

  useEffect(() => { void load().catch(() => undefined); }, [load]);

  const selected = useMemo(
    () => notes.find((note) => note.id === selectedId) ?? null,
    [notes, selectedId],
  );

  function selectNote(note: Note) {
    setSelectedId(note.id);
    setDraft({
      title: note.title,
      content: note.content,
      category: note.category?.name ?? null,
      tags: note.tags.map((tag) => tag.name),
    });
    setTagText(note.tags.map((tag) => tag.name).join(', '));
    setError(null);
  }

  function newNote() {
    setSelectedId(null);
    setDraft(emptyDraft);
    setTagText('');
    setError(null);
  }

  async function save() {
    const input = {
      ...draft,
      tags: tagText.split(',').map((tag) => tag.trim()).filter(Boolean),
    };
    if (!input.title.trim()) {
      setError('A note needs a title.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const result = selectedId
        ? await api<{ note: Note }>(`/notes/${selectedId}`, jsonRequest('PATCH', input))
        : await api<{ note: Note }>('/notes', jsonRequest('POST', input));
      await load();
      setSelectedId(result.note.id);
      setDraft({ title: result.note.title, content: result.note.content, category: result.note.category?.name ?? null, tags: result.note.tags.map((tag) => tag.name) });
      setTagText(result.note.tags.map((tag) => tag.name).join(', '));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'The note could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!selectedId || !window.confirm(`Delete “${selected?.title ?? 'this note'}”?`)) return;
    await api(`/notes/${selectedId}`, { method: 'DELETE' });
    newNote();
    await load();
  }

  return (
    <div>
      <PageHeader
        eyebrow="Knowledge"
        title="Notes"
        description="Capture technical context that does not belong inside a document."
        action={<button onClick={newNote} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"><Plus size={16} /> New note</button>}
      />

      <div className="grid min-h-[650px] grid-cols-[310px_minmax(0,1fr)] overflow-hidden rounded-xl border border-slate-200 bg-white">
        <aside className="border-r border-slate-200 bg-slate-50/60">
          <div className="border-b border-slate-200 px-4 py-3 text-xs font-semibold text-slate-500">{notes.length} {notes.length === 1 ? 'note' : 'notes'}</div>
          <div className="max-h-[610px] overflow-auto p-2">
            {notes.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <StickyNote className="mx-auto mb-2 text-slate-300" size={20} />
                <p className="text-xs text-slate-400">No saved notes yet.</p>
              </div>
            ) : notes.map((note) => (
              <button
                key={note.id}
                onClick={() => selectNote(note)}
                className={`mb-1 w-full rounded-lg px-3 py-3 text-left ${selectedId === note.id ? 'bg-white shadow-sm ring-1 ring-slate-200' : 'hover:bg-white/80'}`}
              >
                <div className="truncate text-[13px] font-semibold text-slate-800">{note.title}</div>
                <div className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-400">{note.content || 'Empty note'}</div>
                <div className="mt-2 text-[10px] text-slate-400">{note.category?.name ?? 'Uncategorized'} · {formatDate(note.updatedAt)}</div>
              </button>
            ))}
          </div>
        </aside>

        <section className="flex min-w-0 flex-col">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
            <span className="text-xs font-medium text-slate-400">{selectedId ? 'Editing note' : 'New note'}</span>
            <div className="flex gap-2">
              {selectedId && <button onClick={() => void remove()} className="rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Delete note"><Trash2 size={15} /></button>}
              <button onClick={() => void save()} disabled={saving} className="flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"><Save size={14} /> {saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
          <div className="flex-1 p-7">
            <input
              value={draft.title}
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              placeholder="Note title"
              className="w-full border-0 bg-transparent text-2xl font-semibold tracking-tight text-slate-900 outline-none placeholder:text-slate-300"
            />
            <div className="mt-5 grid grid-cols-2 gap-3 border-y border-slate-100 py-3">
              <input
                value={draft.category ?? ''}
                onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value || null }))}
                placeholder="Category"
                className="rounded-md border border-slate-200 px-3 py-2 text-xs outline-none focus:border-blue-400"
              />
              <input
                value={tagText}
                onChange={(event) => setTagText(event.target.value)}
                placeholder="Tags, separated by commas"
                className="rounded-md border border-slate-200 px-3 py-2 text-xs outline-none focus:border-blue-400"
              />
            </div>
            <textarea
              value={draft.content}
              onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))}
              placeholder="Write your note…"
              className="mt-5 min-h-[420px] w-full resize-none border-0 bg-transparent text-sm leading-7 text-slate-700 outline-none placeholder:text-slate-300"
            />
            {error && <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
          </div>
        </section>
      </div>
    </div>
  );
}
