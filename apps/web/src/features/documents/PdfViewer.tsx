import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react';
import * as pdfjs from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PageSize { width: number; height: number }
const clampPage = (page: number, count: number) => Math.min(Math.max(1, Math.trunc(page) || 1), count || 1);

export function PdfViewer({ file, initialPage = 1, title }: { file: Blob; initialPage?: number; title: string }) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pageRefs = useRef<Array<HTMLDivElement | null>>([]);
  const currentPageRef = useRef(1);
  const frameRef = useRef<number | null>(null);
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [pages, setPages] = useState<PageSize[]>([]);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    let task: ReturnType<typeof pdfjs.getDocument> | undefined;
    setLoading(true);
    setError('');
    setDocument(null);
    setPages([]);
    pageRefs.current = [];
    void file.arrayBuffer().then((buffer) => {
      if (!active) return;
      task = pdfjs.getDocument({ data: new Uint8Array(buffer) });
      return task.promise;
    }).then(async (loaded) => {
      if (!loaded || !active) return;
      // Measure pages before jumping so mixed page sizes cannot move the target.
      // These are lightweight page proxies, not rendered canvases.
      const sizes: PageSize[] = [];
      for (let number = 1; number <= loaded.numPages; number++) {
        if (!active) return;
        const pdfPage = await loaded.getPage(number);
        const viewport = pdfPage.getViewport({ scale: 1 });
        sizes.push({ width: viewport.width, height: viewport.height });
      }
      if (!active) return;
      setDocument(loaded);
      setPages(sizes);
    }).catch(() => {
      if (active) setError('This PDF could not be displayed.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
      void task?.destroy();
    };
  }, [file]);

  function goToPage(value: number) {
    const next = clampPage(value, pages.length);
    const root = scrollRef.current;
    const target = pageRefs.current[next - 1];
    if (!root || !target) return;
    root.scrollTop += target.getBoundingClientRect().top - root.getBoundingClientRect().top - root.clientTop;
    currentPageRef.current = next;
    setPage(next);
  }

  useLayoutEffect(() => {
    if (pages.length) goToPage(initialPage);
  }, [pages, initialPage]);

  useLayoutEffect(() => {
    if (pages.length) goToPage(currentPageRef.current);
  }, [scale]);

  useEffect(() => () => {
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
  }, []);

  function trackPage() {
    if (frameRef.current !== null) return;
    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      const root = scrollRef.current;
      if (!root) return;
      const readingLine = root.getBoundingClientRect().top + Math.min(120, root.clientHeight / 4);
      let closestPage = 1;
      for (let index = 0; index < pageRefs.current.length; index++) {
        const element = pageRefs.current[index];
        if (!element) continue;
        const bounds = element.getBoundingClientRect();
        if (bounds.top > readingLine) break;
        closestPage = index + 1;
        if (bounds.bottom > readingLine) break;
      }
      currentPageRef.current = closestPage;
      setPage(closestPage);
    });
  }

  if (error) return <div className="flex min-h-[420px] items-center justify-center p-6 text-sm text-red-600" role="alert">{error}</div>;

  return <div className="relative flex h-[calc(100dvh-16rem)] min-h-[420px] min-w-0 flex-col overflow-hidden bg-slate-700" aria-label={title}>
    <div className="z-10 flex shrink-0 flex-wrap items-center justify-center gap-2 border-b border-white/10 bg-slate-900/95 px-3 py-2 text-white shadow-md">
      <button type="button" aria-label="Previous page" disabled={loading || page <= 1} onClick={() => goToPage(page - 1)} className="rounded-lg p-2 hover:bg-white/10 disabled:opacity-30"><ChevronLeft size={16} /></button>
      <label className="flex items-center gap-2 text-xs"><span>Page</span><input aria-label="Page number" type="number" min={1} max={pages.length || 1} value={page} disabled={loading} onChange={(event) => goToPage(Number(event.target.value))} className="h-8 w-14 rounded-md border border-white/20 bg-slate-800 px-2 text-center text-white outline-none" /><span>of {pages.length || '–'}</span></label>
      <button type="button" aria-label="Next page" disabled={loading || page >= pages.length} onClick={() => goToPage(page + 1)} className="rounded-lg p-2 hover:bg-white/10 disabled:opacity-30"><ChevronRight size={16} /></button>
      <span className="mx-1 h-5 w-px bg-white/15" />
      <button type="button" aria-label="Zoom out" disabled={scale <= 0.6} onClick={() => setScale((value) => Math.max(0.6, value - 0.2))} className="rounded-lg p-2 hover:bg-white/10 disabled:opacity-30"><Minus size={15} /></button>
      <span className="w-11 text-center text-[10px]">{Math.round(scale * 100)}%</span>
      <button type="button" aria-label="Zoom in" disabled={scale >= 2.4} onClick={() => setScale((value) => Math.min(2.4, value + 0.2))} className="rounded-lg p-2 hover:bg-white/10 disabled:opacity-30"><Plus size={15} /></button>
    </div>
    <div ref={scrollRef} onScroll={trackPage} tabIndex={0} aria-label="PDF pages" className="min-h-0 flex-1 overflow-auto overscroll-contain">
      {loading && <div className="mt-24 text-center text-sm text-slate-300">Loading PDF…</div>}
      {!loading && document && <div className="flex w-max min-w-full flex-col items-center gap-4 p-4 sm:p-6">
        {pages.map((size, index) => <div key={index} ref={(element) => { pageRefs.current[index] = element; }} data-page={index + 1} className="relative shrink-0 bg-white shadow-2xl" style={{ width: size.width * scale, height: size.height * scale }}>
          <PdfPage document={document} page={index + 1} scale={scale} scrollRef={scrollRef} />
        </div>)}
      </div>}
    </div>
  </div>;
}

function PdfPage({ document, page, scale, scrollRef }: {
  document: PDFDocumentProxy;
  page: number;
  scale: number;
  scrollRef: { current: HTMLDivElement | null };
}) {
  const holderRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [nearby, setNearby] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const holder = holderRef.current;
    if (!holder) return;
    const observer = new IntersectionObserver(([entry]) => {
      setNearby(Boolean(entry?.isIntersecting));
    }, { root: scrollRef.current, rootMargin: '800px 0px' });
    observer.observe(holder);
    return () => observer.disconnect();
  }, [scrollRef]);

  useEffect(() => {
    setReady(false);
    setError('');
    if (!nearby || !canvasRef.current) return;
    let active = true;
    let renderTask: ReturnType<Awaited<ReturnType<PDFDocumentProxy['getPage']>>['render']> | undefined;
    void document.getPage(page).then((pdfPage) => {
      if (!active || !canvasRef.current) return;
      const viewport = pdfPage.getViewport({ scale });
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas unavailable');
      canvas.width = Math.floor(viewport.width * ratio);
      canvas.height = Math.floor(viewport.height * ratio);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      renderTask = pdfPage.render({ canvas, canvasContext: context, viewport, transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0] });
      return renderTask.promise.then(() => { if (active) setReady(true); });
    }).catch((reason: unknown) => {
      if (active && !(reason instanceof Error && reason.name === 'RenderingCancelledException')) setError('This PDF page could not be displayed.');
    });
    return () => {
      active = false;
      renderTask?.cancel();
    };
  }, [document, page, scale, nearby]);

  return <div ref={holderRef} className="h-full w-full" aria-label={`Page ${page}`}>
    {nearby && <canvas key={scale} ref={canvasRef} className="block" role="img" aria-label={`Page ${page}`} />}
    {(!nearby || !ready) && <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400" role={error ? 'alert' : undefined}>{error || `Page ${page}${nearby ? ' · Loading…' : ''}`}</div>}
  </div>;
}
