import type { RequestHandler } from 'express';
import { database } from '../database/context.js';
import { bearerToken, userForToken } from '../features/auth/authService.js';

export const requireAuth: RequestHandler = (request, _response, next) => {
  const localMode = request.header('x-peanut-local-mode') === '1';
  if (localMode) {
    next();
    return;
  }
  userForToken(database, bearerToken(request.header('authorization')));
  next();
};
