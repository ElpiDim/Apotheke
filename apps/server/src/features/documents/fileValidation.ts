import fs from 'node:fs/promises';
import { AppError } from '../../middleware/errors.js';
import type { SupportedExtension } from './fileTypes.js';

const imageExtensions = new Set<SupportedExtension>(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']);
const maxImageBytes = 20 * 1024 * 1024;

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((value, index) => bytes[index] === value);
}

export async function validateStoredUpload(filePath: string, size: number, extension: SupportedExtension): Promise<void> {
  if (size === 0) throw new AppError(400, 'Empty files cannot be uploaded.', 'EMPTY_FILE');
  if (imageExtensions.has(extension) && size > maxImageBytes) {
    throw new AppError(413, 'Images can be up to 20 MB.', 'FILE_TOO_LARGE');
  }
  const handle = await fs.open(filePath, 'r');
  const bytes = new Uint8Array(32);
  const { bytesRead } = await handle.read(bytes, 0, bytes.length, 0);
  await handle.close();
  const sample = bytes.slice(0, bytesRead);
  const ascii = new TextDecoder('latin1').decode(sample);
  const valid = extension === '.pdf' ? ascii.startsWith('%PDF-')
    : extension === '.docx' ? startsWith(sample, [0x50, 0x4b, 0x03, 0x04])
      : ['.txt', '.md', '.markdown'].includes(extension) ? !sample.includes(0)
        : ['.jpg', '.jpeg'].includes(extension) ? startsWith(sample, [0xff, 0xd8, 0xff])
          : extension === '.png' ? startsWith(sample, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
            : extension === '.gif' ? ascii.startsWith('GIF87a') || ascii.startsWith('GIF89a')
              : extension === '.webp' ? ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP'
                : extension === '.avif' ? ascii.slice(4, 8) === 'ftyp' && /avif|avis/.test(ascii.slice(8, 20))
                  : false;
  if (!valid) throw new AppError(400, 'The file contents do not match its extension.', 'INVALID_FILE_CONTENT');
}
