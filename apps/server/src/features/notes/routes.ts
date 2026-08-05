import { createNoteSchema, updateNoteSchema } from '@apotheke/contracts';
import { Router } from 'express';
import { database } from '../../database/context.js';
import { createNote, deleteNote, getNote, listNotes, updateNote } from './noteRepository.js';

export const notesRouter = Router();

notesRouter.get('/', (_request, response) => {
  response.json({ notes: listNotes(database) });
});

notesRouter.get('/:id', (request, response) => {
  response.json({ note: getNote(database, request.params.id) });
});

notesRouter.post('/', (request, response) => {
  const input = createNoteSchema.parse(request.body);
  response.status(201).json({ note: createNote(database, input) });
});

notesRouter.patch('/:id', (request, response) => {
  const input = updateNoteSchema.parse(request.body);
  response.json({ note: updateNote(database, request.params.id, input) });
});

notesRouter.delete('/:id', (request, response) => {
  deleteNote(database, request.params.id);
  response.status(204).end();
});
