export async function ALL({ request, params }) {
  const { path } = params;
  const body = request.body ? await request.text() : undefined;
  const target = `http://localhost:3000/${path}`;
  console.log(`Proxying request to: ${target}`);

  const backendRes = await fetch(target, {
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
