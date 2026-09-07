import { createAuth } from './auth';
import type { Env } from './env';

function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  });
}

async function requireSession(request: Request, env: Env) {
  const session = await createAuth(env).api.getSession({ headers: request.headers });
  return session ?? null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/auth/')) {
      return createAuth(env).handler(request);
    }

    if (url.pathname === '/api/health') {
      return json({ status: 'ok', service: 'peanut-cloud' });
    }

    if (url.pathname === '/api/session') {
      const session = await requireSession(request, env);
      return session ? json({ user: session.user }) : json({ error: 'AUTH_REQUIRED' }, 401);
    }

    return json({ error: 'NOT_FOUND' }, 404);
  },
} satisfies ExportedHandler<Env>;
