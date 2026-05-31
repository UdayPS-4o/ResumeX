'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api.js';

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (pending) return;
    setError('');
    setPending(true);
    try {
      await api.signup({ username: username.trim(), email: email.trim(), password });
      router.replace('/');
    } catch (err) {
      setError(err?.message || 'Could not create your account. Please try again.');
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 grid place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2.5 mb-6">
          <div className="w-9 h-9 rounded-lg bg-brand-600 text-white grid place-items-center font-bold text-base shadow-sm shadow-brand-600/30">
            R
          </div>
          <span className="font-bold text-xl text-slate-900 tracking-tight">ResumeX</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 px-7 py-8">
          <h1 className="text-lg font-semibold text-slate-900">Create your account</h1>
          <p className="text-sm text-slate-500 mt-1">Set up your ResumeX workspace.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="rx-eyebrow block mb-2" htmlFor="username">Username</label>
              <input
                id="username"
                name="username"
                className="field"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
                required
              />
            </div>

            <div>
              <label className="rx-eyebrow block mb-2" htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                className="field"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label className="rx-eyebrow block mb-2" htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                className="field"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700"
              >
                {error}
              </div>
            )}

            <button type="submit" className="rx-btn rx-btn-primary w-full" disabled={pending}>
              {pending ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
