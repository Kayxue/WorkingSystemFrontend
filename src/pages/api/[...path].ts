import { BACKEND_BASE_URL } from "../../Constant";

export async function ALL({ request, params }) {
  const originalUrl = new URL(request.url);
  const path = params.path;

  const pathStr = Array.isArray(path) ? path.join('/') : path;

  const targetUrl = new URL(`${BACKEND_BASE_URL}/${pathStr}`);
  targetUrl.search = originalUrl.search;

  console.log(`Proxying to: ${targetUrl.href}`);

  const requestHeaders = new Headers(request.headers);

  const requestOptions = {
    method: request.method,
    headers: requestHeaders,
    credentials: 'include',
  };

  if (!['GET', 'HEAD'].includes(request.method!)) {
    requestOptions.body = request.body;
  }

  const backendRes = await fetch(targetUrl.href, requestOptions);

  return new Response(backendRes.body, {
    status: backendRes.status,
    headers: backendRes.headers,
    statusText: backendRes.statusText,
  });
}