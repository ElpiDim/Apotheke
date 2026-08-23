import { Router } from 'express';
import { database } from '../../database/context.js';
import { answerQuestion, search } from './searchService.js';

export const searchRouter = Router();

searchRouter.get('/answer', (request, response) => {
  const question = typeof request.query.q === 'string' ? request.query.q.trim() : '';
  response.json(answerQuestion(database, question));
});

searchRouter.get('/', (request, response) => {
  const query = typeof request.query.q === 'string' ? request.query.q : '';
  response.json({ query, results: search(database, query) });
});
