import { useEffect, useMemo, useState } from 'react';
import type { Category, DocumentRecord, Note } from '@apotheke/contracts';
import { ArrowLeft, ChevronRight, FileText, FolderOpen, Sparkles, StickyNote } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { EmptyState } from '../../components/EmptyState';
import { api } from '../../lib/api';
import { formatBytes, formatDate } from '../../lib/format';

export function CategoriesPage() {
  const { categoryId } = useParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void Promise.all([
      api<{ categories: Category[] }>('/categories'),
      categoryId ? api<{ documents: DocumentRecord[] }>('/documents') : Promise.resolve({ documents: [] }),
      categoryId ? api<{ notes: Note[] }>('/notes') : Promise.resolve({ notes: [] }),
    ]).then(([categoryResult, documentResult, noteResult]) => {
      setCategories(categoryResult.categories);
      setDocuments(documentResult.documents);
      setNotes(noteResult.notes);
    }).finally(() => setLoading(false));
  }, [categoryId]);

  const category = categories.find((item) => item.id === categoryId);
  const categoryDocuments = useMemo(() => documents.filter((item) => item.category?.id === categoryId), [categoryId, documents]);
  const categoryNotes = useMemo(() => notes.filter((item) => item.category?.id === categoryId), [categoryId, notes]);

  if (categoryId) {
    return (
      <div>
        <Link to="/categories" className="mb-5 inline-flex items-center gap-2 text-xs font-semibold text-violet-500 hover:text-coral-600"><ArrowLeft size={15} /> All categories</Link>
        <section className="relative mb-7 overflow-hidden rounded-[26px] border border-violet-100 bg-white px-6 py-7 shadow-[0_10px_30px_rgba(82,65,168,0.07)] dark:border-violet-800 dark:bg-[#211b35] sm:px-8">
          <div className="absolute -right-12 -top-16 h-56 w-72 rotate-6 rounded-[44%_56%_62%_38%/58%_42%_58%_42%] bg-gradient-to-br from-violet-100 via-fuchsia-50 to-teal-100 dark:from-violet-900/60 dark:via-fuchsia-950/30 dark:to-teal-950/40" />
          <div className="relative flex items-center gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-500 shadow-sm dark:bg-amber-900/30 dark:text-amber-400"><FolderOpen size={31} /></div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-coral-500">Category</p>
              <h1 className="mt-1 truncate font-serif text-3xl font-semibold text-violet-950 dark:text-violet-50 sm:text-4xl">{category?.name ?? (loading ? 'Loading…' : 'Category not found')}</h1>
              {category && <p className="mt-2 text-sm text-violet-500 dark:text-violet-300">{categoryDocuments.length} documents · {categoryNotes.length} notes</p>}
            </div>
          </div>
        </section>

        {!loading && !category ? (
          <EmptyState icon={FolderOpen} title="Category not found" description="This category may no longer exist." action={<Link to="/categories" className="font-semibold text-violet-600">View all categories</Link>} />
        ) : !loading && categoryDocuments.length === 0 && categoryNotes.length === 0 ? (
          <EmptyState icon={FolderOpen} title="This category is empty" description="Add this category to a document or note and it will appear here." />
        ) : (
          <div className="space-y-8">
            <CategorySection title="Documents" count={categoryDocuments.length} icon={<FileText size={18} />}>
              {categoryDocuments.map((document) => (
                <article key={document.id} className="rounded-2xl border border-violet-100 bg-white p-5 shadow-[0_6px_20px_rgba(82,65,168,0.05)] dark:border-violet-800 dark:bg-[#211b35]">
                  <div className="flex items-start gap-3"><div className="rounded-xl bg-violet-100 p-2.5 text-violet-600 dark:bg-violet-900 dark:text-violet-300"><FileText size={18} /></div><div className="min-w-0"><h3 className="truncate text-sm font-semibold text-violet-950 dark:text-violet-50">{document.title}</h3><p className="mt-1 truncate text-[11px] text-violet-400">{document.currentVersion.originalFilename}</p></div></div>
                  <div className="mt-4 flex items-center border-t border-violet-100 pt-3 text-[10px] text-violet-400 dark:border-violet-800"><span>{formatDate(document.updatedAt)}</span><span className="ml-auto">{formatBytes(document.currentVersion.fileSize)}</span></div>
                </article>
              ))}
            </CategorySection>

            <CategorySection title="Notes" count={categoryNotes.length} icon={<StickyNote size={18} />}>
              {categoryNotes.map((note) => (
                <Link key={note.id} to="/notes" className="block min-h-36 rounded-2xl border border-violet-100 bg-[#fffdf9] p-5 shadow-[0_6px_20px_rgba(82,65,168,0.05)] transition hover:-translate-y-0.5 hover:shadow-md dark:border-violet-800 dark:bg-[#28213e]">
                  <div className="flex items-center gap-3"><div className="rounded-xl bg-teal-100 p-2.5 text-teal-600 dark:bg-teal-950 dark:text-teal-300"><StickyNote size={18} /></div><h3 className="truncate text-sm font-semibold text-violet-950 dark:text-violet-50">{note.title}</h3></div>
                  <p className="mt-3 line-clamp-2 text-xs leading-5 text-violet-500 dark:text-violet-300">{note.content || 'Empty note'}</p>
                  <p className="mt-3 text-[10px] text-violet-400">Updated {formatDate(note.updatedAt)}</p>
                </Link>
              ))}
            </CategorySection>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <section className="relative mb-7 min-h-[205px] overflow-hidden rounded-[28px] px-6 py-7 sm:px-8">
        <div className="categories-title-blob" aria-hidden="true" />
        <div className="absolute right-[8%] top-8 hidden h-16 w-16 rounded-full bg-teal-200/80 shadow-sm sm:block dark:bg-teal-500/30" aria-hidden="true" />
        <div className="absolute right-[22%] top-6 hidden text-violet-400 lg:block dark:text-violet-300" aria-hidden="true"><Sparkles size={25} /></div>
        <div className="absolute right-[16%] top-[135px] hidden h-1 w-20 -rotate-12 rounded-full bg-coral-400 lg:block" aria-hidden="true" />
        <div className="relative z-10 max-w-xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-coral-600">Organization</p>
          <h1 className="mt-1 font-serif text-4xl font-semibold tracking-[-0.035em] text-violet-950 dark:text-violet-50 sm:text-5xl">Categories</h1>
          <p className="mt-3 max-w-md text-sm leading-6 text-violet-600 dark:text-violet-300">Group related documents and notes, then find everything that belongs together in one place.</p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white/80 px-4 py-2 text-xs font-semibold text-violet-600 shadow-sm backdrop-blur-sm dark:border-violet-700 dark:bg-[#211b35]/80 dark:text-violet-200">
            <FolderOpen size={15} className="text-amber-500" /> {categories.length} {categories.length === 1 ? 'category' : 'categories'}
          </div>
        </div>
      </section>
      {!loading && categories.length === 0 ? (
        <EmptyState icon={FolderOpen} title="No categories yet" description="Categories appear here when you add them to documents or notes." />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((item, index) => (
            <Link key={item.id} to={`/categories/${item.id}`} className={`group relative flex min-h-32 items-center gap-4 overflow-hidden rounded-[20px] border border-violet-100 p-5 shadow-[0_8px_24px_rgba(82,65,168,0.07)] transition hover:-translate-y-1 hover:border-violet-200 hover:shadow-[0_14px_30px_rgba(82,65,168,0.12)] dark:border-violet-800 dark:hover:border-violet-600 ${['bg-white dark:bg-[#211b35]', 'bg-violet-50/70 dark:bg-[#28213e]', 'bg-orange-50/70 dark:bg-[#312039]', 'bg-teal-50/70 dark:bg-[#183538]'][index % 4]}`}>
              <span className={`absolute -right-8 -top-10 h-28 w-32 rounded-full opacity-45 ${['bg-violet-100 dark:bg-violet-800', 'bg-fuchsia-100 dark:bg-fuchsia-900', 'bg-orange-100 dark:bg-orange-900', 'bg-teal-100 dark:bg-teal-900'][index % 4]}`} />
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-500 shadow-sm transition group-hover:rotate-[-3deg] group-hover:scale-105 dark:bg-amber-900/30 dark:text-amber-400"><FolderOpen size={26} /></div>
              <div className="relative min-w-0 flex-1"><h2 className="truncate font-serif text-lg font-semibold text-violet-950 dark:text-violet-50">{item.name}</h2><p className="mt-1 text-xs text-violet-400">Documents & notes</p></div>
              <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-violet-100 bg-white/70 text-violet-300 transition group-hover:translate-x-1 group-hover:border-coral-200 group-hover:text-coral-500 dark:border-violet-700 dark:bg-violet-950/40"><ChevronRight size={16} /></span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function CategorySection({ title, count, icon, children }: { title: string; count: number; icon: React.ReactNode; children: React.ReactNode }) {
  if (count === 0) return null;
  return <section><div className="mb-4 flex items-center gap-2 text-violet-950 dark:text-violet-50">{icon}<h2 className="font-serif text-xl font-semibold">{title}</h2><span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-600 dark:bg-violet-900 dark:text-violet-300">{count}</span></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{children}</div></section>;
}
