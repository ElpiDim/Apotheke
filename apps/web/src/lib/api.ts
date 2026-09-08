export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
  }
}

async function parseError(response: Response): Promise<ApiError> {
  try {
    const body = await response.json() as { message?: string; error?: string };
    return new ApiError(
      body.message ?? 'Peanut could not complete the request.',
      response.status,
      body.error ?? 'API_ERROR',
    );
  } catch {
    return new ApiError('Peanut could not complete the request.', response.status, 'API_ERROR');
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const cloudEligible = path === '/profile' || path === '/categories' || path.startsWith('/categories/') || path === '/tags' || path === '/notes' || path.startsWith('/notes/') || path === '/tasks' || path.startsWith('/tasks/') || path === '/integrations' || path.startsWith('/integrations/') || path === '/documents' || path.startsWith('/documents/') || path.startsWith('/search');
  const session = cloudEligible ? await authClient.getSession() : null;
  const useCloud = Boolean(session?.data?.user);
  const requestInit: RequestInit = { ...init, headers };
  if (useCloud) requestInit.credentials = 'include';
  const response = await fetch(`${useCloud ? cloudApiUrl : ''}/api${path}`, requestInit);
  if (!response.ok) throw await parseError(response);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function apiBlob(path: string): Promise<Blob> {
  const headers = new Headers();
  const cloudEligible = path.startsWith('/integrations/') || path.startsWith('/documents/');
  const session = cloudEligible ? await authClient.getSession() : null;
  const useCloud = Boolean(session?.data?.user);
  const response = await fetch(`${useCloud ? cloudApiUrl : ''}/api${path}`, { headers, credentials: useCloud ? 'include' : 'same-origin' });
  if (!response.ok) throw await parseError(response);
  return response.blob();
}

export function jsonRequest(method: 'POST' | 'PATCH', body: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}
import { authClient, cloudApiUrl } from './authClient';
