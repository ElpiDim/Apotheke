import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="relative flex min-h-64 flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-violet-300 bg-white px-6 text-center dark:border-violet-700 dark:bg-[#211b35]">
      <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-amber-100/70 blur-2xl dark:bg-violet-800/40" />
      <div className="relative mb-3 flex h-20 items-end justify-center">
        <img src="/pini-mascot.png" alt="" className="max-h-20 w-auto drop-shadow-[0_7px_7px_rgba(69,35,104,0.16)]" />
        <div className="absolute -right-4 top-1 rounded-xl bg-violet-100 p-2 text-violet-600 shadow-sm dark:bg-violet-800 dark:text-violet-200">
          <Icon size={16} strokeWidth={1.8} />
        </div>
      </div>
      <h3 className="text-sm font-semibold text-violet-950 dark:text-violet-50">{title}</h3>
      <p className="mt-1 max-w-sm text-sm leading-6 text-violet-500 dark:text-violet-300">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
