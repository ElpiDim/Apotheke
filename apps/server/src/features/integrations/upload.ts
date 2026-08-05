import { randomUUID } from 'node:crypto';
import path from 'node:path';
import multer from 'multer';
import { config } from '../../config/config.js';
import { AppError } from '../../middleware/errors.js';

const storage = multer.diskStorage({
  destination: (_request, _file, callback) => callback(null, config.tempDir),
  filename: (_request, _file, callback) => callback(null, `${randomUUID()}.upload`),
});

export const integrationPdfUpload = multer({
  storage,
  limits: { fileSize: config.maxImportBytes, files: 1 },
  fileFilter: (_request, file, callback) => {
    if (path.extname(file.originalname).toLowerCase() !== '.pdf' || file.mimetype !== 'application/pdf') {
      callback(new AppError(400, 'Only PDF files can be added here.', 'PDF_REQUIRED'));
      return;
    }
    callback(null, true);
  },
});
