import { Router } from 'express';
import { database } from '../../database/context.js';
import { search } from './searchService.js';

export const searchRouter = Router();

searchRouter.get('/', (request, response) => {
  const query = typeof request.query.q === 'string' ? request.query.q : '';
  response.json({ query, results: search(database, query) });
});
