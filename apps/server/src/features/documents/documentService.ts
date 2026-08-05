import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { importDocumentFieldsSchema, type DocumentRecord } from '@apotheke/contracts';
import type { Express } from 'express';
import { config } from '../../config/config.js';
import { database } from '../../database/context.js';
import { AppError } from '../../middleware/errors.js';
import { createDocument } from './documentRepository.js';
import { getSupportedExtension, supportedDocumentTypes } from './fileTypes.js';
import { extractDocumentText } from './textExtractor.js';

function parseTags(value: unknown): string[] {
  if (typeof value !== 'string' || !value.trim()) return [];
  const trimmed = value.trim();

  if (trimmed.startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.every((tag) => typeof tag === 'string')) {
        return parsed;
      }
    } catch {
      // Fall through to a validation error with a stable public message.
    }
    throw new AppError(400, 'Tags must be a JSON array of strings.', 'INVALID_TAGS');
  }

  return trimmed.split(',').map((tag) => tag.trim()).filter(Boolean);
}

export async function importDocument(
  file: Express.Multer.File | undefined,
  body: Record<string, unknown>,
): Promise<DocumentRecord> {
  if (!file) throw new AppError(400, 'Choose a document to import.', 'FILE_REQUIRED');

  const extension = getSupportedExtension(file.originalname);
  if (!extension) {
    await fs.rm(file.path, { force: true });
    throw new AppError(400, 'Unsupported file type.', 'UNSUPPORTED_FILE_TYPE');
  }

  const defaultTitle = path.basename(file.originalname, path.extname(file.originalname));
  const fields = importDocumentFieldsSchema.parse({
    title: typeof body.title === 'string' && body.title.trim() ? body.title : defaultTitle,
    category: typeof body.category === 'string' && body.category.trim() ? body.category : null,
    tags: parseTags(body.tags),
    version: typeof body.version === 'string' && body.version.trim() ? body.version : '1.0',
  });

  let finalPath: string | null = null;
  try {
    const extractedText = await extractDocumentText(file.path, extension);
    const storedFilename = `${randomUUID()}${extension}`;
    finalPath = path.join(config.filesDir, storedFilename);
    await fs.rename(file.path, finalPath);

    return createDocument(database, fields, {
      storedFilename,
      originalFilename: file.originalname,
      mimeType: supportedDocumentTypes[extension],
      fileSize: file.size,
      extractedText,
    });
  } catch (error) {
    await fs.rm(file.path, { force: true });
    if (finalPath) await fs.rm(finalPath, { force: true });
    throw error;
  }
}
