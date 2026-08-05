import fs from 'node:fs/promises';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import type { SupportedExtension } from './fileTypes.js';

async function extractPdf(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath);
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

async function extractDocx(filePath: string): Promise<string> {
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value;
}

async function extractPlainText(filePath: string): Promise<string> {
  const text = await fs.readFile(filePath, 'utf8');
  return text.replace(/^\uFEFF/, '');
}

export async function extractDocumentText(
  filePath: string,
  extension: SupportedExtension,
): Promise<string> {
  switch (extension) {
    case '.pdf':
      return extractPdf(filePath);
    case '.docx':
      return extractDocx(filePath);
    case '.txt':
    case '.md':
    case '.markdown':
      return extractPlainText(filePath);
  }
}
