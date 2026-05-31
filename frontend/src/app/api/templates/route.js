// Route Handler for GET /api/templates
//
// This replaces the next.config.mjs rewrite for this one endpoint. Benefits
// over a plain rewrite:
//   • ISR caching (5-min revalidation) — repeated requests are served from
//     Next.js's cache, hitting the backend only once per cache window.
//   • Edge-compatible: can be deployed to edge runtimes / CDN.
//   • Graceful fallback: returns [] instead of a 502 when the backend is down.
//
// All other /api/* routes still proxy through the rewrite in next.config.mjs.

export const revalidate = 300; // ISR: rebuild this route at most every 5 minutes

export async function GET() {
  try {
    const backendPort = process.env.BACKEND_PORT || 8000;
    const res = await fetch(`http://localhost:${backendPort}/api/templates`, {
      next: { revalidate: 300 },
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) {
      return Response.json({ templates: [] }, { status: res.status });
    }

    const data = await res.json();
    return Response.json(data, {
      headers: {
        // Let browsers and CDN edges cache for 5 minutes too.
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      },
    });
  } catch {
    // Backend unreachable (cold start, not running locally, etc.)
    // Return an empty list rather than a 500 so the UI degrades gracefully.
    return Response.json({ templates: [] }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}
