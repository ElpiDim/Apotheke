import { Router } from 'express';
import { database } from '../../database/context.js';
import { listCategories, listTags } from './taxonomyRepository.js';

export const taxonomyRouter = Router();

taxonomyRouter.get('/categories', (_request, response) => {
  response.json({ categories: listCategories(database) });
});

taxonomyRouter.get('/tags', (_request, response) => {
  response.json({ tags: listTags(database) });
});
