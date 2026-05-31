import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

// Canvas-based PDF viewer with app-styled zoom controls.
// Renders all pages stacked in a scrollable surface. Preserves zoom across
// reloads (when `url` changes after a recompile).
export default function PdfViewer({ url, onDownload }) {
  const containerRef = useRef(null);
  const scrollRef = useRef(null);
  const docRef = useRef(null);

  const [numPages, setNumPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // scale = null → fit width; otherwise an explicit zoom factor.
  const [fitWidth, setFitWidth] = useState(true);
  const [scale, setScale] = useState(1);
  const [renderedScale, setRenderedScale] = useState(1);
  const [resizeTick, setResizeTick] = useState(0);

  // Load the document whenever the URL changes.
  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    const task = pdfjsLib.getDocument({ url });
    task.promise.then(
      doc => {
        if (cancelled) { doc.destroy(); return; }
        if (docRef.current) docRef.current.destroy();
        docRef.current = doc;
        setNumPages(doc.numPages);
        setLoading(false);
      },
      err => {
        if (cancelled) return;
        setError(err?.message || 'Failed to load PDF');
        setLoading(false);
      },
    );

    return () => {
      cancelled = true;
      task.destroy?.();
    };
  }, [url]);

  // Compute the effective scale (fit-width resolves against container size).
  function computeScale(viewportWidth1x) {
    if (!fitWidth) return scale;
    const el = scrollRef.current;
    if (!el) return 1;
    const avail = el.clientWidth - 24; // padding allowance
    return Math.max(0.3, Math.min(3, avail / viewportWidth1x));
  }

  // Render all pages to canvases.
  useLayoutEffect(() => {
    const doc = docRef.current;
    const container = containerRef.current;
    if (!doc || !container || loading || error) return;

    let cancelled = false;
    (async () => {
      // Determine scale from the first page's intrinsic width.
      const first = await doc.getPage(1);
      const base = first.getViewport({ scale: 1 });
      const eff = computeScale(base.width);
      if (cancelled) return;
      setRenderedScale(eff);

      container.innerHTML = '';
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      for (let n = 1; n <= doc.numPages; n++) {
        if (cancelled) return;
        const page = await doc.getPage(n);
        const viewport = page.getViewport({ scale: eff });

        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        canvas.className = 'block mx-auto mb-4 rounded-lg shadow-md ring-1 ring-slate-200 bg-white';

        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        container.appendChild(canvas);

        await page.render({ canvasContext: ctx, viewport }).promise;
      }
    })();

    return () => { cancelled = true; };
  }, [numPages, loading, error, scale, fitWidth, url, resizeTick]);

  // Recompute fit-width on container resize.
  useEffect(() => {
    if (!fitWidth) return;
    const el = scrollRef.current;
    if (!el) return;
    let raf;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setResizeTick(t => t + 1));
    });
    ro.observe(el);
    return () => { ro.disconnect(); cancelAnimationFrame(raf); };
  }, [fitWidth]);

  function zoomBy(delta) {
    setFitWidth(false);
    setScale(s => Math.max(0.3, Math.min(3, +(s + delta).toFixed(2))));
  }
  function setFit() { setFitWidth(true); }
  function setHundred() { setFitWidth(false); setScale(1); }

  const pct = Math.round((fitWidth ? renderedScale : scale) * 100);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b border-slate-200">
        <div className="text-[11px] text-slate-500">
          {numPages > 0 ? `${numPages} page${numPages > 1 ? 's' : ''}` : ' '}
        </div>
        <div className="flex items-center gap-1">
          <ZoomBtn onClick={() => zoomBy(-0.1)} title="Zoom out">
            <MinusIcon />
          </ZoomBtn>
          <button
            onClick={setHundred}
            className="text-xs tabular-nums text-slate-600 w-12 text-center hover:text-slate-900 transition"
            title="Reset to 100%"
          >
            {pct}%
          </button>
          <ZoomBtn onClick={() => zoomBy(0.1)} title="Zoom in">
            <PlusIcon />
          </ZoomBtn>
          <div className="w-px h-4 bg-slate-200 mx-1" />
          <button
            onClick={setFit}
            className={`text-[11px] px-2 py-1 rounded-md transition ${
              fitWidth ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:bg-slate-100'
            }`}
            title="Fit to width"
          >
            Fit
          </button>
          {onDownload && (
            <>
              <div className="w-px h-4 bg-slate-200 mx-1" />
              <ZoomBtn onClick={onDownload} title="Download PDF">
                <DownloadIcon />
              </ZoomBtn>
            </>
          )}
        </div>
      </div>

      {/* Scroll surface */}
      <div ref={scrollRef} className="flex-1 overflow-auto bg-slate-200/60 px-3 py-3">
        {loading && (
          <div className="h-full grid place-items-center text-sm text-slate-400">Loading preview…</div>
        )}
        {error && (
          <div className="h-full grid place-items-center text-sm text-rose-500">{error}</div>
        )}
        <div ref={containerRef} className={loading || error ? 'hidden' : ''} />
      </div>
    </div>
  );
}

function ZoomBtn({ children, onClick, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-7 h-7 grid place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition"
    >
      {children}
    </button>
  );
}

function MinusIcon() {
  return <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M4 10a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H4.75A.75.75 0 0 1 4 10Z" /></svg>;
}
function PlusIcon() {
  return <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" /></svg>;
}
function DownloadIcon() {
  return <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M12 2.25a.75.75 0 0 1 .75.75v11.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 1 1 1.06-1.06l3.22 3.22V3a.75.75 0 0 1 .75-.75Zm-9 13.5a.75.75 0 0 1 .75.75v2.25a1.5 1.5 0 0 0 1.5 1.5h13.5a1.5 1.5 0 0 0 1.5-1.5V16.5a.75.75 0 0 1 1.5 0v2.25a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V16.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" /></svg>;
}
