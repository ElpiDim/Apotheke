import { createTaskSchema, updateTaskSchema } from '@apotheke/contracts';
import { Router } from 'express';
import { database } from '../../database/context.js';
import { createTask, deleteTask, listTasks, updateTask } from './taskRepository.js';

export const tasksRouter = Router();

tasksRouter.get('/', (_request, response) => {
  response.json({ tasks: listTasks(database) });
});

tasksRouter.post('/', (request, response) => {
  response.status(201).json({ task: createTask(database, createTaskSchema.parse(request.body)) });
});

tasksRouter.patch('/:id', (request, response) => {
  response.json({ task: updateTask(database, request.params.id, updateTaskSchema.parse(request.body)) });
});

tasksRouter.delete('/:id', (request, response) => {
  deleteTask(database, request.params.id);
  response.status(204).end();
});
