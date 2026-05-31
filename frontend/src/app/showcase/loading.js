// Showcase loading skeleton — shown by Next.js while the page Server Component
// resolves (and also during the lazy Showcase load via Suspense).
export default function ShowcaseLoading() {
  return (
    <div className="h-screen w-screen bg-slate-200/60 flex flex-col items-center justify-center gap-4">
      {/* Brand pill */}
      <div className="flex items-center gap-2 rounded-full bg-slate-900/85 px-4 py-2">
        <span className="w-5 h-5 rounded-md bg-blue-500 animate-pulse" />
        <span className="text-xs font-semibold tracking-tight text-white/60 w-40 h-3 bg-white/20 rounded animate-pulse" />
      </div>

      {/* Content card placeholder */}
      <div className="w-full max-w-4xl mx-auto px-6">
        <div className="bg-white rounded-2xl shadow-md ring-1 ring-slate-200 p-8 space-y-4 animate-pulse">
          <div className="flex gap-6 items-start">
            <div className="shrink-0 w-36 rounded-xl bg-slate-200" style={{ aspectRatio: '210 / 297' }} />
            <div className="flex-1 space-y-3 pt-2">
              <div className="h-3 w-16 rounded-full bg-slate-200" />
              <div className="h-7 w-64 rounded-lg bg-slate-200" />
              <div className="h-4 w-48 rounded bg-slate-200" />
              <div className="h-3 w-72 rounded bg-slate-200" />
              <div className="flex gap-2 mt-4">
                <div className="h-8 w-20 rounded-lg bg-blue-100" />
                <div className="h-8 w-28 rounded-lg bg-slate-100" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom dock skeleton */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2">
        <div className="flex items-center gap-3 rounded-2xl bg-slate-900/80 px-4 py-2.5 animate-pulse">
          <div className="h-8 w-32 bg-white/10 rounded-lg" />
          <div className="w-px h-7 bg-white/15" />
          <div className="flex gap-1.5">
            {[0,1,2,3,4,5,6,7].map(i => (
              <div key={i} className="h-2.5 w-2.5 rounded-full bg-white/20" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
