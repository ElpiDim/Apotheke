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
    <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-violet-300 bg-white px-6 text-center dark:border-violet-700 dark:bg-[#211b35]">
      <div className="mb-4 rounded-2xl bg-violet-100 p-3 text-violet-600">
        <Icon size={22} strokeWidth={1.8} />
      </div>
      <h3 className="text-sm font-semibold text-violet-950 dark:text-violet-50">{title}</h3>
      <p className="mt-1 max-w-sm text-sm leading-6 text-violet-500 dark:text-violet-300">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
