import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react';
import * as pdfjs from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export function PdfViewer({ file, initialPage = 1, title }: { file: Blob; initialPage?: number; title: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(Math.max(1, initialPage));
  const [pageCount, setPageCount] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    let task: ReturnType<typeof pdfjs.getDocument> | undefined;
    setLoading(true);
    setError('');
    void file.arrayBuffer().then((buffer) => {
      if (!active) return;
      task = pdfjs.getDocument({ data: new Uint8Array(buffer) });
      return task.promise;
    }).then((loaded) => {
      if (!loaded) return;
      if (!active) { void loaded.destroy(); return; }
      setDocument(loaded);
      setPageCount(loaded.numPages);
      setPage(Math.min(Math.max(1, initialPage), loaded.numPages));
    }).catch(() => { if (active) setError('This PDF could not be displayed.'); }).finally(() => { if (active) setLoading(false); });
    return () => {
      active = false;
      void task?.destroy();
    };
  }, [file, initialPage]);

  useEffect(() => {
    if (!document || !canvasRef.current) return;
    let active = true;
    let renderTask: ReturnType<Awaited<ReturnType<PDFDocumentProxy['getPage']>>['render']> | undefined;
    void document.getPage(page).then((pdfPage) => {
      if (!active || !canvasRef.current) return;
      const viewport = pdfPage.getViewport({ scale });
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;
      canvas.width = Math.floor(viewport.width * ratio);
      canvas.height = Math.floor(viewport.height * ratio);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      renderTask = pdfPage.render({ canvas, canvasContext: context, viewport, transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0] });
      return renderTask.promise.finally(() => pdfPage.cleanup());
    }).catch((reason: unknown) => {
      if (active && !(reason instanceof Error && reason.name === 'RenderingCancelledException')) setError('This PDF page could not be displayed.');
    });
    return () => { active = false; renderTask?.cancel(); };
  }, [document, page, scale]);

  if (error) return <div className="flex min-h-[640px] items-center justify-center p-6 text-sm text-red-600">{error}</div>;

  return <div className="relative flex min-h-[640px] flex-col bg-slate-700" aria-label={title}>
    <div className="sticky top-0 z-10 flex flex-wrap items-center justify-center gap-2 border-b border-white/10 bg-slate-900/95 px-3 py-2 text-white shadow-md backdrop-blur">
      <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-lg p-2 hover:bg-white/10 disabled:opacity-30"><ChevronLeft size={16} /></button>
      <label className="flex items-center gap-2 text-xs"><span>Page</span><input aria-label="Page number" type="number" min={1} max={pageCount || 1} value={page} onChange={(event) => setPage(Math.min(Math.max(1, Number(event.target.value) || 1), pageCount || 1))} className="h-8 w-14 rounded-md border border-white/20 bg-slate-800 px-2 text-center text-white outline-none" /><span>of {pageCount || '–'}</span></label>
      <button type="button" aria-label="Next page" disabled={!pageCount || page >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} className="rounded-lg p-2 hover:bg-white/10 disabled:opacity-30"><ChevronRight size={16} /></button>
      <span className="mx-1 h-5 w-px bg-white/15" />
      <button type="button" aria-label="Zoom out" disabled={scale <= 0.6} onClick={() => setScale((value) => Math.max(0.6, value - 0.2))} className="rounded-lg p-2 hover:bg-white/10 disabled:opacity-30"><Minus size={15} /></button>
      <span className="w-11 text-center text-[10px]">{Math.round(scale * 100)}%</span>
      <button type="button" aria-label="Zoom in" disabled={scale >= 2.4} onClick={() => setScale((value) => Math.min(2.4, value + 0.2))} className="rounded-lg p-2 hover:bg-white/10 disabled:opacity-30"><Plus size={15} /></button>
    </div>
    <div className="flex flex-1 justify-center overflow-auto p-4 sm:p-6">
      {loading && <div className="mt-24 text-sm text-slate-300">Loading PDF…</div>}
      <div className={`relative h-fit max-w-none bg-white shadow-2xl ${loading ? 'hidden' : 'block'}`}>
        <canvas ref={canvasRef} className="block" />
      </div>
    </div>
  </div>;
}
