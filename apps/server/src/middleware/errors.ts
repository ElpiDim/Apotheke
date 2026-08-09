import type { ErrorRequestHandler } from 'express';
import { MulterError } from 'multer';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code: string,
  ) {
    super(message);
  }
}

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof AppError) {
    response.status(error.status).json({ error: error.code, message: error.message });
    return;
  }

  if (error instanceof ZodError) {
    response.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'The request contains invalid data.',
      details: error.issues,
    });
    return;
  }

  if (error instanceof MulterError) {
    const message = error.code === 'LIMIT_FILE_SIZE'
      ? 'The selected file is larger than the 50 MB import limit.'
      : error.message;
    response.status(400).json({ error: 'UPLOAD_ERROR', message });
    return;
  }

  console.error(error);
  response.status(500).json({
    error: 'INTERNAL_ERROR',
    message: 'Pinit could not complete the request.',
  });
};
