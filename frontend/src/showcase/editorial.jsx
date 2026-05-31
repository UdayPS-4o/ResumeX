import ResumePreview from '../components/ResumePreview.jsx';
import { fmtDate, monogram, monoColor, accentFor, countSections, variantLabel } from './data.js';
import * as Icon from './icons.jsx';

// ─────────────────────────────────────────────────────────────────────────────
// Editorial atoms — the look the user approved (old Design 1): type-forward,
// hairline dividers, brand-blue used sparingly, a LANDSCAPE master block
// (thumbnail left · identity + actions right). Widened from the original so the
// page uses more horizontal space (less dead left padding).
//
// Every master/tailored layout variant under showcase/variants/ composes THESE,
// so the master block stays pixel-identical across variants and only the
// treatment of the tailored copies changes.
// ─────────────────────────────────────────────────────────────────────────────

export function Container({ children, className = '' }) {
  // Wider than the first pass to "take more page" — slim side margins on a
  // ~1200px window, content ~1140px.
  return <div className={`mx-auto w-full max-w-[1200px] px-6 lg:px-10 ${className}`}>{children}</div>;
}

export function TopBar() {
  return (
    <header className="sticky top-0 z-20 bg-white/85 backdrop-blur border-b border-slate-200/70">
      <Container className="h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-600 text-white grid place-items-center font-bold text-sm shadow-sm shadow-brand-600/30">R</div>
          <span className="font-bold text-slate-900 tracking-tight">ResumeX</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button className="rx-btn rx-btn-ghost rx-btn-sm"><Icon.Tracker /><span className="hidden sm:inline">Application Tracker</span></button>
          <button className="rx-btn rx-btn-ghost rx-btn-sm"><Icon.Settings /><span className="hidden sm:inline">Settings</span></button>
          <div className="w-px h-6 bg-slate-200 mx-1" />
          <div className="w-8 h-8 rounded-full grid place-items-center text-white text-[11px] font-bold" style={{ background: 'linear-gradient(135deg,#3b6df6,#7c3aed)' }}>UP</div>
        </div>
      </Container>
    </header>
  );
}

// Full-page wrapper: shared top bar + a wide centered container. Variants render
// <Hero /> + their master list as children.
export function PageShell({ children }) {
  return (
    <div className="min-h-screen w-full" style={{ background: '#f7f8fc' }}>
      <TopBar />
      <Container className="py-9">{children}</Container>
    </div>
  );
}

export function Hero({
  title = 'Masters & tailored variants',
  subtitle = 'Keep a master per career story, then spin off a tailored copy for every job you chase.',
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-9">
      <div>
        <Eyebrow>Your resumes</Eyebrow>
        <h1 className="text-[28px] leading-tight font-bold text-slate-900 tracking-tight mt-1">{title}</h1>
        <p className="text-sm text-slate-500 mt-1.5 max-w-2xl">{subtitle}</p>
      </div>
      <button className="rx-btn rx-btn-primary shrink-0"><Icon.Plus /> New resume</button>
    </div>
  );
}

export function Eyebrow({ children, tone = 'muted', className = '' }) {
  const color = tone === 'brand' ? 'text-brand-600' : 'text-slate-400';
  return <div className={`text-[11px] font-bold uppercase tracking-[0.09em] ${color} ${className}`}>{children}</div>;
}

export function Dot() {
  return <span className="w-1 h-1 rounded-full bg-slate-300 inline-block shrink-0" />;
}

// Live resume thumbnail in the approved bordered-card frame. Caller sets width.
export function Thumb({ resume, template, name, w = 150, className = '' }) {
  return (
    <div
      className={`shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-slate-200/80 shadow-sm ${className}`}
      style={{ width: w, aspectRatio: '210 / 297' }}
    >
      <ResumePreview resume={resume} template={template} fallbackName={name} className="w-full h-full" />
    </div>
  );
}

// Master badge + tone + big title + brand headline + meta line. No thumb/actions
// (caller places those) so it works in both landscape and column arrangements.
export function MasterIdentity({ master, size = 'lg' }) {
  const titleCls = size === 'lg' ? 'text-[30px] leading-[1.05]' : 'text-[22px] leading-tight';
  const items = countSections(master.resume);
  const n = master.variants.length;
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2.5 flex-wrap">
        <span className="badge badge-master">Master</span>
        <span className="text-xs font-semibold text-slate-400">{master.tone}</span>
      </div>
      <h2 className={`${titleCls} font-bold text-slate-900 tracking-tight mt-2`}>{master.title}</h2>
      <div className="text-brand-600 font-bold tracking-wide text-[14px] mt-2">{master.headline}</div>
      <div className="text-[13px] text-slate-500 mt-2 flex items-center gap-1.5 flex-wrap">
        <span>{master.tone}</span><Dot /><span>Updated {fmtDate(master.updatedAt)}</span>
        <Dot /><span>{items} items</span><Dot /><span>{n} tailored</span>
      </div>
    </div>
  );
}

export function MasterActions({ className = '' }) {
  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      <button className="rx-btn rx-btn-primary rx-btn-sm"><Icon.Edit /> Open</button>
      <button className="rx-btn rx-btn-soft rx-btn-sm"><Icon.Target /> Tailor to a job</button>
      <button className="rx-btn rx-btn-ghost rx-btn-sm"><Icon.Sparkle /> Strengthen</button>
    </div>
  );
}

// The standard LANDSCAPE master block: thumb left, identity + actions right.
// Variants that place tailored copies BELOW the master reuse this verbatim.
export function MasterHeader({ master, thumbW = 150, featured = false, actions = true }) {
  return (
    <div className="flex flex-col sm:flex-row gap-6 lg:gap-8">
      <Thumb resume={master.resume} template={master.templateId} name={master.name} w={thumbW} />
      <div className="flex-1 min-w-0">
        <MasterIdentity master={master} size={featured ? 'lg' : 'lg'} />
        {actions && <MasterActions className="mt-4" />}
      </div>
    </div>
  );
}

export function MatchChip({ score }) {
  if (score == null) return null;
  return <span className={`chip ${score >= 70 ? 'chip-match' : 'chip-neutral'}`}>{score}% match</span>;
}

// Small monogram tile (square by default, round optional) coloured from a seed.
export function Monogram({ seed, label, size = 30, round = false, accent }) {
  const bg = accent || monoColor(seed || label || '');
  return (
    <span
      className={`grid place-items-center text-white font-bold shrink-0 ${round ? 'rounded-full' : 'rounded-lg'}`}
      style={{ width: size, height: size, background: bg, fontSize: Math.round(size * 0.36) }}
    >
      {monogram(label || seed || '·')}
    </span>
  );
}

// Affordance shown for a master that has no tailored copies yet.
export function EmptyTailored({ className = '' }) {
  return (
    <button className={`group inline-flex items-center gap-2 text-[13px] text-slate-400 hover:text-brand-600 transition ${className}`}>
      <Icon.Target className="w-4 h-4" />
      <span>No tailored copies yet — <span className="font-semibold text-slate-500 group-hover:text-brand-600">Tailor to a job →</span></span>
    </button>
  );
}

// Re-export the data helpers so a variant can pull everything from one module.
export { fmtDate, monogram, monoColor, accentFor, countSections, variantLabel };
