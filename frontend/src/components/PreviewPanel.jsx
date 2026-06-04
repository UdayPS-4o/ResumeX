import PdfViewer from './PdfViewer.jsx';

export default function PreviewPanel({ pdfUrl, compiling, error, empty, onRetry, onDownload }) {
  return (
    <div className="flex flex-col h-full bg-slate-100 relative">

      <div className="flex-1 min-h-0">
        {empty && !error && <div className="p-4 h-full"><EmptyState /></div>}
        {error && <div className="p-4 h-full"><ErrorBox message={error} onRetry={onRetry} /></div>}
        {!empty && !error && pdfUrl && (
          <PdfViewer url={pdfUrl} onDownload={onDownload} />
        )}
        {!empty && !error && !pdfUrl && compiling && <ResumeSkeleton />}
        {!empty && !error && !pdfUrl && !compiling && (
          <div className="w-full h-full grid place-items-center text-sm text-slate-400">
            Preparing first render…
          </div>
        )}
      </div>
    </div>
  );
}

// A shimmering resume-shaped placeholder shown while the first PDF compiles.
// Mirrors the real PdfViewer geometry — a full-width, top-aligned A4 page
// on the same surface — so the layout doesn't jump when the PDF swaps in.
function ResumeSkeleton() {
  const Bar = ({ w, h = 'h-2', tone = 'bg-slate-200' }) => (
    <div className={`${h} ${tone} rounded`} style={{ width: w }} />
  );
  const Para = ({ lines }) => (
    <div className="space-y-1.5">{lines.map((w, i) => <Bar key={i} w={w} />)}</div>
  );
  const Heading = ({ w }) => (
    <div className="space-y-1.5">
      <Bar w={w} h="h-3" tone="bg-brand-200" />
      <div className="h-px bg-slate-200" />
    </div>
  );
  return (
    // Same scroll surface (bg + padding) as PdfViewer, so nothing shifts on swap.
    <div className="h-full overflow-auto bg-slate-200/60 px-3 py-3">
      <div
        className="mx-auto w-full max-w-[794px] bg-white rounded-lg shadow-md ring-1 ring-slate-200 overflow-hidden"
        style={{ aspectRatio: '794 / 1123' }}
      >
        <div className="animate-pulse px-9 py-8 space-y-5 h-full">
          {/* header: name / headline / contact */}
          <div className="space-y-2.5">
            <Bar w="42%" h="h-6" tone="bg-brand-300" />
            <Bar w="74%" h="h-3.5" tone="bg-slate-300" />
            <Bar w="48%" h="h-2.5" />
          </div>
          {/* profile */}
          <div className="space-y-2.5">
            <Heading w="18%" />
            <Para lines={['100%', '98%', '100%', '58%']} />
          </div>
          {/* work experience */}
          <div className="space-y-2.5">
            <Heading w="32%" />
            <div className="flex items-center justify-between gap-4">
              <Bar w="46%" h="h-2.5" tone="bg-slate-300" />
              <Bar w="16%" h="h-2.5" />
            </div>
            <Para lines={['92%', '86%', '90%', '78%']} />
          </div>
          {/* projects */}
          <div className="space-y-2.5">
            <Heading w="22%" />
            <Bar w="42%" h="h-2.5" tone="bg-slate-300" />
            <Para lines={['100%', '97%', '93%']} />
            <Bar w="36%" h="h-2.5" tone="bg-slate-300" />
            <Para lines={['100%', '95%', '88%']} />
          </div>
          {/* skills */}
          <div className="space-y-2.5">
            <Heading w="15%" />
            <Para lines={['100%', '68%']} />
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="h-full grid place-items-center">
      <div className="max-w-sm text-center px-8 py-10 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 grid place-items-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
        </div>
        <h2 className="text-base font-semibold text-slate-900">Preview appears here</h2>
        <p className="text-sm text-slate-500 mt-2 leading-relaxed">
          Start chatting — as you share your details, the resume builds itself.
        </p>
      </div>
    </div>
  );
}

function ErrorBox({ message, onRetry }) {
  return (
    <div className="h-full grid place-items-center p-8">
      <div className="max-w-lg bg-rose-50 border border-rose-200 rounded-xl p-5 text-sm">
        <div className="font-semibold text-rose-800 mb-1">Couldn't compile the preview</div>
        <pre className="whitespace-pre-wrap text-rose-700 text-xs leading-relaxed max-h-40 overflow-auto">{message}</pre>
        <p className="text-rose-600 text-xs mt-3">
          The free online LaTeX compiler can be slow or briefly unavailable. Your data is safe — try again.
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-medium hover:bg-rose-700 transition"
          >
            <RefreshIcon /> Retry
          </button>
        )}
      </div>
    </div>
  );
}

function RefreshIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
      <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.311h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219Z" clipRule="evenodd" />
    </svg>
  );
}
