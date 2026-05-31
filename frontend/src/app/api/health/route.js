// Route Handler for GET /api/health
//
// Returns a combined health status for both the Next.js layer and the backend.
// Useful for:
//   • Docker / k8s readiness probes
//   • The settings UI (can check if the backend is reachable)
//   • Monitoring dashboards
//
// Response shape:
//   { nextjs: 'ok', backend: 'ok' | 'unreachable', backendDetail?: object, ts: number }

export const dynamic = 'force-dynamic'; // always fresh — never cache a health check

export async function GET() {
  let backend = 'unreachable';
  let backendDetail = null;

  try {
    const backendPort = process.env.BACKEND_PORT || 8000;
    const res = await fetch(`http://localhost:${backendPort}/api/health`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(3000), // give the backend 3 s to respond
      headers: { 'Accept': 'application/json' },
    });
    if (res.ok) {
      backendDetail = await res.json();
      backend = 'ok';
    } else {
      backend = `error:${res.status}`;
    }
  } catch (e) {
    backend = e.name === 'TimeoutError' ? 'timeout' : 'unreachable';
  }

  return Response.json(
    {
      nextjs: 'ok',
      backend,
      ...(backendDetail ? { backendDetail } : {}),
      ts: Date.now(),
    },
    {
      status: backend === 'ok' ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}
