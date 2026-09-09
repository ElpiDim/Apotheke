import mammoth from 'mammoth';
import * as pdfjs from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const maximumExtractedCharacters = 4_000_000;

export async function extractFileText(file: Blob, filename: string): Promise<string> {
  const extension = filename.split('.').pop()?.toLocaleLowerCase() ?? '';

  if (['txt', 'md', 'markdown'].includes(extension)) return (await file.text()).slice(0, maximumExtractedCharacters);

  if (extension === 'docx') {
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return result.value.slice(0, maximumExtractedCharacters);
  }

  if (extension === 'pdf') {
    const document = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const pages: string[] = [];
    let length = 0;
    for (let pageNumber = 1; pageNumber <= document.numPages && length < maximumExtractedCharacters; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items.flatMap((item) => 'str' in item ? [item.str] : []).join(' ');
      pages.push(text);
      length += text.length + 1;
    }
    return pages.join('\n').slice(0, maximumExtractedCharacters);
  }

  return '';
}
