import { useState } from 'react';
import { PageShell, Hero, Eyebrow, MasterHeader, MatchChip, Monogram, Dot, EmptyTailored } from '../editorial.jsx';
import { MASTERS, fmtDate, variantLabel } from '../data.js';
import * as Icon from '../icons.jsx';

// ─────────────────────────────────────────────────────────────────────────────
// Variant 1 — "Stacked List" (the current favourite).
//
// Below each master: a clean VERTICAL STACK of full-width rows separated by
// hairline rules. Each row leads with a small blue bullet (swapped for a tiny
// round Monogram on hover/focus), then the role · company label, then — pushed
// right — a faint updated date, a match chip, and a ghost arrow. Lots of
// horizontal room, airy spacing. Masters with no copies fall back to the
// shared <EmptyTailored /> affordance. The master block itself is reused
// verbatim so it stays pixel-identical to the approved style.
// ─────────────────────────────────────────────────────────────────────────────

// One full-width tailored-copy row.
function TailoredRow({ variant }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="reveal group flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-lg hover:bg-slate-50/60 transition"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Leading marker: blue bullet → tiny monogram on hover for a touch of life. */}
      <span className="grid place-items-center w-[22px] h-[22px] shrink-0">
        {hovered ? (
          <Monogram label={variantLabel(variant)} seed={variant.id} size={22} round />
        ) : (
          <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
        )}
      </span>

      {/* Label: role (semibold) · company (muted) — clickable-looking link. */}
      <a
        href="#"
        onClick={(e) => e.preventDefault()}
        className="min-w-0 truncate text-[14px] leading-tight"
      >
        <span className="font-semibold text-slate-800 group-hover:text-brand-700 transition">{variant.role}</span>
        <span className="text-slate-400">{variant.company ? ` · ${variant.company}` : ''}</span>
      </a>

      {/* Right cluster: faint date · match chip · ghost arrow. */}
      <span className="ml-auto flex items-center gap-3 shrink-0">
        <span className="hidden sm:inline text-[13px] text-slate-400">{fmtDate(variant.updatedAt)}</span>
        <MatchChip score={variant.matchScore} />
        <button
          type="button"
          aria-label={`Open ${variantLabel(variant)}`}
          className="grid place-items-center w-7 h-7 rounded-md text-slate-300 hover:text-brand-600 hover:bg-brand-50/60 transition"
        >
          <Icon.ArrowRight className="w-4 h-4" />
        </button>
      </span>
    </div>
  );
}

function TailoredStack({ master }) {
  if (master.variants.length === 0) {
    return <EmptyTailored className="mt-5" />;
  }
  return (
    <div className="mt-6">
      <Eyebrow tone="muted" className="mb-1">Tailored copies</Eyebrow>
      <div className="divide-y divide-slate-200/70">
        {master.variants.map((v) => (
          <TailoredRow key={v.id} variant={v} />
        ))}
      </div>
    </div>
  );
}

export default function Variant1List() {
  return (
    <PageShell>
      <Hero />
      {MASTERS.map((m, idx) => (
        <section key={m.id} className={idx ? 'border-t border-slate-200/70 pt-9 mt-9' : ''}>
          <MasterHeader master={m} thumbW={idx === 0 ? 200 : 176} featured={idx === 0} />
          <TailoredStack master={m} />
        </section>
      ))}
    </PageShell>
  );
}
