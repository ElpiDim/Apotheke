import { updateUserProfileSchema } from '@apotheke/contracts';
import { Router } from 'express';
import { database } from '../../database/context.js';
import { getUserProfile, updateUserProfile } from './profileRepository.js';

export const profileRouter = Router();

profileRouter.get('/', (_request, response) => response.json({ profile: getUserProfile(database) }));
profileRouter.patch('/', (request, response) => response.json({ profile: updateUserProfile(database, updateUserProfileSchema.parse(request.body)) }));
