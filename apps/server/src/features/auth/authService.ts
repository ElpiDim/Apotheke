import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import type { AuthUser, LoginInput, RegisterInput } from '@apotheke/contracts';
import type { ApothekeDatabase } from '../../database/database.js';
import { AppError } from '../../middleware/errors.js';

interface UserRow extends AuthUser {
  passwordSalt: string;
  passwordHash: string;
}

const sessions = new Map<string, string>();

function hashPassword(password: string, salt: Buffer): Buffer {
  return scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
}

function publicUser(row: Pick<UserRow, 'id' | 'name' | 'email'>): AuthUser {
  return { id: row.id, name: row.name, email: row.email };
}

function createSession(userId: string): string {
  const token = randomBytes(32).toString('base64url');
  sessions.set(token, userId);
  return token;
}

export function authConfigured(database: ApothekeDatabase): boolean {
  return Boolean(database.prepare('SELECT 1 FROM users LIMIT 1').get());
}

export function register(database: ApothekeDatabase, input: RegisterInput): { user: AuthUser; token: string } {
  if (authConfigured(database)) throw new AppError(409, 'A Peanut account already exists on this installation.', 'ACCOUNT_ALREADY_EXISTS');
  const now = new Date().toISOString();
  const id = randomUUID();
  const salt = randomBytes(16);
  const passwordHash = hashPassword(input.password, salt);
  database.prepare(`INSERT INTO users (id, name, email, password_salt, password_hash, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(id, input.name, input.email, salt.toString('base64'), passwordHash.toString('base64'), now, now);
  database.prepare('UPDATE user_profile SET name = ?, email = ?, updated_at = ? WHERE id = 1').run(input.name, input.email, now);
  const user = { id, name: input.name, email: input.email };
  return { user, token: createSession(id) };
}

export function login(database: ApothekeDatabase, input: LoginInput): { user: AuthUser; token: string } {
  const row = database.prepare(`SELECT id, name, email, password_salt AS passwordSalt, password_hash AS passwordHash
    FROM users WHERE email = ? COLLATE NOCASE`).get(input.email) as UserRow | undefined;
  if (!row) throw new AppError(401, 'Incorrect email or password.', 'INVALID_CREDENTIALS');
  const actual = hashPassword(input.password, Buffer.from(row.passwordSalt, 'base64'));
  const expected = Buffer.from(row.passwordHash, 'base64');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new AppError(401, 'Incorrect email or password.', 'INVALID_CREDENTIALS');
  }
  return { user: publicUser(row), token: createSession(row.id) };
}

export function userForToken(database: ApothekeDatabase, token: string | undefined): AuthUser {
  const userId = token ? sessions.get(token) : undefined;
  if (!userId) throw new AppError(401, 'Please sign in to Peanut.', 'AUTH_REQUIRED');
  const row = database.prepare('SELECT id, name, email FROM users WHERE id = ?').get(userId) as AuthUser | undefined;
  if (!row) throw new AppError(401, 'Please sign in to Peanut.', 'AUTH_REQUIRED');
  return publicUser(row as UserRow);
}

export function logout(token: string | undefined): void {
  if (token) sessions.delete(token);
}

export function bearerToken(header: string | undefined): string | undefined {
  return header?.startsWith('Bearer ') ? header.slice(7) : undefined;
}
