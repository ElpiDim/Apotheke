import { useEffect, useState, type FormEvent } from 'react';
import type { CreateVaultEntryInput, VaultEntry } from '@apotheke/contracts';
import { Copy, Eye, EyeOff, KeyRound, LockKeyhole, Pencil, Plus, Save, ShieldCheck, Trash2, X } from 'lucide-react';
import { api, ApiError, jsonRequest } from '../lib/api';

const tokenKey = 'peanut-vault-session';
const emptyEntry: CreateVaultEntryInput = { label: '', username: '', password: '', url: '', notes: '' };

function vaultInit(method = 'GET', body?: unknown): RequestInit {
  const token = sessionStorage.getItem(tokenKey);
  return {
    method,
    headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  };
}

export function PasswordVaultCard() {
  const [open, setOpen] = useState(false);
  return <>
    <section className="relative mt-6 overflow-hidden rounded-[24px] border border-violet-100 bg-gradient-to-r from-violet-50 via-white to-amber-50 p-6 shadow-[0_12px_32px_rgba(82,65,168,0.08)] dark:border-violet-800 dark:from-violet-950 dark:via-[#211b35] dark:to-amber-950/20 sm:flex sm:items-center sm:justify-between sm:gap-6">
      <div className="absolute -right-8 -top-10 h-32 w-36 rotate-12 rounded-[48%_52%_65%_35%] bg-violet-200/60 dark:bg-violet-800/50" />
      <div className="relative flex items-start gap-4"><div className="rounded-2xl bg-violet-700 p-3 text-white shadow-lg"><ShieldCheck size={23} /></div><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-coral-600">Protected space</p><h2 className="mt-1 font-serif text-xl font-semibold text-violet-950 dark:text-violet-50">Passwords</h2><p className="mt-1 max-w-xl text-xs leading-5 text-violet-500 dark:text-violet-300">Keep logins encrypted behind a master password. It stays unlocked until you choose Lock now.</p></div></div>
      <button onClick={() => setOpen(true)} className="relative mt-5 inline-flex shrink-0 items-center gap-2 rounded-2xl bg-violet-700 px-5 py-3 text-xs font-bold text-white shadow-lg hover:-translate-y-0.5 hover:bg-violet-800 sm:mt-0"><LockKeyhole size={15} /> Open vault</button>
    </section>
    {open && <VaultModal onClose={() => setOpen(false)} />}
  </>;
}

function VaultModal({ onClose }: { onClose: () => void }) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [masterPassword, setMasterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [draft, setDraft] = useState<CreateVaultEntryInput>(emptyEntry);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function loadEntries() {
    const result = await api<{ entries: VaultEntry[] }>('/vault/entries', vaultInit());
    setEntries(result.entries);
  }

  useEffect(() => {
    void api<{ configured: boolean; unlocked: boolean }>('/vault/status', vaultInit()).then(async (status) => {
      setConfigured(status.configured);
      setUnlocked(status.unlocked);
      if (status.unlocked) await loadEntries();
      else sessionStorage.removeItem(tokenKey);
    }).catch(() => setConfigured(false));
  }, []);

  async function authenticate(event: FormEvent) {
    event.preventDefault();
    if (!configured && masterPassword !== confirmPassword) { setError('The master passwords do not match.'); return; }
    setBusy(true); setError(null);
    try {
      const result = await api<{ token: string }>(configured ? '/vault/unlock' : '/vault/setup', jsonRequest('POST', { password: masterPassword }));
      sessionStorage.setItem(tokenKey, result.token);
      setConfigured(true); setUnlocked(true); setMasterPassword(''); setConfirmPassword('');
      await loadEntries();
    } catch (caught) { setError(caught instanceof ApiError ? caught.message : 'The vault could not be unlocked.'); }
    finally { setBusy(false); }
  }

  async function lock() {
    await api('/vault/lock', vaultInit('POST')).catch(() => undefined);
    sessionStorage.removeItem(tokenKey); setUnlocked(false); setEntries([]); setEditorOpen(false);
  }

  function newEntry() { setEditingId(null); setDraft(emptyEntry); setEditorOpen(true); setError(null); }
  function edit(entry: VaultEntry) { setEditingId(entry.id); setDraft({ label: entry.label, username: entry.username, password: entry.password, url: entry.url, notes: entry.notes }); setEditorOpen(true); setError(null); }

  async function saveEntry(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(null);
    try {
      await api(editingId ? `/vault/entries/${editingId}` : '/vault/entries', vaultInit(editingId ? 'PATCH' : 'POST', draft));
      await loadEntries(); setEditorOpen(false); setDraft(emptyEntry); setEditingId(null);
    } catch (caught) { if (caught instanceof ApiError && caught.status === 401) { sessionStorage.removeItem(tokenKey); setUnlocked(false); } setError(caught instanceof ApiError ? caught.message : 'The password entry could not be saved.'); }
    finally { setBusy(false); }
  }

  async function remove(entry: VaultEntry) {
    if (!window.confirm(`Delete the saved password for “${entry.label}”?`)) return;
    await api(`/vault/entries/${entry.id}`, vaultInit('DELETE')); await loadEntries();
  }

  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-violet-950/50 p-4 backdrop-blur-sm"><section className="flex max-h-[min(720px,calc(100vh-2rem))] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-violet-200 bg-[#fffdf9] shadow-2xl dark:border-violet-700 dark:bg-[#211b35]">
    <header className="flex shrink-0 items-center gap-3 border-b border-violet-100 px-5 py-4 dark:border-violet-800"><div className="rounded-xl bg-violet-100 p-2.5 text-violet-700 dark:bg-violet-900 dark:text-violet-200"><LockKeyhole size={18} /></div><div><h2 className="font-serif text-xl font-bold text-violet-950 dark:text-white">Password vault</h2><p className="text-[10px] text-violet-400">Encrypted locally · stays unlocked until you lock it</p></div>{unlocked && <button onClick={() => void lock()} className="ml-auto rounded-xl border border-violet-200 px-3 py-2 text-[10px] font-bold text-violet-600 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-300 dark:hover:bg-violet-900">Lock now</button>}<button onClick={onClose} aria-label="Close vault" className={`${unlocked ? '' : 'ml-auto'} rounded-xl p-2 text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900`}><X size={18} /></button></header>
    {configured === null ? <div className="flex min-h-72 items-center justify-center text-sm text-violet-400">Checking vault…</div> : !unlocked ? <form onSubmit={authenticate} className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center p-7"><img src="/pini-mascot.png" alt="" className="mx-auto mb-3 h-24 w-auto" /><h3 className="text-center font-serif text-2xl font-bold text-violet-950 dark:text-white">{configured ? 'Welcome back' : 'Create your protected vault'}</h3><p className="mt-2 text-center text-xs leading-5 text-violet-500 dark:text-violet-300">{configured ? 'Enter your master password to see your saved logins.' : 'Choose a master password with at least 10 characters. It cannot be recovered if forgotten.'}</p><input type="password" value={masterPassword} onChange={(event) => setMasterPassword(event.target.value)} placeholder="Master password" autoFocus minLength={10} className="mt-6 h-11 rounded-xl border border-violet-200 px-3 text-sm outline-none focus:border-violet-400 dark:border-violet-700 dark:bg-violet-950" />{!configured && <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Confirm master password" minLength={10} className="mt-3 h-11 rounded-xl border border-violet-200 px-3 text-sm outline-none focus:border-violet-400 dark:border-violet-700 dark:bg-violet-950" />}{error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-300">{error}</p>}<button disabled={busy || masterPassword.length < 10} className="mt-4 rounded-xl bg-violet-700 py-3 text-xs font-bold text-white hover:bg-violet-800 disabled:opacity-40">{busy ? 'Please wait…' : configured ? 'Unlock vault' : 'Create encrypted vault'}</button></form> : <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
      <div className="mb-5 flex items-center justify-between"><div><h3 className="font-serif text-xl font-bold text-violet-950 dark:text-white">Saved passwords</h3><p className="mt-1 text-[10px] text-violet-400">{entries.length} protected {entries.length === 1 ? 'entry' : 'entries'}</p></div><button onClick={newEntry} className="flex items-center gap-2 rounded-xl bg-coral-500 px-4 py-2.5 text-xs font-bold text-white hover:bg-coral-600"><Plus size={14} /> Add password</button></div>
      {editorOpen && <form onSubmit={saveEntry} className="mb-5 grid gap-3 rounded-2xl border border-violet-100 bg-violet-50/60 p-4 dark:border-violet-800 dark:bg-violet-950/30 sm:grid-cols-2"><VaultField label="Name" value={draft.label} onChange={(value) => setDraft((current) => ({ ...current, label: value }))} placeholder="e.g. GitHub" /><VaultField label="Username or email" value={draft.username} onChange={(value) => setDraft((current) => ({ ...current, username: value }))} /><VaultField label="Password" type="password" value={draft.password} onChange={(value) => setDraft((current) => ({ ...current, password: value }))} /><VaultField label="Website" value={draft.url} onChange={(value) => setDraft((current) => ({ ...current, url: value }))} placeholder="https://…" /><label className="sm:col-span-2"><span className="mb-1 block text-[10px] font-bold text-violet-500">Notes</span><textarea value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} className="min-h-20 w-full rounded-xl border border-violet-200 px-3 py-2 text-xs outline-none dark:border-violet-700 dark:bg-violet-950" /></label>{error && <p className="text-xs text-red-500 sm:col-span-2">{error}</p>}<div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={() => setEditorOpen(false)} className="rounded-xl border border-violet-200 px-4 py-2 text-xs font-semibold text-violet-500 dark:border-violet-700">Cancel</button><button disabled={busy || !draft.label.trim() || !draft.password} className="flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-40"><Save size={13} /> Save</button></div></form>}
      {entries.length === 0 && !editorOpen ? <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-violet-200 text-center dark:border-violet-700"><KeyRound size={28} className="mb-3 text-violet-300" /><p className="text-sm font-bold text-violet-800 dark:text-violet-100">No passwords saved</p><p className="mt-1 text-xs text-violet-400">Add the first login to your encrypted vault.</p></div> : <div className="grid gap-3 sm:grid-cols-2">{entries.map((entry) => { const visible = visiblePasswords.has(entry.id); return <article key={entry.id} className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm dark:border-violet-800 dark:bg-violet-950/35"><div className="flex items-start gap-3"><div className="rounded-xl bg-amber-100 p-2.5 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300"><KeyRound size={16} /></div><div className="min-w-0 flex-1"><h4 className="truncate text-sm font-bold text-violet-950 dark:text-white">{entry.label}</h4><p className="mt-1 truncate text-[10px] text-violet-400">{entry.username || entry.url || 'Saved login'}</p></div><button onClick={() => edit(entry)} className="p-1.5 text-violet-300 hover:text-violet-600"><Pencil size={13} /></button><button onClick={() => void remove(entry)} className="p-1.5 text-violet-300 hover:text-red-500"><Trash2 size={13} /></button></div><div className="mt-4 flex items-center rounded-xl bg-violet-50 px-3 py-2 dark:bg-violet-900/50"><code className="min-w-0 flex-1 truncate text-xs text-violet-700 dark:text-violet-200">{visible ? entry.password : '••••••••••••'}</code><button onClick={() => setVisiblePasswords((current) => { const next = new Set(current); visible ? next.delete(entry.id) : next.add(entry.id); return next; })} className="p-1.5 text-violet-400">{visible ? <EyeOff size={14} /> : <Eye size={14} />}</button><button onClick={() => void navigator.clipboard.writeText(entry.password)} className="p-1.5 text-violet-400 hover:text-violet-700" aria-label="Copy password"><Copy size={14} /></button></div></article>; })}</div>}
    </div>}
  </section></div>;
}

function VaultField({ label, value, onChange, type = 'text', placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  return <label><span className="mb-1 block text-[10px] font-bold text-violet-500">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-10 w-full rounded-xl border border-violet-200 px-3 text-xs outline-none focus:border-violet-400 dark:border-violet-700 dark:bg-violet-950" /></label>;
}
