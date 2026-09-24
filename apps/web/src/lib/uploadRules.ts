export const MAX_UPLOAD_FILES = 10;
export const MAX_DOCUMENT_BYTES = 50 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

const supported = new Set(['pdf', 'docx', 'txt', 'md', 'markdown', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'avif']);
const images = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif']);

export function validateUploadSelection(files: File[]): string | null {
  if (files.length > MAX_UPLOAD_FILES) return `Choose up to ${MAX_UPLOAD_FILES} files at a time.`;
  for (const file of files) {
    const extension = file.name.split('.').pop()?.toLocaleLowerCase() ?? '';
    if (!supported.has(extension)) return `“${file.name}” is not supported. Choose PDF, DOCX, TXT, Markdown or an image.`;
    if (file.size === 0) return `“${file.name}” is empty.`;
    const limit = images.has(extension) ? MAX_IMAGE_BYTES : MAX_DOCUMENT_BYTES;
    if (file.size > limit) return `“${file.name}” is too large. ${images.has(extension) ? 'Images' : 'Documents'} can be up to ${limit / 1024 / 1024} MB.`;
  }
  return null;
}

export function validatePdf(file: File): string | null {
  if (!file.name.toLocaleLowerCase().endsWith('.pdf')) return 'Integration folders accept PDF files only.';
  if (file.size === 0) return 'Empty PDF files cannot be uploaded.';
  if (file.size > MAX_DOCUMENT_BYTES) return 'PDF files can be up to 50 MB.';
  return null;
}

export async function validateLocalFileContents(file: File): Promise<void> {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  const bytes = new Uint8Array(await file.slice(0, 32).arrayBuffer());
  const ascii = new TextDecoder('latin1').decode(bytes);
  const starts = (signature: number[]) => signature.every((value, index) => bytes[index] === value);
  const valid = extension === 'pdf' ? ascii.startsWith('%PDF-')
    : extension === 'docx' ? starts([0x50, 0x4b, 0x03, 0x04])
      : ['txt', 'md', 'markdown'].includes(extension) ? !bytes.includes(0)
        : ['jpg', 'jpeg'].includes(extension) ? starts([0xff, 0xd8, 0xff])
          : extension === 'png' ? starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
            : extension === 'gif' ? ascii.startsWith('GIF87a') || ascii.startsWith('GIF89a')
              : extension === 'webp' ? ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP'
                : extension === 'avif' ? ascii.slice(4, 8) === 'ftyp' && /avif|avis/u.test(ascii.slice(8, 20)) : false;
  if (!valid) throw new Error('The file contents do not match its extension.');
}
