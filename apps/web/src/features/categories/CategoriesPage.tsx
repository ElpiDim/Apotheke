import { useEffect, useState } from 'react';
import type { Category } from '@apotheke/contracts';
import { FolderOpen, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../../components/EmptyState';
import { PageHeader } from '../../components/PageHeader';
import { api } from '../../lib/api';

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    void api<{ categories: Category[] }>('/categories')
      .then((result) => setCategories(result.categories));
  }, []);

  return (
    <div>
      <PageHeader eyebrow="Organization" title="Categories" description="Browse the categories used across your documents and notes." />
      {categories.length === 0 ? (
        <EmptyState icon={FolderOpen} title="No categories yet" description="Categories appear here when you add them to documents or notes." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => (
            <Link key={category.id} to={`/search?q=${encodeURIComponent(`"${category.name}"`)}`} className="group flex items-center gap-4 rounded-2xl border border-violet-100 bg-white p-5 shadow-[0_4px_16px_rgba(82,65,168,0.05)] transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md dark:border-violet-800 dark:bg-[#211b35] dark:hover:border-violet-600">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300"><FolderOpen size={19} /></div>
              <div className="min-w-0 flex-1"><h2 className="truncate text-sm font-semibold text-violet-950 dark:text-violet-50">{category.name}</h2><p className="mt-1 text-xs text-violet-400">Search matching content</p></div>
              <Search size={15} className="text-violet-300 transition group-hover:text-coral-500" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
