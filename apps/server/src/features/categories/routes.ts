import { Router } from 'express';
import { database } from '../../database/context.js';
import { deleteCategory, listCategories, listTags } from './taxonomyRepository.js';

export const taxonomyRouter = Router();

taxonomyRouter.get('/categories', (_request, response) => {
  response.json({ categories: listCategories(database) });
});

taxonomyRouter.get('/tags', (_request, response) => {
  response.json({ tags: listTags(database) });
});

taxonomyRouter.delete('/categories/:id', (request, response) => {
  deleteCategory(database, request.params.id);
  response.status(204).end();
});
