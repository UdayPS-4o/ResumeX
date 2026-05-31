'use client';

// Thin "use client" boundary that lazy-loads the heavy Showcase component.
// Kept separate so the parent page.js can remain a pure Server Component
// (and thus own metadata exports).
import { lazy, Suspense } from 'react';

const Showcase = lazy(() => import('@/showcase/Showcase'));

export default function ShowcaseClient() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen flex items-center justify-center bg-slate-100">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white grid place-items-center font-bold text-lg shadow animate-pulse">
              R
            </div>
            <p className="text-sm text-slate-400">Loading showcase…</p>
          </div>
        </div>
      }
    >
      <Showcase />
    </Suspense>
  );
}
