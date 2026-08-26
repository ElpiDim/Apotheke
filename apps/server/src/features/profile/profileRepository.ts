import type { UpdateUserProfileInput, UserProfile } from '@apotheke/contracts';
import type { ApothekeDatabase } from '../../database/database.js';

interface ProfileRow { name: string; email: string; role: string; bio: string; updatedAt: string }

export function getUserProfile(database: ApothekeDatabase): UserProfile {
  return database.prepare('SELECT name, email, role, bio, updated_at AS updatedAt FROM user_profile WHERE id = 1').get() as ProfileRow;
}

export function updateUserProfile(database: ApothekeDatabase, input: UpdateUserProfileInput): UserProfile {
  database.prepare('UPDATE user_profile SET name = ?, email = ?, role = ?, bio = ?, updated_at = ? WHERE id = 1')
    .run(input.name, input.email, input.role, input.bio, new Date().toISOString());
  return getUserProfile(database);
}
