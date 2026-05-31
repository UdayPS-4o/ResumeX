import { useState } from 'react';
import { PageShell, Hero, Eyebrow, Thumb, MasterIdentity, MasterActions, MatchChip, Monogram, Dot, EmptyTailored } from '../editorial.jsx';
import { MASTERS, fmtDate, variantLabel, accentFor } from '../data.js';
import * as Icon from '../icons.jsx';

// ─────────────────────────────────────────────────────────────────────────────
// Variant 8 — "TABBED": one landscape frame per master; a segmented tab row flips
// which resume is "active" and the LEFT thumbnail + RIGHT details swap to match,
// so a job-tailored copy can be compared against the master in place.
//   sel === 0  → the Master view (identity + actions)
//   sel >= 1   → that variant's "tailored copy" view (match meter + actions)
// ─────────────────────────────────────────────────────────────────────────────

// The resume currently shown by the LEFT thumbnail, derived from the active tab.
function activeResume(m, sel) {
  if (sel === 0) return { resume: m.resume, templateId: m.templateId, key: m.id };
  const v = m.variants[sel - 1];
  return { resume: v.resume, templateId: v.templateId, key: v.id };
}

// The tailored-copy detail view (sel >= 1): badge + role title + sub-line, a
// prominent match chip with a slim ATS meter, then a row of copy-scoped actions.
function VariantView({ m, v }) {
  const accent = accentFor(v.templateId);
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2.5 flex-wrap">
        <span className="badge badge-tailored">Tailored</span>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400">
          <span className="w-2 h-2 rounded-full" style={{ background: accent }} />
          {v.company}
        </span>
      </div>

      <h3 className="text-[22px] font-bold text-slate-900 tracking-tight mt-2">{v.role}</h3>
      <div className="text-[13px] text-slate-500 mt-1.5 flex items-center gap-1.5 flex-wrap">
        <span>Tailored from {m.title}</span><Dot /><span>Updated {fmtDate(v.updatedAt)}</span>
      </div>

      {/* Match: chip + slim meter, the headline signal of a tailored copy. */}
      <div className="mt-4 max-w-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">ATS match</span>
          <div className="flex items-center gap-2">
            <MatchChip score={v.matchScore} />
          </div>
        </div>
        <div className="meter mt-2">
          <span style={{ width: v.matchScore + '%', background: v.matchScore >= 70 ? '#16a34a' : undefined }} />
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap mt-4">
        <button className="rx-btn rx-btn-primary rx-btn-sm"><Icon.Edit /> Open</button>
        <button className="rx-btn rx-btn-soft rx-btn-sm"><Icon.Mail /> Cover letter</button>
        <button className="rx-btn rx-btn-ghost rx-btn-sm" style={{ color: '#b91c1c' }}><Icon.Trash /> Delete</button>
      </div>
    </div>
  );
}

function MasterBlock({ m, idx }) {
  const [sel, setSel] = useState(0); // 0 = the master; 1..N = a tailored variant
  const hasVariants = m.variants.length > 0;
  const safeSel = sel <= m.variants.length ? sel : 0; // guard against stale index
  const active = activeResume(m, safeSel);
  const activeAccent = safeSel === 0 ? '#2557eb' : accentFor(m.variants[safeSel - 1].templateId);

  return (
    <section className={idx ? 'border-t border-slate-200/70 pt-9 mt-9' : ''}>
      <div className="flex flex-col sm:flex-row gap-6 lg:gap-8">
        {/* LEFT — live preview of the currently-selected resume; fades on swap. */}
        <div className="shrink-0">
          <div
            key={active.key}
            className="rounded-xl"
            style={{ animation: 'rxFade 0.28s ease', boxShadow: `0 0 0 3px ${activeAccent}1f` }}
          >
            <Thumb resume={active.resume} template={active.templateId} name={m.name} w={200} />
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 justify-center">
            <Icon.Layers className="w-3.5 h-3.5" />
            {safeSel === 0 ? 'Master resume' : `Showing ${m.variants[safeSel - 1].company} copy`}
          </div>
        </div>

        {/* RIGHT — tab row + the view bound to the active tab. */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <Eyebrow tone={safeSel ? 'muted' : 'brand'}>
              {hasVariants ? `${m.variants.length} tailored ${m.variants.length === 1 ? 'copy' : 'copies'}` : 'No tailored copies'}
            </Eyebrow>
            <span className="inline-flex items-center gap-2 text-[12px] text-slate-400">
              <Monogram seed={m.id} label={m.title} size={22} round accent={activeAccent} />
              <span className="font-semibold text-slate-500">{m.title}</span>
            </span>
          </div>

          {/* Segmented tabs: Master first, then one per variant (by company). */}
          {hasVariants ? (
            <div className="mt-3 overflow-x-auto -mx-1 px-1 pb-1">
              <div className="seg flex-nowrap" style={{ width: 'max-content', maxWidth: 'none' }}>
                <button
                  className={`seg-btn whitespace-nowrap inline-flex items-center gap-1.5 ${safeSel === 0 ? 'is-active' : ''}`}
                  onClick={() => setSel(0)}
                >
                  <Icon.Doc className="w-3.5 h-3.5" /> Master
                </button>
                {m.variants.map((v, i) => (
                  <button
                    key={v.id}
                    title={variantLabel(v)}
                    className={`seg-btn whitespace-nowrap inline-flex items-center gap-1.5 ${safeSel === i + 1 ? 'is-active' : ''}`}
                    onClick={() => setSel(i + 1)}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: safeSel === i + 1 ? accentFor(v.templateId) : '#cbd5e1' }}
                    />
                    {v.company}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {/* Body bound to the active tab. */}
          <div className="mt-5">
            {safeSel === 0 ? (
              <>
                <MasterIdentity master={m} />
                <MasterActions className="mt-4" />
                {!hasVariants && <EmptyTailored className="mt-4" />}
              </>
            ) : (
              <VariantView m={m} v={m.variants[safeSel - 1]} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Variant8Tabs() {
  return (
    <>
      {/* Local keyframe for the crisp thumbnail swap (scoped, no global leak). */}
      <style>{`@keyframes rxFade{from{opacity:.35;transform:translateY(3px)}to{opacity:1;transform:none}}`}</style>
      <PageShell>
        <Hero />
        {MASTERS.map((m, idx) => (
          <MasterBlock key={m.id} m={m} idx={idx} />
        ))}
      </PageShell>
    </>
  );
}
