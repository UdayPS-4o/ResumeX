import { useState } from 'react';
import { PageShell, Hero, Eyebrow, MasterHeader, MatchChip, Monogram, Dot, EmptyTailored } from '../editorial.jsx';
import { MASTERS, fmtDate, variantLabel } from '../data.js';
import * as Icon from '../icons.jsx';

// ─────────────────────────────────────────────────────────────────────────────
// Variant 5 — "COLLAPSIBLE": each master's tailored copies are tucked behind a
// single, elegant toggle that's COLLAPSED BY DEFAULT. The collapsed state is the
// star: a calm row showing a stack of overlapping monogram avatars + a count +
// the best match, so a master with many tailored copies stays quiet until asked.
// Expanding reveals a clean hairline-divided vertical list. Composes the shared
// editorial atoms — the master block above is untouched.
// ─────────────────────────────────────────────────────────────────────────────

// A pile of the first few variants' monograms, overlapping with white rings,
// plus a "+N" chip when there are more than `max`.
function AvatarPile({ variants, max = 4 }) {
  const shown = variants.slice(0, max);
  const extra = variants.length - shown.length;
  return (
    <div className="flex items-center pl-2">
      {shown.map((v) => (
        <span key={v.id} className="-ml-2 rounded-full ring-2 ring-white">
          <Monogram label={variantLabel(v)} seed={v.id} size={26} round />
        </span>
      ))}
      {extra > 0 && (
        <span
          className="-ml-2 grid h-[26px] w-[26px] place-items-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-500 ring-2 ring-white"
        >
          +{extra}
        </span>
      )}
    </div>
  );
}

// One expanded row — same design as a normal tailored list item.
function TailoredRow({ v }) {
  return (
    <button className="group flex w-full items-center gap-3 py-3 text-left transition hover:bg-slate-50/70">
      <Monogram label={variantLabel(v)} seed={v.id} size={26} round />
      <span className="min-w-0 truncate">
        <span className="font-semibold text-slate-800">{v.role}</span>
        <span className="text-slate-400"> · {v.company}</span>
      </span>
      <span className="ml-auto hidden text-xs text-slate-400 sm:inline">{fmtDate(v.updatedAt)}</span>
      <MatchChip score={v.matchScore} />
      <Icon.ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
    </button>
  );
}

// Master + its collapsible tailored section. Holds its own open state so each
// master toggles independently. Collapsed by default.
function MasterBlock({ m, idx }) {
  const [open, setOpen] = useState(false);
  const n = m.variants.length;
  const bestMatch = n ? Math.max(...m.variants.map((v) => v.matchScore ?? 0)) : null;

  return (
    <section className={idx ? 'border-t border-slate-200/70 pt-9 mt-9' : ''}>
      <MasterHeader master={m} thumbW={idx === 0 ? 200 : 176} featured={idx === 0} />

      {n === 0 ? (
        <EmptyTailored className="mt-5" />
      ) : (
        <div className="mt-5">
          {/* Collapsed toggle — the hero of this variant. */}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="group flex w-full items-center gap-3 rounded-xl border border-slate-200/70 bg-white px-4 py-3 text-left transition hover:border-slate-300 hover:shadow-sm"
          >
            <span className="text-brand-600">
              <Icon.Chevron open={open} className="h-3.5 w-3.5" />
            </span>
            <span className="text-sm font-semibold text-slate-600">
              {open ? 'Hide tailored copies' : `Tailored for ${n} ${n === 1 ? 'job' : 'jobs'}`}
            </span>

            {!open && <AvatarPile variants={m.variants} />}

            <span className="ml-auto flex items-center gap-1.5 text-xs text-slate-400">
              {bestMatch != null && (
                <>
                  <span>
                    Best match <span className={`font-semibold ${bestMatch >= 70 ? 'text-emerald-600' : 'text-slate-500'}`}>{bestMatch}%</span>
                  </span>
                  <Dot />
                </>
              )}
              <span className="font-medium text-slate-400 transition group-hover:text-brand-600">
                {open ? 'Collapse' : 'View all'}
              </span>
            </span>
          </button>

          {/* Expanded list — soft reveal, hairline-divided rows with a left guide. */}
          {open && (
            <div className="reveal mt-2 rounded-xl border border-slate-200/70 bg-white pl-4 pr-2">
              <div className="divide-y divide-slate-200/70 border-l-2 border-brand-100 pl-3">
                {m.variants.map((v) => (
                  <TailoredRow key={v.id} v={v} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default function Variant5Collapse() {
  return (
    <PageShell>
      <Hero />
      <Eyebrow tone="brand" className="mb-4">Collapsible · tailored tucked away</Eyebrow>
      {MASTERS.map((m, idx) => (
        <MasterBlock key={m.id} m={m} idx={idx} />
      ))}
    </PageShell>
  );
}
