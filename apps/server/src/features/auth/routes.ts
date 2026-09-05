import { loginSchema, registerSchema } from '@apotheke/contracts';
import { Router } from 'express';
import { database } from '../../database/context.js';
import { authConfigured, bearerToken, login, logout, register, userForToken } from './authService.js';

export const authRouter = Router();

authRouter.get('/status', (_request, response) => response.json({ configured: authConfigured(database) }));
authRouter.post('/register', (request, response) => response.status(201).json(register(database, registerSchema.parse(request.body))));
authRouter.post('/login', (request, response) => response.json(login(database, loginSchema.parse(request.body))));
authRouter.get('/me', (request, response) => response.json({ user: userForToken(database, bearerToken(request.header('authorization'))) }));
authRouter.post('/logout', (request, response) => {
  logout(bearerToken(request.header('authorization')));
  response.status(204).end();
});
