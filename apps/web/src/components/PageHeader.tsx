import type { ReactNode } from 'react';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, action }: PageHeaderProps) {
  return (
    <div className="mb-7 flex items-start justify-between gap-6">
      <div>
        {eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-coral-600">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold tracking-tight text-violet-950">{title}</h1>
        <p className="mt-1.5 text-sm text-violet-500">{description}</p>
      </div>
      {action}
    </div>
  );
}
