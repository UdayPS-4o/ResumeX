import { useEffect, useRef, useState } from 'react';
import ResumePreview, { SAMPLE_RESUME } from './ResumePreview.jsx';
import { hasContent } from '../lib/resume.js';

// ─────────────────────────────────────────────────────────────────────────────
// TemplateGallery — the "Templates" tab. A grid of compact, razor-sharp renders
// of the user's *actual* resume in every template (sample content until they've
// added their own), so they compare layouts on real data.
//
// Resting on a card (a short hover-intent delay) warms that template's PDF in
// the background; by the time the user clicks, the main preview swaps in
// instantly. The footer shows a "Pre-rendering… / Ready" hint so the warm-up is
// visible rather than silent.
// ─────────────────────────────────────────────────────────────────────────────
export default function TemplateGallery({ templates, value, resume, onChange, onPrewarm }) {
  const live = hasContent(resume);
  const previewResume = live ? resume : SAMPLE_RESUME;

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="px-4 pt-4 pb-2 sticky top-0 bg-slate-50/95 backdrop-blur-sm z-10">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Choose template
        </div>
        <p className="text-xs text-slate-500 mt-0.5 leading-snug">
          {live
            ? 'Live preview of your resume — hover to pre-render, click to apply.'
            : 'Sample shown until you add details — your content reflows into any layout.'}
        </p>
      </div>

      <div
        className="grid gap-2.5 px-4 pb-4 pt-1"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}
      >
        {templates.map((t) => (
          <TemplateChoice
            key={t.id}
            t={t}
            active={t.id === value}
            previewResume={previewResume}
            canPrewarm={live}
            onSelect={() => onChange(t.id)}
            onPrewarm={onPrewarm}
          />
        ))}
      </div>
    </div>
  );
}

function TemplateChoice({ t, active, previewResume, canPrewarm, onSelect, onPrewarm }) {
  const [warm, setWarm] = useState('cold'); // 'cold' | 'warming' | 'ready'
  const hoverTimer = useRef(null);

  // Reset readiness whenever the underlying content changes (cache key moved).
  useEffect(() => { setWarm('cold'); }, [previewResume]);
  useEffect(() => () => clearTimeout(hoverTimer.current), []);

  function warmUp() {
    if (!canPrewarm || warm === 'ready') return;
    const p = onPrewarm?.(t.id);
    if (!p) return;
    setWarm('warming');
    p.then(() => setWarm('ready')).catch(() => setWarm('cold'));
  }

  // Hover-intent: only warm a card the pointer actually rests on, so sweeping
  // across the grid doesn't kick off a compile for every card it passes over.
  function onEnter() {
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(warmUp, 140);
  }
  function onLeave() { clearTimeout(hoverTimer.current); }

  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={warmUp}
      className={`group relative text-left rounded-lg border bg-white overflow-hidden transition ${
        active
          ? 'border-brand-500 ring-2 ring-brand-200'
          : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
      }`}
    >
      <div className="relative bg-white border-b border-slate-100" style={{ aspectRatio: '816 / 1056' }}>
        <ResumePreview resume={previewResume} template={t.id} className="w-full h-full" />

        {/* Hover affordance + Current badge */}
        {active ? (
          <span className="absolute top-1.5 right-1.5 text-[9px] font-semibold text-white bg-brand-600 rounded-full px-1.5 py-0.5 shadow-sm">
            Current
          </span>
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-slate-900/0 group-hover:bg-slate-900/10 opacity-0 group-hover:opacity-100 transition">
            <span className="px-2.5 py-1 rounded-md bg-brand-600 text-white text-[11px] font-semibold shadow-lg">
              Use
            </span>
          </div>
        )}
      </div>

      <div className="px-2 py-1.5">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: t.accent }} />
          <span className="text-[11px] font-semibold text-slate-900 truncate">{t.name}</span>
          {!active && warm === 'warming' && <Spinner />}
          {!active && warm === 'ready' && <ReadyTick />}
        </div>
        <p className="text-[10px] text-slate-500 mt-0.5 leading-snug line-clamp-2">{t.description}</p>
      </div>
    </button>
  );
}

function Spinner() {
  return (
    <span
      className="ml-auto w-3 h-3 shrink-0 rounded-full border-[1.5px] border-slate-300 border-t-brand-500 animate-spin"
      title="Pre-rendering…"
    />
  );
}

function ReadyTick() {
  return (
    <span className="ml-auto flex items-center gap-0.5 shrink-0 text-emerald-600" title="Pre-rendered — switches instantly">
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
      </svg>
      <span className="text-[9px] font-semibold">Ready</span>
    </span>
  );
}
