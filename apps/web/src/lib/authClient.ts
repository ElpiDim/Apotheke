import { createAuthClient } from 'better-auth/react';

const hosted = typeof window !== 'undefined' && !['localhost', '127.0.0.1'].includes(window.location.hostname);

export const cloudApiUrl = hosted
  ? window.location.origin
  : import.meta.env.VITE_CLOUD_API_URL ?? 'https://peanut-api-staging.elpida-el-dimitriadou.workers.dev';

export const authClient = createAuthClient({
  baseURL: cloudApiUrl,
  fetchOptions: {
    credentials: 'include',
  },
});

export function announceAuthChange(): void {
  window.dispatchEvent(new CustomEvent('peanut:auth-change'));
}
