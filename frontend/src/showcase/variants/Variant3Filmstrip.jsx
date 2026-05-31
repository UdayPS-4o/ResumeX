import { PageShell, Hero, Eyebrow, MasterHeader, Thumb, MatchChip, Dot, EmptyTailored } from '../editorial.jsx';
import { MASTERS, fmtDate, variantLabel, accentFor } from '../data.js';
import * as Icon from '../icons.jsx';

// ─────────────────────────────────────────────────────────────────────────────
// Variant 3 — "Filmstrip".
//
// Below each master, the tailored copies become a single HORIZONTAL,
// scroll-snapping strip of mini resume cards: a live thumbnail is the visual
// hook, capped with a thin accent bar in the template's colour; the body carries
// role · company, a match chip and a faint date; hover lifts the card and
// reveals an "Open" affordance. A trailing dashed "+ Tailor to a job" card keeps
// the strip actionable, and is the ONLY thing shown for masters with no copies.
// The master block above is reused verbatim so it stays pixel-identical to the
// approved editorial style.
// ─────────────────────────────────────────────────────────────────────────────

const CARD_W = 168;

// One tailored-copy card: accent bar · mini thumbnail · role/company · footer.
function FilmCard({ variant }) {
  const accent = accentFor(variant.templateId);
  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`Open ${variantLabel(variant)}`}
      className="reveal group snap-start shrink-0 rounded-2xl bg-white ring-1 ring-slate-200/70 card-elev-hover overflow-hidden cursor-pointer transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      style={{ width: CARD_W }}
    >
      {/* Thin accent bar in the template's colour — a small splash of identity. */}
      <div className="h-1 w-full" style={{ background: accent }} />

      {/* Mini live thumbnail spanning the card width — the preview is the hook. */}
      <div className="relative">
        <Thumb
          resume={variant.resume}
          template={variant.templateId}
          name={variantLabel(variant)}
          w={CARD_W}
          className="!rounded-none !ring-0 !shadow-none border-b border-slate-100"
        />
        {/* "Open" affordance, revealed on hover/focus over the preview. */}
        <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 py-1.5 text-[11px] font-semibold text-white opacity-0 translate-y-1 transition-all duration-150 group-hover:opacity-100 group-hover:translate-y-0 group-focus-visible:opacity-100 group-focus-visible:translate-y-0"
          style={{ background: 'linear-gradient(to top, rgba(15,23,42,0.66), rgba(15,23,42,0))' }}
        >
          Open <Icon.ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>

      {/* Body: role · company · footer (match chip + faint date). */}
      <div className="p-3">
        <div className="text-[13px] font-semibold text-slate-800 truncate group-hover:text-brand-700 transition">
          {variant.role}
        </div>
        <div className="text-[11px] text-slate-400 truncate">{variant.company || '—'}</div>
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <MatchChip score={variant.matchScore} />
          <span className="text-[11px] text-slate-400 shrink-0">{fmtDate(variant.updatedAt)}</span>
        </div>
      </div>
    </article>
  );
}

// Trailing call-to-action card — dashed, brand-tinted on hover. Slightly wider
// when it stands alone (empty master) so the lone CTA doesn't read as cramped.
function TailorCard({ wide = false }) {
  return (
    <button
      type="button"
      aria-label="Tailor to a job"
      className="reveal group snap-start shrink-0 rounded-2xl border border-dashed border-slate-300 bg-slate-50/40 text-slate-400 grid place-items-center transition hover:border-brand-400 hover:bg-brand-50/50 hover:text-brand-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      style={{ width: wide ? CARD_W + 40 : CARD_W }}
    >
      <span className="flex flex-col items-center gap-2 px-4 py-6 text-center">
        <span className="grid place-items-center w-9 h-9 rounded-full bg-white ring-1 ring-slate-200 text-slate-400 transition group-hover:ring-brand-200 group-hover:text-brand-600">
          <Icon.Plus className="w-5 h-5" />
        </span>
        <span className="text-[12px] font-semibold leading-tight">Tailor to a job</span>
      </span>
    </button>
  );
}

// The horizontal strip for one master's tailored copies (+ trailing CTA).
function Filmstrip({ master }) {
  const empty = master.variants.length === 0;
  const n = master.variants.length;

  return (
    <div className="mt-6">
      {/* Eyebrow row: section label left, scroll hint / count right. */}
      <div className="flex items-end justify-between gap-3 mb-2.5">
        <Eyebrow>Tailored copies</Eyebrow>
        {empty ? (
          <EmptyTailored className="!mt-0" />
        ) : (
          <span className="flex items-center gap-1.5 text-[11px] text-slate-400 shrink-0 select-none">
            <span>{n} {n === 1 ? 'copy' : 'copies'}</span>
            <Dot />
            <span className="hidden sm:inline">← scroll →</span>
          </span>
        )}
      </div>

      {/* Scroll-snapping strip. For m1 (6 cards) this clearly scrolls sideways. */}
      <div className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory">
        {master.variants.map((v) => (
          <FilmCard key={v.id} variant={v} />
        ))}
        <TailorCard wide={empty} />
      </div>
    </div>
  );
}

export default function Variant3Filmstrip() {
  return (
    <PageShell>
      <Hero />
      {MASTERS.map((m, idx) => (
        <section key={m.id} className={idx ? 'border-t border-slate-200/70 pt-9 mt-9' : ''}>
          <MasterHeader master={m} thumbW={idx === 0 ? 200 : 176} featured={idx === 0} />
          <Filmstrip master={m} />
        </section>
      ))}
    </PageShell>
  );
}
