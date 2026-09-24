import { authClient, cloudApiUrl } from './authClient';
import { localApi, localBlob } from './localWorkspace';

const retryableStatuses = new Set([502, 503, 504]);

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

async function getReliableSession() {
  let latest = await authClient.getSession();
  for (const wait of [250, 750]) {
    if (!latest.error) return latest;
    await delay(wait);
    latest = await authClient.getSession();
  }
  return latest;
}

async function fetchReliable(url: string, init: RequestInit): Promise<Response> {
  try {
    const response = await fetch(url, init);
    if ((init.method === undefined || init.method === 'GET') && retryableStatuses.has(response.status)) {
      await delay(350);
      return fetch(url, init);
    }
    return response;
  } catch (error) {
    if (init.method !== undefined && init.method !== 'GET') throw error;
    await delay(350);
    return fetch(url, init);
  }
}

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly code: string) {
    super(message);
  }
}

async function parseError(response: Response): Promise<ApiError> {
  try {
    const body = await response.json() as { message?: string; error?: string };
    return new ApiError(body.message ?? 'Peanut could not complete the request.', response.status, body.error ?? 'API_ERROR');
  } catch {
    return new ApiError('Peanut could not complete the request.', response.status, 'API_ERROR');
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const cloudEligible = path === '/profile' || path === '/categories' || path.startsWith('/categories/') || path === '/tags' || path === '/notes' || path.startsWith('/notes/') || path === '/tasks' || path.startsWith('/tasks/') || path === '/integrations' || path.startsWith('/integrations/') || path === '/documents' || path.startsWith('/documents/') || path.startsWith('/search');
  const session = cloudEligible ? await getReliableSession() : null;
  if (session?.error) throw new ApiError('Could not verify your session. Please retry; your workspace has not been changed.', 503, 'SESSION_UNAVAILABLE');
  const useCloud = Boolean(session?.data?.user);
  if (!useCloud) return localApi<T>(path, init);
  const requestInit: RequestInit = { ...init, headers };
  if (useCloud) {
    requestInit.credentials = 'include';
  }
  const response = await fetchReliable(`${useCloud ? cloudApiUrl : ''}/api${path}`, requestInit);
  if (!response.ok) throw await parseError(response);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function apiBlob(path: string): Promise<Blob> {
  const headers = new Headers();
  const cloudEligible = path.startsWith('/integrations/') || path.startsWith('/documents/');
  const session = cloudEligible ? await getReliableSession() : null;
  if (session?.error) throw new ApiError('Could not verify your session. Please retry.', 503, 'SESSION_UNAVAILABLE');
  const useCloud = Boolean(session?.data?.user);
  if (!useCloud) return localBlob(path);
  const response = await fetchReliable(`${useCloud ? cloudApiUrl : ''}/api${path}`, { headers, credentials: useCloud ? 'include' : 'same-origin' });
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
