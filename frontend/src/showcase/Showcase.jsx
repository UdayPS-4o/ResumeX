import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Variant1 from './variants/Variant1List.jsx';
import Variant2 from './variants/Variant2Rail.jsx';
import Variant3 from './variants/Variant3Filmstrip.jsx';
import Variant4 from './variants/Variant4Grid.jsx';
import Variant5 from './variants/Variant5Collapse.jsx';
import Variant6 from './variants/Variant6Tree.jsx';
import Variant7 from './variants/Variant7Pills.jsx';
import Variant8 from './variants/Variant8Tabs.jsx';

// ─────────────────────────────────────────────────────────────────────────────
// Showcase — one link, eight ways to present a master and its tailored copies.
//
// Reachable at  /?gallery  (see main.jsx). All eight share the SAME approved
// "editorial" master block; they differ only in how the tailored variants are
// arranged. Flip with the floating ← / → buttons, arrow keys, or number keys.
// ─────────────────────────────────────────────────────────────────────────────

const DESIGNS = [
  { name: 'Stacked list', tag: 'Tailored as rows beneath the master', Component: Variant1 },
  { name: 'Side rail', tag: 'Master left · scrollable tailored rail right', Component: Variant2 },
  { name: 'Filmstrip', tag: 'Tailored as a horizontal scroll of cards', Component: Variant3 },
  { name: 'Card grid', tag: 'Tailored as a compact card grid', Component: Variant4 },
  { name: 'Collapsible', tag: 'Tailored tucked behind a clean toggle', Component: Variant5 },
  { name: 'Lineage', tag: 'Tailored branch off the master with connectors', Component: Variant6 },
  { name: 'Inline pills', tag: 'Tailored as compact match pills', Component: Variant7 },
  { name: 'Tabbed', tag: 'Switch jobs with tabs — one preview at a time', Component: Variant8 },
];

function readInitial() {
  if (typeof window === 'undefined') return 0;
  const m = /[#&?]d(\d+)/.exec(window.location.hash + window.location.search);
  const n = m ? parseInt(m[1], 10) - 1 : 0;
  return Number.isInteger(n) && n >= 0 && n < DESIGNS.length ? n : 0;
}

export default function Showcase() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const initVal = readInitial();
    if (initVal !== 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setI(initVal);
    }
  }, []);

  const go = useCallback((next) => {
    setI((cur) => {
      const v = (next + DESIGNS.length) % DESIGNS.length;
      try { window.history.replaceState(null, '', `?gallery#d${v + 1}`); } catch { /* noop */ }
      return v;
    });
  }, []);

  useEffect(() => {
    function onKey(e) {
      if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); go(i + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(i - 1); }
      else if (/^[1-9]$/.test(e.key) && parseInt(e.key, 10) <= DESIGNS.length) { e.preventDefault(); go(parseInt(e.key, 10) - 1); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [i, go]);

  const { name, tag, Component } = DESIGNS[i];

  return (
    <div className="fixed inset-0 bg-slate-200/60 overflow-hidden" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* The active variant — remounted on change so scroll resets cleanly. */}
      <div key={i} className="absolute inset-0 overflow-y-auto rx-fadein">
        <Component />
      </div>

      {/* Top-left concept label */}
      <div className="fixed top-4 left-4 z-[60] pointer-events-none">
        <div className="flex items-center gap-2 rounded-full bg-slate-900/85 backdrop-blur px-3.5 py-1.5 text-white shadow-lg">
          <span className="w-5 h-5 rounded-md bg-brand-500 grid place-items-center text-[11px] font-bold">R</span>
          <span className="text-xs font-semibold tracking-tight">ResumeX · master + tailored concepts</span>
        </div>
      </div>

      {/* Top-right: jump to the real app */}
      <Link
        href="/"
        className="fixed top-4 right-4 z-[60] rounded-full bg-white/90 backdrop-blur px-3.5 py-1.5 text-xs font-semibold text-slate-600 shadow-lg ring-1 ring-slate-900/5 hover:text-slate-900 transition"
      >
        Open the real app →
      </Link>

      {/* Floating prev / next */}
      <button onClick={() => go(i - 1)} aria-label="Previous variant" className="nav-fab left-3 sm:left-5">
        <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
      </button>
      <button onClick={() => go(i + 1)} aria-label="Next variant" className="nav-fab right-3 sm:right-5">
        <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
      </button>

      {/* Bottom dock — index, name, dots */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[60] max-w-[calc(100vw-2rem)]">
        <div className="flex items-center gap-3 rounded-2xl bg-slate-900/90 backdrop-blur px-4 py-2.5 text-white shadow-2xl ring-1 ring-white/10">
          <div className="flex flex-col items-start leading-tight pr-1 min-w-0">
            <div className="flex items-baseline gap-2 min-w-0">
              <span className="text-[11px] font-mono text-slate-400 shrink-0">{String(i + 1).padStart(2, '0')}/{String(DESIGNS.length).padStart(2, '0')}</span>
              <span className="text-sm font-semibold tracking-tight truncate">{name}</span>
            </div>
            <span className="text-[11px] text-slate-400 truncate">{tag}</span>
          </div>
          <div className="w-px h-7 bg-white/15 shrink-0" />
          <div className="flex items-center gap-1.5 shrink-0">
            {DESIGNS.map((d, idx) => (
              <button
                key={d.name}
                onClick={() => go(idx)}
                aria-label={d.name}
                title={d.name}
                className={`h-2.5 rounded-full transition-all ${idx === i ? 'w-6 bg-brand-400' : 'w-2.5 bg-white/25 hover:bg-white/45'}`}
              />
            ))}
          </div>
          <div className="w-px h-7 bg-white/15 shrink-0 hidden sm:block" />
          <span className="hidden sm:inline text-[11px] text-slate-400 pr-0.5 shrink-0">← → or 1–{DESIGNS.length}</span>
        </div>
      </div>

      <style>{`
        .nav-fab {
          position: fixed; top: 50%; transform: translateY(-50%);
          z-index: 60; width: 3rem; height: 3rem; border-radius: 9999px;
          display: grid; place-items: center; color: #0f172a;
          background: rgba(255,255,255,0.9); backdrop-filter: blur(8px);
          box-shadow: 0 8px 24px rgba(15,23,42,0.18), 0 0 0 1px rgba(15,23,42,0.05);
          transition: transform 0.15s ease, background 0.15s ease;
        }
        .nav-fab:hover { background: #fff; transform: translateY(-50%) scale(1.08); }
        .nav-fab:active { transform: translateY(-50%) scale(0.96); }
        @keyframes rx-fadein { from { opacity: 0; transform: scale(0.995); } to { opacity: 1; transform: none; } }
        .rx-fadein { animation: rx-fadein 0.28s ease-out both; }
      `}</style>
    </div>
  );
}
