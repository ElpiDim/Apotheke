import { useEffect, useState } from 'react';
import { authClient } from '../lib/authClient';
import { importLegacyGuest, legacyImported } from '../lib/guestMigration';
import { announceWorkspaceChange } from '../lib/workspaceEvents';

export function GuestStorageNotice() {
  const { data: session, isPending } = authClient.useSession();
  const [legacy, setLegacy] = useState(false); const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  useEffect(() => { let active = true; void legacyImported().then(done => { if (active) setLegacy(!done); }).catch(() => undefined); return () => { active = false; }; }, [session]);
  async function copy() { setBusy(true); setMessage(''); try { const count = await importLegacyGuest(); setLegacy(false); setMessage(`Copied ${count} items to this browser. Old cloud copies were not deleted.`); announceWorkspaceChange('documents', 'notes', 'tasks', 'categories', 'integrations'); } catch (error) { setMessage((error as Error).message); } finally { setBusy(false); } }
  if (session || isPending) return null;
  return <aside className="mb-5 rounded-2xl border border-violet-200 bg-violet-50/60 p-4 text-xs leading-6 text-violet-700 dark:border-violet-700 dark:bg-violet-950/30 dark:text-violet-200">
    <p><strong>Guest workspace · stored in this browser only.</strong> Clearing site data or using another browser/device will not retain these files. Keep copies of important files. Signing in opens a separate cloud workspace; it does not upload local files automatically.</p>
    {legacy && <div className="mt-2"><p>Your previous online guest workspace is still in the cloud. You can copy it here without deleting the original. This action downloads your old data from Cloudflare.</p><button type="button" disabled={busy} onClick={() => void copy()} className="mt-2 rounded-xl bg-violet-700 px-4 py-2 font-semibold text-white disabled:opacity-50">{busy ? 'Copying…' : 'Copy old guest data to this browser'}</button></div>}
    {message && <p role="status" className="mt-2">{message}</p>}
  </aside>;
}
