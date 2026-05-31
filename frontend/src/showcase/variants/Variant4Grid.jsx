import { useState } from 'react';
import { PageShell, Hero, Eyebrow, MasterHeader, MatchChip, Monogram, Dot, EmptyTailored } from '../editorial.jsx';
import { MASTERS, fmtDate, variantLabel, accentFor } from '../data.js';
import * as Icon from '../icons.jsx';

// ─────────────────────────────────────────────────────────────────────────────
// Variant 4 — "CARD GRID"
// Shared editorial master block on top (composed verbatim from MasterHeader);
// each master's tailored copies arranged BELOW it as a compact, responsive grid
// of text-forward info-cards. No thumbnails in the grid — kept tight and calm —
// with a thin left accent stripe in the template colour. A dashed "Tailor to a
// job" tile always trails the grid (and stands alone for the empty master).
// ─────────────────────────────────────────────────────────────────────────────

// One tailored copy, as a compact info-card.
function VariantCard({ v }) {
  const accent = accentFor(v.templateId);
  return (
    <button
      type="button"
      className="group rounded-xl bg-white ring-1 ring-slate-200/70 p-3.5 hover:ring-slate-300 hover:shadow-sm transition cursor-pointer flex flex-col gap-2 text-left"
      style={{ borderLeft: `3px solid ${accent}`, paddingLeft: 'calc(0.875rem - 3px)' }}
    >
      {/* top row: monogram · role/company · ghost affordance */}
      <div className="flex items-start gap-2.5">
        <Monogram label={variantLabel(v)} seed={v.id} size={32} />
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold text-slate-800 leading-tight truncate">{v.role}</div>
          <div className="text-[12px] text-slate-400 truncate">{v.company}</div>
        </div>
        <Icon.Dots className="w-4 h-4 text-slate-300 group-hover:text-slate-400 transition shrink-0" />
      </div>

      {/* bottom row: match chip · last-updated */}
      <div className="mt-auto flex items-center justify-between gap-2">
        <MatchChip score={v.matchScore} />
        <span className="text-[11px] text-slate-400 shrink-0">Updated {fmtDate(v.updatedAt)}</span>
      </div>
    </button>
  );
}

// Dashed call-to-action tile — trails the grid, or stands alone when empty.
function TailorTile({ full = false }) {
  return (
    <button
      type="button"
      className={`group rounded-xl border border-dashed border-slate-300 bg-transparent hover:border-brand-400 hover:bg-brand-50/50 transition cursor-pointer flex flex-col items-center justify-center gap-1.5 p-3.5 text-slate-400 hover:text-brand-600 min-h-[92px] ${full ? 'sm:col-span-2 lg:col-span-3' : ''}`}
    >
      <span className="grid place-items-center w-8 h-8 rounded-full bg-slate-100 text-slate-400 group-hover:bg-brand-100 group-hover:text-brand-600 transition">
        <Icon.Plus className="w-5 h-5" />
      </span>
      <span className="text-[12px] font-semibold">Tailor to a job</span>
    </button>
  );
}

// The tailored-copies grid for one master.
function TailoredGrid({ master }) {
  const variants = master.variants;
  const empty = variants.length === 0;

  return (
    <div className="mt-6">
      <Eyebrow className="mb-3">Tailored copies</Eyebrow>

      {empty && <EmptyTailored className="mb-3" />}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {variants.map((v) => (
          <VariantCard key={v.id} v={v} />
        ))}
        <TailorTile full={empty} />
      </div>
    </div>
  );
}

export default function Variant4Grid() {
  // Reserved for future interactivity (filtering/selection); keeps the export
  // a stateful client component so it slots into the showcase like its siblings.
  const [, setActive] = useState(null);
  void setActive;

  return (
    <PageShell>
      <Hero />
      {MASTERS.map((m, idx) => (
        <section key={m.id} className={idx ? 'border-t border-slate-200/70 pt-9 mt-9' : ''}>
          <MasterHeader master={m} thumbW={idx === 0 ? 200 : 176} featured={idx === 0} />
          <TailoredGrid master={m} />
        </section>
      ))}
    </PageShell>
  );
}
