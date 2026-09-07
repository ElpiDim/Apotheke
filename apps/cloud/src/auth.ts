import { betterAuth } from 'better-auth';
import type { Env } from './env';

export function createAuth(env: Env) {
  return betterAuth({
    appName: 'Peanut',
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: env.DB,
    trustedOrigins: [env.APP_ORIGIN],
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      minPasswordLength: 10,
      maxPasswordLength: 128,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
    advanced: {
      useSecureCookies: env.BETTER_AUTH_URL.startsWith('https://'),
    },
  });
}
