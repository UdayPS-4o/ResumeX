import { useState } from 'react';
import { PageShell, Hero, Eyebrow, Thumb, MasterIdentity, MasterActions, MatchChip, Monogram, Dot, EmptyTailored } from '../editorial.jsx';
import { MASTERS, fmtDate, variantLabel } from '../data.js';
import * as Icon from '../icons.jsx';

// ─────────────────────────────────────────────────────────────────────────────
// Variant 2 — "Side Rail".
//
// Each master is composed from atoms in a LEFT column (thumb + identity +
// actions); its tailored copies live in a RIGHT rail divided off by a hairline.
// The rail is the star: a vertically SCROLLABLE column (~280px) so m1's six
// copies clearly scroll, showing ~4 at rest. Each entry is a compact row —
// round monogram · role over a faint "Company · Updated …" line · match chip.
// Masters with no copies (m3) show the dashed empty-state, vertically centred.
// The master identity itself is left untouched so it stays pixel-identical to
// the approved editorial style.
// ─────────────────────────────────────────────────────────────────────────────

// One compact tailored-copy row inside the rail.
function RailRow({ variant }) {
  return (
    <a
      href="#"
      onClick={(e) => e.preventDefault()}
      className="reveal group flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50 ring-1 ring-transparent hover:ring-slate-200/70 transition"
    >
      <Monogram size={30} round seed={variant.id} label={variantLabel(variant)} />
      <span className="flex-1 min-w-0">
        <span className="block text-[13px] font-semibold text-slate-800 truncate group-hover:text-brand-700 transition">
          {variant.role}
        </span>
        <span className="block text-[11px] text-slate-400 truncate">
          {variant.company} · Updated {fmtDate(variant.updatedAt)}
        </span>
      </span>
      <MatchChip score={variant.matchScore} />
    </a>
  );
}

// The rail (or empty state) for one master's tailored copies.
function TailoredRail({ master }) {
  const n = master.variants.length;
  
  if (n === 0) return null;

  return (
    <aside className="lg:w-[40%] lg:border-l lg:border-slate-200/70 lg:pl-8">
      <div className="flex items-center justify-between mb-3">
        <Eyebrow>Tailored copies</Eyebrow>
        {n > 0 && <span className="chip chip-neutral">{n}</span>}
      </div>

      <div className="relative">
        <div
          className="space-y-1.5 overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden"
          style={{ maxHeight: 280, scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {master.variants.map((v) => (
            <RailRow key={v.id} variant={v} />
          ))}
        </div>
        {n > 4 && (
          <>
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-5 rounded-t-xl"
              style={{ background: 'linear-gradient(to bottom, #f7f8fc, rgba(247,248,252,0))' }}
            />
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-6"
              style={{ background: 'linear-gradient(to top, #f7f8fc, rgba(247,248,252,0))' }}
            />
          </>
        )}
      </div>
    </aside>
  );
}

export default function Variant2Rail() {
  return (
    <PageShell>
      <Hero />
      {MASTERS.map((m, idx) => (
        <section key={m.id} className={idx ? 'border-t border-slate-200/70 pt-9 mt-9' : ''}>
          <div className="flex flex-col lg:flex-row gap-8 items-center">
            {/* LEFT — master (~58%) */}
            <div className="lg:flex-1 lg:max-w-[58%] flex gap-6 items-center">
              <Thumb
                resume={m.resume}
                template={m.templateId}
                name={m.name}
                w={260}
                className="border-l-[6px] border-brand-600 rounded-l-2xl"
              />
              <div className="flex-1 min-w-0">
                <MasterIdentity master={m} />
                <MasterActions className="mt-4" />
              </div>
            </div>

            {/* RIGHT — tailored rail (~40%) */}
            <TailoredRail master={m} />
          </div>
        </section>
      ))}
    </PageShell>
  );
}
