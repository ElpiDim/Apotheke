import { loginSchema, registerSchema } from '@apotheke/contracts';
import { Router } from 'express';
import { database } from '../../database/context.js';
import { authConfigured, bearerToken, login, logout, register, userForToken } from './authService.js';

export const authRouter = Router();

authRouter.get('/status', (request, response) => {
  let user = null;
  try { user = userForToken(database, bearerToken(request.header('authorization'))); } catch { /* Signed-out status is valid. */ }
  response.json({ configured: authConfigured(database), user });
});
authRouter.post('/register', (request, response) => response.status(201).json(register(database, registerSchema.parse(request.body))));
authRouter.post('/login', (request, response) => response.json(login(database, loginSchema.parse(request.body))));
authRouter.get('/me', (request, response) => response.json({ user: userForToken(database, bearerToken(request.header('authorization'))) }));
authRouter.post('/logout', (request, response) => {
  logout(bearerToken(request.header('authorization')));
  response.status(204).end();
});
