import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type { AuthUser } from '@apotheke/contracts';
import { KeyRound, LoaderCircle, LogIn, UserPlus } from 'lucide-react';
import { api, jsonRequest } from '../../lib/api';

const tokenKey = 'peanut-auth-token';

export function AuthGate({ children }: { children: ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [, setUser] = useState<AuthUser | null>(null);
  const [, setLocalMode] = useState(() => localStorage.getItem('peanut-local-mode') === '1');
  const [authOpen, setAuthOpen] = useState(false);

  async function check() {
    setChecking(true);
    try {
      const status = await api<{ configured: boolean }>('/auth/status');
      setConfigured(status.configured);
      const usingLocalMode = localStorage.getItem('peanut-local-mode') === '1';
      setLocalMode(usingLocalMode);
      if (usingLocalMode) {
        setUser(null);
        return;
      }
      if (localStorage.getItem(tokenKey)) {
        const result = await api<{ user: AuthUser }>('/auth/me');
        setUser(result.user);
      } else {
        localStorage.setItem('peanut-local-mode', '1');
        setLocalMode(true);
        setUser(null);
      }
    } catch {
      localStorage.setItem('peanut-local-mode', '1');
      setLocalMode(true);
      setUser(null);
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    void check();
    const changed = () => void check();
    const openAuth = () => setAuthOpen(true);
    window.addEventListener('peanut-auth-changed', changed);
    window.addEventListener('peanut-open-auth', openAuth);
    return () => {
      window.removeEventListener('peanut-auth-changed', changed);
      window.removeEventListener('peanut-open-auth', openAuth);
    };
  }, []);

  if (checking) return <div className="flex min-h-screen items-center justify-center bg-[#fffaf4] text-violet-500 dark:bg-[#171126]"><LoaderCircle className="animate-spin" /></div>;
  return <>{children}{authOpen && <AuthPage registerMode={!configured} onLocalMode={() => { localStorage.setItem('peanut-local-mode', '1'); setLocalMode(true); setAuthOpen(false); }} onAuthenticated={(nextUser, token) => { localStorage.removeItem('peanut-local-mode'); localStorage.setItem(tokenKey, token); setConfigured(true); setLocalMode(false); setUser(nextUser); setAuthOpen(false); }} />}</>;
}

function AuthPage({ registerMode, onLocalMode, onAuthenticated }: { registerMode: boolean; onLocalMode: () => void; onAuthenticated: (user: AuthUser, token: string) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const result = await api<{ user: AuthUser; token: string }>(registerMode ? '/auth/register' : '/auth/login', jsonRequest('POST', registerMode ? { name, email, password } : { email, password }));
      onAuthenticated(result.user, result.token);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Peanut could not sign you in.');
    } finally { setBusy(false); }
  }

  return <main className="fixed inset-0 z-[120] flex min-h-screen items-center justify-center overflow-hidden bg-[#fffaf4] p-5 dark:bg-[#171126]">
    <div className="absolute -left-28 -top-28 h-96 w-96 rounded-full bg-violet-200/50 blur-2xl dark:bg-violet-900/30" />
    <div className="absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-teal-200/50 blur-2xl dark:bg-teal-900/20" />
    <section className="relative w-full max-w-md rounded-[30px] border border-violet-100 bg-white/95 p-7 shadow-[0_24px_80px_rgba(60,30,120,0.16)] backdrop-blur dark:border-violet-800 dark:bg-[#211b35]/95 sm:p-9">
      <img src="/peanut-logo.png" alt="Peanut" className="mx-auto w-40 drop-shadow-md" />
      <div className="mt-7 text-center"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-coral-500">{registerMode ? 'Create your workspace' : 'Welcome back'}</p><h1 className="mt-2 font-serif text-3xl font-bold text-violet-950 dark:text-white">{registerMode ? 'Set up Peanut' : 'Sign in to Peanut'}</h1><p className="mt-2 text-xs leading-5 text-violet-500 dark:text-violet-300">{registerMode ? 'Create the first account for this installation. Your existing data will stay exactly where it is.' : 'Use your local Peanut account to open your workspace.'}</p></div>
      <form onSubmit={submit} className="mt-7 space-y-3">
        {registerMode && <AuthField label="Name" value={name} onChange={setName} placeholder="Your name" autoComplete="name" />}
        <AuthField label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" autoComplete="email" />
        <AuthField label="Password" type="password" value={password} onChange={setPassword} placeholder={registerMode ? 'At least 10 characters' : 'Your password'} autoComplete={registerMode ? 'new-password' : 'current-password'} />
        {error && <p className="rounded-xl bg-red-50 px-3 py-2.5 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
        <button disabled={busy || !email || password.length < (registerMode ? 10 : 1) || registerMode && !name.trim()} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-700 text-sm font-bold text-white shadow-lg shadow-violet-200 transition hover:bg-violet-800 disabled:opacity-40 dark:shadow-none">{busy ? <LoaderCircle size={17} className="animate-spin" /> : registerMode ? <UserPlus size={17} /> : <LogIn size={17} />}{busy ? 'Please wait…' : registerMode ? 'Create account' : 'Sign in'}</button>
        {registerMode && <><div className="flex items-center gap-3 py-1 text-[10px] uppercase tracking-widest text-violet-300"><span className="h-px flex-1 bg-violet-100 dark:bg-violet-800" />or<span className="h-px flex-1 bg-violet-100 dark:bg-violet-800" /></div><button type="button" onClick={onLocalMode} className="h-12 w-full rounded-xl border border-violet-200 bg-white text-sm font-bold text-violet-700 transition hover:bg-violet-50 dark:border-violet-700 dark:bg-transparent dark:text-violet-200 dark:hover:bg-violet-900/40">Continue without an account</button></>}
      </form>
      <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-[10px] text-violet-400"><KeyRound size={12} /> {registerMode ? 'Local mode works fully on this device, without sync.' : 'Password protected account'}</p>
    </section>
  </main>;
}

function AuthField({ label, value, onChange, ...props }: { label: string; value: string; onChange: (value: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return <label className="block"><span className="mb-1.5 block text-[11px] font-semibold text-violet-600 dark:text-violet-300">{label}</span><input {...props} value={value} onChange={(event) => onChange(event.target.value)} required className="h-12 w-full rounded-xl border border-violet-200 bg-white px-3.5 text-sm text-violet-950 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-violet-700 dark:bg-violet-950/50 dark:text-white dark:focus:ring-violet-900" /></label>;
}
