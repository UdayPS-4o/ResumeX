'use client';

import { lazy, Suspense } from 'react';
import App from '@/components/App.jsx';
import AuthGate from '@/components/AuthGate.jsx';
import 'clipboard-drop';

const Showcase = lazy(() => import('@/showcase/Showcase'));

/**
 * AppShell
 *
 * The parent Server Component (page.js) fetches templates and detects the
 * gallery query-param on the server, then passes the results in as props.
 *
 * The main app is wrapped in <AuthGate>, which resolves the session (with
 * sole-user auto-login) and redirects to /login when a password is required.
 * The public showcase gallery stays outside the gate.
 */
export default function AppShell({ initialTemplates = [], isGallery = false }) {
  if (isGallery) {
    return (
      <Suspense
        fallback={
          <div className="h-screen w-screen flex items-center justify-center bg-slate-50 text-slate-400 text-sm">
            Loading gallery…
          </div>
        }
      >
        <Showcase />
      </Suspense>
    );
  }

  return (
    <AuthGate>
      {(user, onLogout) => (
        <App initialTemplates={initialTemplates} user={user} onLogout={onLogout} />
      )}
    </AuthGate>
  );
}
