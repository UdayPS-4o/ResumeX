// Custom 404 — shown whenever Next.js can't match a route.
// Server Component: no JS needed, renders as static HTML.
import Link from 'next/link';

export const metadata = {
  title: 'Page not found — ResumeX',
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Logo */}
        <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white grid place-items-center font-bold text-2xl shadow-lg shadow-blue-600/30 mx-auto mb-6">
          R
        </div>

        {/* Error code */}
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 mb-2">
          404 · Page not found
        </p>

        <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-3">
          This page doesn&apos;t exist
        </h1>

        <p className="text-slate-500 text-sm leading-relaxed mb-8">
          The URL might be wrong, or the page may have moved.
          Your resumes and data are safe.
        </p>

        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition shadow-sm shadow-blue-600/30"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M9.293 2.293a1 1 0 0 1 1.414 0l7 7A1 1 0 0 1 17 11h-1v6a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6H3a1 1 0 0 1-.707-1.707l7-7Z" clipRule="evenodd" />
            </svg>
            Back to dashboard
          </Link>
          <Link
            href="/showcase"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition"
          >
            View showcase
          </Link>
        </div>
      </div>
    </div>
  );
}
