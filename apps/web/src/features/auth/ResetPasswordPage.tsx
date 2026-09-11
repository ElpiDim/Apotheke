import { useState, type FormEvent } from 'react';
import { CheckCircle2, Eye, EyeOff, KeyRound } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { authClient } from '../../lib/authClient';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const invalidToken = params.has('error') || !token;
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [complete, setComplete] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!token || busy) return;
    if (password.length < 10) { setError('Use at least 10 characters.'); return; }
    if (password !== confirmation) { setError('The passwords do not match.'); return; }
    setBusy(true);
    setError('');
    const result = await authClient.resetPassword({ newPassword: password, token });
    if (result.error) {
      setError(result.error.message ?? 'This reset link is invalid or has expired.');
      setBusy(false);
      return;
    }
    setComplete(true);
    setBusy(false);
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-10">
      <section className="w-full max-w-md overflow-hidden rounded-[28px] border border-violet-200 bg-white shadow-[0_20px_60px_rgba(75,38,135,0.14)] dark:border-violet-700 dark:bg-[#211b35]">
        <header className="bg-gradient-to-r from-amber-50 via-orange-50 to-violet-100 px-6 py-6 dark:from-amber-950/30 dark:via-[#312039] dark:to-violet-950">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-coral-600">Peanut security</p>
          <h1 className="mt-1 font-serif text-3xl font-bold text-violet-950 dark:text-white">Choose a new password</h1>
        </header>
        <div className="p-6">
          {complete ? (
            <div className="text-center">
              <CheckCircle2 className="mx-auto text-teal-500" size={42} />
              <h2 className="mt-3 font-serif text-xl font-bold text-violet-950 dark:text-white">Password updated</h2>
              <p className="mt-2 text-sm text-violet-500 dark:text-violet-300">You can now sign in with your new password.</p>
              <Link to="/" className="mt-5 inline-flex rounded-xl bg-violet-700 px-5 py-2.5 text-xs font-bold text-white">Return to Peanut</Link>
            </div>
          ) : invalidToken ? (
            <div className="text-center">
              <p className="text-sm text-red-600 dark:text-red-300">This reset link is invalid or has expired.</p>
              <Link to="/" className="mt-5 inline-flex rounded-xl bg-violet-700 px-5 py-2.5 text-xs font-bold text-white">Request a new link</Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <PasswordInput label="New password" value={password} onChange={setPassword} visible={visible} onToggle={() => setVisible((value) => !value)} autoFocus />
              <PasswordInput label="Confirm new password" value={confirmation} onChange={setConfirmation} visible={visible} onToggle={() => setVisible((value) => !value)} />
              <p className="text-[11px] text-violet-400">Use at least 10 characters. Your other active sessions will be signed out.</p>
              {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
              <button disabled={busy || password.length < 10 || confirmation.length < 10} className="flex w-full items-center justify-center gap-2 rounded-xl bg-coral-500 px-5 py-3 text-sm font-bold text-white disabled:opacity-40">
                <KeyRound size={16} /> {busy ? 'Updating…' : 'Update password'}
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}

function PasswordInput({ label, value, onChange, visible, onToggle, autoFocus = false }: { label: string; value: string; onChange: (value: string) => void; visible: boolean; onToggle: () => void; autoFocus?: boolean }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-semibold text-violet-600 dark:text-violet-300">{label}</span><span className="relative block"><input type={visible ? 'text' : 'password'} value={value} onChange={(event) => onChange(event.target.value)} autoFocus={autoFocus} className="h-11 w-full rounded-xl border border-violet-200 bg-white px-3 pr-11 text-sm text-violet-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-violet-700 dark:bg-violet-950 dark:text-violet-100" /><button type="button" onClick={onToggle} aria-label={visible ? 'Hide password' : 'Show password'} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-violet-400">{visible ? <EyeOff size={16} /> : <Eye size={16} />}</button></span></label>;
}
