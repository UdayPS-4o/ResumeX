const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.BACKEND_PORT || 8000}`;

async function handle(req, { params }) {
  const resolvedParams = await params;
  const path = resolvedParams?.path;
  const subpath = Array.isArray(path) ? path.join('/') : (path || '');
  const url = new URL(req.url);
  const target = `${backendUrl}/api/${subpath}${url.search}`;

  const headers = new Headers(req.headers);
  headers.delete('host');

  const body = ['GET', 'HEAD'].includes(req.method) ? undefined : req.body;

  try {
    const res = await fetch(target, {
      method: req.method,
      headers,
      body,
      // duplex is required by Node.js fetch when streaming request body
      duplex: 'half',
    });

    const resHeaders = new Headers(res.headers);
    // Remove content-encoding if any to prevent double decompression issues
    resHeaders.delete('content-encoding');

    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: resHeaders,
    });
  } catch (err) {
    console.error(`[api-proxy] Failed to fetch ${target}:`, err);
    return Response.json({ error: err?.message || 'Backend unreachable' }, { status: 502 });
  }
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
