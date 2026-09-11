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
