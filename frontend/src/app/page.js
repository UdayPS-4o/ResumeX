// This is a React Server Component — NO "use client" directive.
// It runs on the server for every request, so it can:
//   1. Read searchParams to detect ?gallery without client JS
//   2. Fetch templates from the backend with ISR caching (5-min revalidation)
//   3. Pass pre-fetched data to the client boundary (AppShell) as props
//
// The client sees a fully-populated template list on first paint — no useEffect
// loading flash, and no hydration mismatch from the old `mounted` guard pattern.

import AppShell from '@/components/AppShell.jsx';

/**
 * Fetch the template list server-side with a 5-minute ISR cache.
 * Falls back to [] so a backend outage never breaks the page load.
 * The backend URL is resolved through Next.js rewrites in next.config.mjs.
 */
async function fetchTemplates() {
  try {
    const backendPort = process.env.BACKEND_PORT || 8000;
    const res = await fetch(`http://localhost:${backendPort}/api/templates`, {
      cache: 'no-store', // always fetch fresh on page load
    });
    if (!res.ok) throw new Error('Templates fetch failed');
    const data = await res.json();
    return data.templates ?? [];
  } catch (err) {
    console.warn('Failed to load templates server-side:', err.message);
    return [];
  }
}

// Next.js 15: searchParams is an async prop on Server Components
export default async function Home({ searchParams }) {
  const params = await searchParams;

  // Detect ?gallery (or #gallery — hash is client-only, so we only handle query)
  const isGallery = String(params?.gallery ?? '') === '1' || params?.gallery === '';

  // Prefetch templates; skip if in gallery mode (not needed there)
  const initialTemplates = isGallery ? [] : await fetchTemplates();

  return (
    <AppShell
      initialTemplates={initialTemplates}
      isGallery={isGallery}
    />
  );
}
