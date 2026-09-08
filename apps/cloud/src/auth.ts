import { betterAuth } from 'better-auth';
import type { Env } from './env';

export function createAuth(env: Env) {
  const trustedOrigins = env.APP_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean);

  return betterAuth({
    appName: 'Peanut',
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: env.DB,
    trustedOrigins,
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
    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
      customRules: {
        '/sign-in/email': { window: 60, max: 10 },
        '/sign-up/email': { window: 60, max: 5 },
      },
    },
    advanced: {
      ipAddress: {
        ipAddressHeaders: ['cf-connecting-ip'],
      },
      useSecureCookies: env.BETTER_AUTH_URL.startsWith('https://'),
      cookies: {
        session_token: {
          attributes: {
            sameSite: 'none',
            secure: true,
          },
        },
      },
    },
  });
}
