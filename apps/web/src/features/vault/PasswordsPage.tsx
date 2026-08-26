import { KeyRound, ShieldCheck, Sparkles } from 'lucide-react';
import { PasswordVaultCard } from '../../components/PasswordVault';

export function PasswordsPage() {
  return <div>
    <section className="relative mb-4 min-h-40 px-5 py-5 sm:px-7">
      <div className="passwords-title-blob" />
      <div className="absolute right-28 top-4 hidden h-14 w-14 rounded-full bg-teal-200 shadow-lg dark:bg-teal-800 xl:block" />
      <Sparkles className="absolute right-12 top-12 hidden text-white xl:block" size={20} />
      <div className="relative z-10"><p className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-coral-600"><ShieldCheck size={13} /> Protected space</p><h1 className="font-serif text-4xl font-semibold tracking-[-0.035em] text-violet-950 dark:text-violet-50 lg:text-5xl">Passwords</h1><p className="mt-2 max-w-lg text-sm text-violet-600 dark:text-violet-300">Your encrypted local vault for logins and private credentials.</p></div>
    </section>
    <div className="mx-auto max-w-4xl"><div className="mb-3 flex items-center gap-2 px-1 text-xs font-semibold text-violet-500 dark:text-violet-300"><KeyRound size={14} /> Master password required</div><PasswordVaultCard /></div>
  </div>;
}
