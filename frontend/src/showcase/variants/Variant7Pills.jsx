import { useState } from 'react';
import { PageShell, Hero, Eyebrow, MasterHeader, MatchChip, Monogram, Dot, EmptyTailored } from '../editorial.jsx';
import { MASTERS, fmtDate, variantLabel } from '../data.js';
import * as Icon from '../icons.jsx';

// ─────────────────────────────────────────────────────────────────────────────
// Variant 7 — "INLINE PILLS": the most minimal treatment. Each master's tailored
// copies collapse into a single wrap of small rounded-full pills tucked right
// under the master block, so even a master with six copies costs only one or two
// lines of vertical space. Pills carry a tiny monogram, the company, and a
// colour-coded match % (green ≥70, amber 60–69, faint below). The first four show
// inline; a "+N more" pill reveals the rest. A ghost dashed "＋ Tailor" pill ends
// every cluster as the new-copy affordance. The shared landscape master block
// above is composed verbatim — untouched.
// ─────────────────────────────────────────────────────────────────────────────

// Colour-coded match percentage: green when strong, amber when middling, faint
// otherwise — with a matching tiny dot so the colour reads even at 12px.
function MatchPct({ score }) {
  if (score == null) return null;
  const tone = score >= 70 ? 'text-emerald-600' : score >= 60 ? 'text-amber-600' : 'text-slate-400';
  const dot = score >= 70 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-500' : 'bg-slate-300';
  return (
    <span className={`inline-flex items-center gap-1 text-[12px] font-bold ${tone}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {score}%
    </span>
  );
}

// A single tailored copy rendered as a compact, scannable pill.
function VariantPill({ v }) {
  return (
    <button
      type="button"
      title={variantLabel(v)}
      className="group inline-flex items-center gap-2 rounded-full bg-white py-1 pl-1 pr-2.5 ring-1 ring-slate-200/80 transition hover:bg-brand-50/40 hover:ring-brand-300 cursor-pointer"
    >
      <Monogram label={variantLabel(v)} seed={v.id} size={20} round />
      <span className="text-[12.5px] font-semibold text-slate-700">{v.company}</span>
      <MatchPct score={v.matchScore} />
    </button>
  );
}

// The dashed ghost "＋ Tailor" affordance — same rounded-full footprint as a pill.
function TailorPill({ label = 'Tailor' }) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 bg-transparent py-1 pl-2 pr-2.5 text-[12.5px] font-semibold text-slate-400 transition hover:border-brand-300 hover:text-brand-600"
    >
      <Icon.Plus className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

// Master + its inline pill cluster. Holds its own show-all state so each master's
// "+N more" toggle is independent.
function MasterBlock({ m, idx }) {
  const [showAll, setShowAll] = useState(false);
  const n = m.variants.length;
  const COLLAPSED = 4;
  const overflow = n - COLLAPSED;
  const visible = showAll || overflow <= 0 ? m.variants : m.variants.slice(0, COLLAPSED);

  return (
    <section className={idx ? 'border-t border-slate-200/70 pt-9 mt-9' : ''}>
      <MasterHeader master={m} thumbW={idx === 0 ? 200 : 176} featured={idx === 0} />

      {n === 0 ? (
        // Empty master: keep it light — one dashed affordance, nothing more.
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Eyebrow>Tailored</Eyebrow>
          <TailorPill label="Tailor to a job" />
        </div>
      ) : (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Eyebrow className="mr-1">Tailored</Eyebrow>

          {visible.map((v) => (
            <VariantPill key={v.id} v={v} />
          ))}

          {overflow > 0 && (
            <button
              type="button"
              onClick={() => setShowAll((s) => !s)}
              aria-expanded={showAll}
              className="inline-flex items-center gap-1 rounded-full bg-white py-1 px-2.5 text-[12px] font-bold text-slate-500 ring-1 ring-slate-200/80 transition hover:bg-brand-50/40 hover:text-brand-600 hover:ring-brand-300"
            >
              {showAll ? 'Show less' : `+${overflow} more`}
            </button>
          )}

          {/* faint divider before the affordance so it reads as an action, not a copy */}
          <span className="mx-0.5 hidden sm:inline"><Dot /></span>
          <TailorPill />
        </div>
      )}
    </section>
  );
}

export default function Variant7Pills() {
  return (
    <PageShell>
      <Hero />
      <Eyebrow tone="brand" className="mb-4">Inline pills · tailored at a glance</Eyebrow>
      {MASTERS.map((m, idx) => (
        <MasterBlock key={m.id} m={m} idx={idx} />
      ))}
    </PageShell>
  );
}
