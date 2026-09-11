import { WorkspaceError } from './workspace';

export const MAX_DOCUMENT_BYTES = 50 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

const imageExtensions = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif']);

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((value, index) => bytes[index] === value);
}

export async function validateUploadedFile(file: File, extension: string): Promise<void> {
  if (file.size === 0) throw new WorkspaceError(400, 'Empty files cannot be uploaded.', 'EMPTY_FILE');
  const image = imageExtensions.has(extension);
  const limit = image ? MAX_IMAGE_BYTES : MAX_DOCUMENT_BYTES;
  if (file.size > limit) {
    throw new WorkspaceError(413, `${image ? 'Images' : 'Documents'} can be up to ${limit / 1024 / 1024} MB.`, 'FILE_TOO_LARGE');
  }

  const bytes = new Uint8Array(await file.slice(0, 32).arrayBuffer());
  const ascii = new TextDecoder('latin1').decode(bytes);
  const valid = extension === 'pdf' ? ascii.startsWith('%PDF-')
    : extension === 'docx' ? startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])
      : ['txt', 'md', 'markdown'].includes(extension) ? !bytes.includes(0)
        : ['jpg', 'jpeg'].includes(extension) ? startsWith(bytes, [0xff, 0xd8, 0xff])
          : extension === 'png' ? startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
            : extension === 'gif' ? ascii.startsWith('GIF87a') || ascii.startsWith('GIF89a')
              : extension === 'webp' ? ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP'
                : extension === 'avif' ? ascii.slice(4, 8) === 'ftyp' && /avif|avis/.test(ascii.slice(8, 20))
                  : false;

  if (!valid) throw new WorkspaceError(400, 'The file contents do not match its extension.', 'INVALID_FILE_CONTENT');
}
