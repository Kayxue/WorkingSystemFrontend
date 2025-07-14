export async function ALL({ request, params}) {
  const originalUrl = new URL(request.url);
  const path = params.path;

  // 保留完整 path 部分
  const pathStr = Array.isArray(path) ? path.join('/') : path;

  // 組合完整目標 URL（保留 search query）
  const targetUrl = new URL(`http://localhost:3000/${pathStr}`);
  targetUrl.search = originalUrl.search;

  // 取得 request body
  const body = request.body ? await request.text() : undefined;

  console.log(`Proxying to: ${targetUrl.href}`);

  const backendRes = await fetch(targetUrl.href, {
    method: request.method,
    headers: {
      ...Object.fromEntries(request.headers.entries()),
    },
    body: ['GET', 'HEAD'].includes(request.method!) ? undefined : body,
    credentials: 'include',
  });

  const result = await backendRes.text();
  return new Response(result, {
    status: backendRes.status,
    headers: {
      ...Object.fromEntries(backendRes.headers.entries()),
    },
  });
}
