import { randomUUID } from 'node:crypto';
import multer from 'multer';
import { config } from '../../config/config.js';
import { AppError } from '../../middleware/errors.js';
import { getSupportedExtension } from './fileTypes.js';

const storage = multer.diskStorage({
  destination: (_request, _file, callback) => callback(null, config.tempDir),
  filename: (_request, _file, callback) => callback(null, `${randomUUID()}.upload`),
});

export const documentUpload = multer({
  storage,
  limits: {
    fileSize: config.maxImportBytes,
    files: 1,
  },
  fileFilter: (_request, file, callback) => {
    if (!getSupportedExtension(file.originalname)) {
      callback(new AppError(
        400,
        'Unsupported file type. Peanut accepts PDF, DOCX, TXT, Markdown and common image files.',
        'UNSUPPORTED_FILE_TYPE',
      ));
      return;
    }
    callback(null, true);
  },
});
