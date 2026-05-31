'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

// Canvas-based PDF viewer with app-styled zoom controls.
// Renders all pages stacked in a scrollable surface. Preserves zoom across
// reloads (when `url` changes after a recompile).
export default function PdfViewer({ url, onDownload }) {
  const containerRef = useRef(null);
  const scrollRef = useRef(null);
  const docRef = useRef(null);

  const [numPages, setNumPages] = useState(0);
  const [docVersion, setDocVersion] = useState(0); // bumps each time a new doc finishes loading
  const [ready, setReady] = useState(false);       // true after the first page render
  const [error, setError] = useState(null);
  const readyRef = useRef(false);

  // scale = null → fit width; otherwise an explicit zoom factor.
  const [fitWidth, setFitWidth] = useState(true);
  const [scale, setScale] = useState(1);          // committed (rasterized) zoom
  const [resizeTick, setResizeTick] = useState(0);
  const [displayPct, setDisplayPct] = useState(100); // toolbar readout (live, doesn't re-raster)

  // liveScaleRef is the single source of truth for what's currently ON SCREEN.
  // It tracks the visual scale continuously during a gesture, while the heavier
  // `scale` state (which drives re-rasterization) only catches up once the
  // gesture settles. commitTimerRef debounces that catch-up.
  const liveScaleRef = useRef(1);
  const commitTimerRef = useRef(null);
  const rafRef = useRef(0);
  const pendingRef = useRef(null); // coalesced {newScale, cX, cY} applied on next frame

  // Instantly resize the on-screen canvases (cheap: a style write + composite,
  // no re-rasterization) and anchor the zoom to the focal point (cX, cY).
  const applyVisualZoom = (newScale, cX, cY) => {
    const el = scrollRef.current;
    if (!el) return;

    const oldScale = liveScaleRef.current;
    if (newScale === oldScale) return;

    const scaleRatio = newScale / oldScale;

    if (cX === undefined || cY === undefined) {
      const rect = el.getBoundingClientRect();
      cX = rect.width / 2;
      cY = rect.height / 2;
    }

    const newSx = (cX + el.scrollLeft) * scaleRatio - cX;
    const newSy = (cY + el.scrollTop) * scaleRatio - cY;

    const container = containerRef.current;
    if (container) {
      for (const canvas of container.children) {
        const baseW = parseFloat(canvas.dataset.baseWidth);
        const baseH = parseFloat(canvas.dataset.baseHeight);
        if (baseW && baseH) {
          canvas.style.width = `${baseW * newScale}px`;
          canvas.style.height = `${baseH * newScale}px`;
        }
      }
    }

    el.scrollLeft = newSx;
    el.scrollTop = newSy;
    liveScaleRef.current = newScale;
  };

  // Coalesce rapid wheel/pinch events into one DOM write per animation frame so
  // we never thrash layout faster than the screen refreshes.
  const scheduleVisualZoom = (newScale, cX, cY) => {
    pendingRef.current = { newScale, cX, cY };
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      const p = pendingRef.current;
      pendingRef.current = null;
      if (p) applyVisualZoom(p.newScale, p.cX, p.cY);
    });
  };

  // Re-rasterize the pages at the final scale once the gesture has settled, so
  // the (possibly upscaled, slightly soft) live canvases snap back to crisp.
  const commitScale = (target, delay = 160) => {
    clearTimeout(commitTimerRef.current);
    commitTimerRef.current = setTimeout(() => {
      setFitWidth(false);
      setScale(target);
    }, delay);
  };

  // Load the document whenever the URL changes. We deliberately DO NOT clear the
  // currently-displayed canvases here — they stay on screen until the new pages
  // are rendered and swapped in atomically (see the render effect). That's what
  // keeps the preview from flickering blank on every customization tweak.
  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(null);

    const task = pdfjsLib.getDocument({ url });
    task.promise.then(
      doc => {
        if (cancelled) { doc.destroy(); return; }
        if (docRef.current) docRef.current.destroy();
        docRef.current = doc;
        setNumPages(doc.numPages);
        setDocVersion(v => v + 1);
      },
      err => {
        if (cancelled) return;
        setError(err?.message || 'Failed to load PDF');
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

  // Render all pages to canvases OFF-SCREEN, then swap them into the visible
  // container in one shot. Because the old canvases remain on screen until the
  // new set is fully drawn, recompiles update in place with no blank flash.
  useLayoutEffect(() => {
    const doc = docRef.current;
    const container = containerRef.current;
    if (!doc || !container || error) return;

    let cancelled = false;
    let currentRenderTask = null;
    (async () => {
      // Determine scale from the first page's intrinsic width.
      const first = await doc.getPage(1);
      const base = first.getViewport({ scale: 1 });
      const eff = computeScale(base.width);
      if (cancelled) return;
      // The freshly rasterized canvases ARE the live canvases now — keep the
      // visual scale and toolbar readout in lock-step with them.
      liveScaleRef.current = eff;
      setDisplayPct(Math.round(eff * 100));

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const fresh = []; // canvases drawn off-screen, swapped in atomically below

      for (let n = 1; n <= doc.numPages; n++) {
        if (cancelled) return;
        const page = await doc.getPage(n);
        const viewport = page.getViewport({ scale: eff });

        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        canvas.dataset.baseWidth = viewport.width / eff;
        canvas.dataset.baseHeight = viewport.height / eff;
        canvas.className = 'block mx-auto mb-4 rounded-lg shadow-md ring-1 ring-slate-200 bg-white';

        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        currentRenderTask = page.render({ canvasContext: ctx, viewport });
        try {
          await currentRenderTask.promise;
        } catch (e) {
          // ignore render cancellation
        }
        currentRenderTask = null;
        if (cancelled) return;
        fresh.push(canvas);
      }
      if (cancelled) return;

      // Atomic swap — preserve the scroll position so the page doesn't jump.
      const sc = scrollRef.current;
      const prevTop = sc ? sc.scrollTop : 0;
      const prevLeft = sc ? sc.scrollLeft : 0;
      container.replaceChildren(...fresh);
      if (sc) {
        sc.scrollTop = prevTop;
        sc.scrollLeft = prevLeft;
      }
      if (!readyRef.current) { readyRef.current = true; setReady(true); }
    })();

    return () => { 
      cancelled = true; 
      if (currentRenderTask) {
        currentRenderTask.cancel();
      }
    };
  }, [docVersion, numPages, error, scale, fitWidth, resizeTick]);

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

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();

        const raw = e.deltaY;
        let delta = raw;
        if (e.deltaMode === 1) delta *= 33;       // line → ~px
        delta = Math.max(-60, Math.min(60, delta)); // clamp flings/heavy pinches

        // A trackpad pinch fires ctrlKey too, so we can't use ctrlKey to tell it
        // apart from a Ctrl+mouse-wheel. Mouse wheels send large / line-mode
        // deltas; trackpad pinches send tiny pixel deltas. Give the pad a much
        // higher gain so it isn't sluggish, and keep the wheel gentle.
        const isMouseWheel = e.deltaMode !== 0 || Math.abs(raw) >= 50;
        const sensitivity = isMouseWheel ? 0.0045 : 0.014;
        const zoomFactor = Math.exp(-delta * sensitivity);

        const oldScale = liveScaleRef.current;
        let newScale = Math.max(0.3, Math.min(3, oldScale * zoomFactor));
        newScale = Math.round(newScale * 1000) / 1000;
        if (newScale === oldScale) return;

        const rect = el.getBoundingClientRect();
        const cX = e.clientX - rect.left;
        const cY = e.clientY - rect.top;

        scheduleVisualZoom(newScale, cX, cY);
        setDisplayPct(Math.round(newScale * 100));
        commitScale(newScale);
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
      clearTimeout(commitTimerRef.current);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function zoomBy(delta) {
    const newScale = Math.max(0.3, Math.min(3, +(liveScaleRef.current + delta).toFixed(2)));
    applyVisualZoom(newScale);
    setDisplayPct(Math.round(newScale * 100));
    commitScale(newScale, 90); // discrete clicks settle quickly
  }
  function setFit() {
    clearTimeout(commitTimerRef.current);
    setFitWidth(true);
  }
  function setHundred() {
    applyVisualZoom(1);
    setDisplayPct(100);
    commitScale(1, 0);
  }

  const pct = displayPct;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 h-12 bg-white border-b border-slate-200 shrink-0">
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
        {!ready && !error && (
          <div className="h-full grid place-items-center text-sm text-slate-400">Loading preview…</div>
        )}
        {error && !ready && (
          <div className="h-full grid place-items-center text-sm text-rose-500">{error}</div>
        )}
        {/* Canvases live here; they persist across recompiles until the next set
            is drawn off-screen and swapped in, so the preview never blanks. */}
        <div ref={containerRef} className={!ready ? 'hidden' : ''} />
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
