import mammoth from 'mammoth';
import * as pdfjs from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const maximumExtractedCharacters = 4_000_000;
const maximumPdfPages = 250;

function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, 0));
}

export async function extractFileText(file: Blob, filename: string): Promise<string> {
  const extension = filename.split('.').pop()?.toLocaleLowerCase() ?? '';

  if (['txt', 'md', 'markdown'].includes(extension)) return (await file.text()).slice(0, maximumExtractedCharacters);

  if (extension === 'docx') {
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return result.value.slice(0, maximumExtractedCharacters);
  }

  if (extension === 'pdf') {
    // Pass the bytes directly to PDF.js. Blob URLs are not readable by the PDF
    // worker in every browser, which prevented background page indexing.
    const loadingTask = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
    const pages: string[] = [];
    let length = 0;
    let document: Awaited<typeof loadingTask.promise> | undefined;
    try {
      document = await loadingTask.promise;
      const pageCount = Math.min(document.numPages, maximumPdfPages);
      for (let pageNumber = 1; pageNumber <= pageCount && length < maximumExtractedCharacters; pageNumber += 1) {
        const page = await document.getPage(pageNumber);
        try {
          const content = await page.getTextContent();
          const text = content.items.flatMap((item) => 'str' in item ? [item.str] : []).join(' ');
          pages.push(`[[[PINIT_PAGE:${pageNumber}]]]\n${text}`);
          length += text.length + 1;
        } finally {
          page.cleanup();
        }
        if (pageNumber % 5 === 0) await yieldToBrowser();
      }
    } finally {
      await document?.destroy();
    }
    return pages.join('\n').slice(0, maximumExtractedCharacters);
  }

  return '';
}
