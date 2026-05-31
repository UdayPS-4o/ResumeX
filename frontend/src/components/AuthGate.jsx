'use client';

// Client-side auth guard. Wrap any authenticated view with:
//   <AuthGate>{(user, onLogout) => <App user={user} onLogout={onLogout} />}</AuthGate>
//
// On mount it calls api.me() (which also performs sole-user auto-login on the
// server). If that resolves we render children(user, onLogout); if it throws
// (e.g. 401) we redirect to /login. While the check is in flight we show a
// centered, slate-toned loading state.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api.js';

export default function AuthGate({ children }) {
  const router = useRouter();
  const [state, setState] = useState({ status: 'loading', user: null });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { user } = await api.me();
        if (active) setState({ status: 'ready', user });
      } catch {
        if (active) {
          setState({ status: 'redirecting', user: null });
          router.replace('/login');
        }
      }
    })();
    return () => { active = false; };
  }, [router]);

  async function onLogout() {
    try {
      await api.logout();
    } finally {
      router.replace('/login');
    }
  }

  if (state.status !== 'ready') {
    return (
      <div className="min-h-screen bg-slate-50 grid place-items-center">
        <div className="flex flex-col items-center gap-3">
          <span
            className="h-6 w-6 rounded-full border-2 border-slate-300 border-t-brand-600 animate-spin"
            aria-hidden="true"
          />
          <p className="text-sm text-slate-400">Loading…</p>
        </div>
      </div>
    );
  }

  return children(state.user, onLogout);
}
