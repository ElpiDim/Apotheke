import path from 'node:path';

export const supportedDocumentTypes = {
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.markdown': 'text/markdown',
} as const;

export type SupportedExtension = keyof typeof supportedDocumentTypes;

export function getSupportedExtension(filename: string): SupportedExtension | null {
  const extension = path.extname(filename).toLowerCase();
  return extension in supportedDocumentTypes ? extension as SupportedExtension : null;
}
