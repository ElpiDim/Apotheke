import { createAuthClient } from 'better-auth/react';

export const cloudApiUrl = import.meta.env.VITE_CLOUD_API_URL
  ?? 'https://peanut-api-staging.elpida-el-dimitriadou.workers.dev';

export const authClient = createAuthClient({
  baseURL: cloudApiUrl,
  fetchOptions: {
    credentials: 'include',
  },
});

export function announceAuthChange(): void {
  window.dispatchEvent(new CustomEvent('peanut:auth-change'));
}
