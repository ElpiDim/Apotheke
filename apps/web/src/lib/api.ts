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
  const token = localStorage.getItem('peanut-auth-token');
  const headers = new Headers(init?.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (!token && localStorage.getItem('peanut-local-mode') === '1') headers.set('X-Peanut-Local-Mode', '1');
  const response = await fetch(`/api${path}`, { ...init, headers });
  if (response.status === 401 && !path.startsWith('/auth/')) {
    localStorage.removeItem('peanut-auth-token');
    window.dispatchEvent(new Event('peanut-auth-changed'));
  }
  if (!response.ok) throw await parseError(response);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function jsonRequest(method: 'POST' | 'PATCH', body: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}
