import { createAuth } from './auth';
import type { Env } from './env';
import { createNote, createTask, deleteCategory, deleteNote, deleteTask, getNote, getUserProfile, listCategories, listNotes, listTags, listTasks, updateNote, updateTask, updateUserProfile, WorkspaceError } from './workspace';
import { createEntry, createFolder, createPdf, createSpace, deleteEntry, deleteFolder, deleteSpace, getPdf, listIntegrationWorkspace, updateEntry, updateFolder, updateSpace } from './integrations';
import { deleteDocument, getDocument, getFile, importDocument, listDocuments, listPendingTextDocuments, updateExtractedText } from './documents';
import { answerWorkspace, searchWorkspace } from './search';

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

function allowedOrigin(request: Request, env: Env): string | null {
  const origin = request.headers.get('Origin');
  if (!origin) return null;
  const allowed = env.APP_ORIGIN.split(',').map((value) => value.trim());
  return allowed.includes(origin) ? origin : null;
}

function withCors(response: Response, request: Request, env: Env): Response {
  const origin = allowedOrigin(request, env);
  if (!origin) return response;
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Access-Control-Allow-Credentials', 'true');
  headers.append('Vary', 'Origin');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

async function requireSession(request: Request, env: Env) {
  const session = await createAuth(env).api.getSession({ headers: request.headers });
  return session ?? null;
}

async function resolveWorkspaceOwner(request: Request, env: Env): Promise<string | null> {
  const session = await requireSession(request, env);
  if (session) return session.user.id;
  const token = request.headers.get('X-Peanut-Guest');
  if (!token || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(token)) return null;
  const ownerId = `guest:${token}`;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  const guestKey = [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
  const now = new Date().toISOString();
  await env.DB.prepare('INSERT OR IGNORE INTO "user" (id, name, email, emailVerified, createdAt, updatedAt) VALUES (?, ?, ?, 0, ?, ?)')
    .bind(ownerId, 'Guest', `guest-${guestKey}@guest.peanut.invalid`, now, now).run();
  return ownerId;
}

async function workspaceResponse(request: Request, env: Env, pathname: string, ownerId: string): Promise<Response | null> {
  if (pathname === '/api/profile' && request.method === 'GET') return json({ profile: await getUserProfile(env.DB, ownerId) });
  if (pathname === '/api/profile' && request.method === 'PATCH') return json({ profile: await updateUserProfile(env.DB, ownerId, await request.json()) });
  if (pathname === '/api/categories' && request.method === 'GET') {
    return json({ categories: await listCategories(env.DB, ownerId) });
  }
  if (pathname === '/api/tags' && request.method === 'GET') return json({ tags: await listTags(env.DB, ownerId) });
  const categoryMatch = pathname.match(/^\/api\/categories\/([^/]+)$/u);
  if (categoryMatch && request.method === 'DELETE') {
    await deleteCategory(env.DB, ownerId, categoryMatch[1]!);
    return new Response(null, { status: 204 });
  }
  if (pathname === '/api/notes' && request.method === 'GET') {
    return json({ notes: await listNotes(env.DB, ownerId) });
  }
  if (pathname === '/api/notes' && request.method === 'POST') {
    return json({ note: await createNote(env.DB, ownerId, await request.json()) }, 201);
  }
  const noteMatch = pathname.match(/^\/api\/notes\/([^/]+)$/u);
  if (noteMatch && request.method === 'GET') {
    return json({ note: await getNote(env.DB, ownerId, noteMatch[1]!) });
  }
  if (noteMatch && request.method === 'PATCH') {
    return json({ note: await updateNote(env.DB, ownerId, noteMatch[1]!, await request.json()) });
  }
  if (noteMatch && request.method === 'DELETE') {
    await deleteNote(env.DB, ownerId, noteMatch[1]!);
    return new Response(null, { status: 204 });
  }
  if (pathname === '/api/tasks' && request.method === 'GET') return json({ tasks: await listTasks(env.DB, ownerId) });
  if (pathname === '/api/tasks' && request.method === 'POST') return json({ task: await createTask(env.DB, ownerId, await request.json()) }, 201);
  const taskMatch = pathname.match(/^\/api\/tasks\/([^/]+)$/u);
  if (taskMatch && request.method === 'PATCH') return json({ task: await updateTask(env.DB, ownerId, taskMatch[1]!, await request.json()) });
  if (taskMatch && request.method === 'DELETE') {
    await deleteTask(env.DB, ownerId, taskMatch[1]!);
    return new Response(null, { status: 204 });
  }
  if (pathname === '/api/integrations' && request.method === 'GET') return json(await listIntegrationWorkspace(env.DB, ownerId));
  if (pathname === '/api/integrations/spaces' && request.method === 'GET') return json({ spaces: (await listIntegrationWorkspace(env.DB, ownerId)).spaces });
  if (pathname === '/api/integrations/spaces' && request.method === 'POST') return json({ space: await createSpace(env.DB, ownerId, await request.json()) }, 201);
  const spaceMatch = pathname.match(/^\/api\/integrations\/spaces\/([^/]+)$/u);
  if (spaceMatch && request.method === 'PATCH') return json({ space: await updateSpace(env.DB, ownerId, spaceMatch[1]!, await request.json()) });
  if (spaceMatch && request.method === 'DELETE') { await deleteSpace(env.DB, env.FILES, ownerId, spaceMatch[1]!); return new Response(null, { status: 204 }); }
  if (pathname === '/api/integrations/folders' && request.method === 'POST') return json({ folder: await createFolder(env.DB, ownerId, await request.json()) }, 201);
  const folderMatch = pathname.match(/^\/api\/integrations\/folders\/([^/]+)$/u);
  if (folderMatch && request.method === 'PATCH') return json({ folder: await updateFolder(env.DB, ownerId, folderMatch[1]!, await request.json()) });
  if (folderMatch && request.method === 'DELETE') { await deleteFolder(env.DB, env.FILES, ownerId, folderMatch[1]!); return new Response(null, { status: 204 }); }
  if (pathname === '/api/integrations/entries' && request.method === 'POST') return json({ entry: await createEntry(env.DB, ownerId, await request.json()) }, 201);
  if (pathname === '/api/integrations/pdf' && request.method === 'POST') return json({ entry: await createPdf(env.DB, env.FILES, ownerId, await request.formData()) }, 201);
  const pdfMatch = pathname.match(/^\/api\/integrations\/entries\/([^/]+)\/pdf$/u);
  if (pdfMatch && request.method === 'GET') return getPdf(env.DB, env.FILES, ownerId, pdfMatch[1]!);
  const entryMatch = pathname.match(/^\/api\/integrations\/entries\/([^/]+)$/u);
  if (entryMatch && request.method === 'PATCH') return json({ entry: await updateEntry(env.DB, ownerId, entryMatch[1]!, await request.json()) });
  if (entryMatch && request.method === 'DELETE') { await deleteEntry(env.DB, env.FILES, ownerId, entryMatch[1]!); return new Response(null, { status: 204 }); }
  if (pathname === '/api/documents' && request.method === 'GET') return json({ documents: await listDocuments(env.DB, ownerId) });
  if (pathname === '/api/documents/import' && request.method === 'POST') return json({ document: await importDocument(env.DB, env.FILES, ownerId, await request.formData()) }, 201);
  if (pathname === '/api/documents/pending-text' && request.method === 'GET') return json({ documents: await listPendingTextDocuments(env.DB, ownerId) });
  const extractedTextMatch = pathname.match(/^\/api\/documents\/([^/]+)\/extracted-text$/u);
  if (extractedTextMatch && request.method === 'PATCH') { await updateExtractedText(env.DB, ownerId, extractedTextMatch[1]!, await request.json()); return new Response(null, { status: 204 }); }
  const documentFileMatch = pathname.match(/^\/api\/documents\/([^/]+)\/file$/u);
  if (documentFileMatch && request.method === 'GET') return getFile(env.DB, env.FILES, ownerId, documentFileMatch[1]!);
  const documentMatch = pathname.match(/^\/api\/documents\/([^/]+)$/u);
  if (documentMatch && request.method === 'GET') return json(await getDocument(env.DB, ownerId, documentMatch[1]!));
  if (documentMatch && request.method === 'DELETE') { await deleteDocument(env.DB, env.FILES, ownerId, documentMatch[1]!); return new Response(null, { status: 204 }); }
  if (pathname === '/api/search' && request.method === 'GET') return json(await searchWorkspace(env.DB, ownerId, new URL(request.url).searchParams.get('q') ?? ''));
  if (pathname === '/api/search/answer' && request.method === 'GET') return json(await answerWorkspace(env.DB, ownerId, new URL(request.url).searchParams.get('q') ?? ''));
  return null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.headers.has('Origin') && !allowedOrigin(request, env)) {
      return json({ error: 'ORIGIN_NOT_ALLOWED', message: 'This origin is not allowed.' }, 403);
    }

    if (request.method === 'OPTIONS') {
      const origin = allowedOrigin(request, env);
      if (!origin) return new Response(null, { status: 403 });
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Headers': 'Content-Type, X-Peanut-Guest',
          'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
          'Access-Control-Max-Age': '86400',
          'Vary': 'Origin',
        },
      });
    }

    if (url.pathname.startsWith('/api/auth/')) {
      return withCors(await createAuth(env).handler(request), request, env);
    }

    if (url.pathname === '/api/health') {
      return withCors(json({ status: 'ok', service: 'peanut-cloud' }), request, env);
    }

    if (url.pathname === '/api/session') {
      const session = await requireSession(request, env);
      return withCors(session ? json({ user: session.user }) : json({ error: 'AUTH_REQUIRED' }, 401), request, env);
    }

    if (url.pathname === '/api/profile' || url.pathname === '/api/categories' || url.pathname.startsWith('/api/categories/') || url.pathname === '/api/tags' || url.pathname === '/api/notes' || url.pathname.startsWith('/api/notes/') || url.pathname === '/api/tasks' || url.pathname.startsWith('/api/tasks/') || url.pathname === '/api/integrations' || url.pathname.startsWith('/api/integrations/') || url.pathname === '/api/documents' || url.pathname.startsWith('/api/documents/') || url.pathname === '/api/search' || url.pathname === '/api/search/answer') {
      const ownerId = await resolveWorkspaceOwner(request, env);
      if (!ownerId) return withCors(json({ error: 'AUTH_REQUIRED', message: 'Please sign in to Peanut.' }, 401), request, env);
      try {
        const response = await workspaceResponse(request, env, url.pathname, ownerId);
        return withCors(response ?? json({ error: 'NOT_FOUND' }, 404), request, env);
      } catch (error) {
        if (error instanceof WorkspaceError) return withCors(json({ error: error.code, message: error.message }, error.status), request, env);
        if (error instanceof Error && error.name === 'ZodError') return withCors(json({ error: 'INVALID_INPUT', message: 'Please check the submitted fields.' }, 400), request, env);
        throw error;
      }
    }

    return withCors(json({ error: 'NOT_FOUND' }, 404), request, env);
  },
} satisfies ExportedHandler<Env>;
