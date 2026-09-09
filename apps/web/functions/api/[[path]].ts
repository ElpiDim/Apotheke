const apiOrigin = 'https://peanut-api-staging.elpida-el-dimitriadou.workers.dev';

export const onRequest: PagesFunction = async ({ request }) => {
  const incoming = new URL(request.url);
  const upstream = new URL(`${incoming.pathname}${incoming.search}`, apiOrigin);
  const headers = new Headers(request.headers);
  headers.delete('host');

  return fetch(new Request(upstream, {
    method: request.method,
    headers,
    body: request.body,
    redirect: 'manual',
  }));
};
