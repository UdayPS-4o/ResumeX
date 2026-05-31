// This file is automatically picked up by Next.js App Router.
// It displays while the Server Component (page.js) is resolving
// the templates fetch, replacing the old client-side "mounted" guard.

export default function Loading() {
  return (
    <div className="min-h-full" style={{ background: '#f7f8fc' }}>
      {/* Top bar skeleton */}
      <header className="sticky top-0 z-20 bg-white/85 backdrop-blur border-b border-slate-200/70">
        <div className="mx-auto w-full max-w-[1200px] px-6 lg:px-10 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white grid place-items-center font-bold text-sm shadow-sm">
              R
            </div>
            <span className="font-bold text-slate-900 tracking-tight">ResumeX</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-7 w-36 rounded-md bg-slate-100 animate-pulse" />
            <div className="h-7 w-20 rounded-md bg-slate-100 animate-pulse" />
            <div className="w-px h-6 bg-slate-200 mx-1" />
            <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse" />
          </div>
        </div>
      </header>

      {/* Body skeleton */}
      <div className="mx-auto w-full max-w-[1200px] px-6 lg:px-10 py-9">
        {/* Hero */}
        <div className="flex items-end justify-between gap-4 mb-9">
          <div className="space-y-2">
            <div className="h-3 w-24 rounded bg-slate-200 animate-pulse" />
            <div className="h-8 w-72 rounded-lg bg-slate-200 animate-pulse" />
            <div className="h-4 w-96 rounded bg-slate-200 animate-pulse" />
          </div>
          <div className="h-9 w-32 rounded-lg bg-blue-100 animate-pulse shrink-0" />
        </div>

        {/* Resume card skeletons */}
        {[0, 1].map((i) => (
          <section key={i} className={i ? 'border-t border-slate-200/70 pt-9 mt-9' : ''}>
            <div className="flex flex-col lg:flex-row gap-8 items-center">
              {/* Thumbnail skeleton */}
              <div className="lg:flex-1 lg:max-w-[58%] flex gap-6 items-center">
                <div
                  className="shrink-0 rounded-xl rounded-l-2xl bg-slate-200 animate-pulse border-l-[6px] border-blue-300"
                  style={{ width: 180, aspectRatio: '210 / 297' }}
                />
                <div className="flex-1 space-y-3">
                  <div className="h-4 w-16 rounded-full bg-slate-200 animate-pulse" />
                  <div className="h-8 w-48 rounded-lg bg-slate-200 animate-pulse" />
                  <div className="h-4 w-32 rounded bg-slate-200 animate-pulse" />
                  <div className="h-3 w-56 rounded bg-slate-200 animate-pulse" />
                  <div className="flex gap-2 mt-2">
                    <div className="h-8 w-20 rounded-lg bg-blue-100 animate-pulse" />
                    <div className="h-8 w-28 rounded-lg bg-slate-100 animate-pulse" />
                    <div className="h-8 w-24 rounded-lg bg-slate-100 animate-pulse" />
                  </div>
                </div>
              </div>
              {/* Rail skeleton */}
              <div className="lg:w-[40%] lg:border-l lg:border-slate-200/70 lg:pl-8 space-y-2 w-full">
                <div className="h-3 w-24 rounded bg-slate-200 animate-pulse mb-3" />
                {[0, 1, 2].map((j) => (
                  <div key={j} className="flex items-center gap-3 rounded-xl px-3 py-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-32 rounded bg-slate-200 animate-pulse" />
                      <div className="h-2.5 w-20 rounded bg-slate-200 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
