import { useState } from 'react';
import { PageShell, Hero, Eyebrow, MasterHeader, MatchChip, Monogram, Dot, EmptyTailored } from '../editorial.jsx';
import { MASTERS, fmtDate, variantLabel, accentFor } from '../data.js';
import * as Icon from '../icons.jsx';

// ─────────────────────────────────────────────────────────────────────────────
// Variant 6 "LINEAGE" — tailored copies branch off their master along a subtle
// vertical thread with hairline connector ticks. Reads as a refined family tree
// ("these spun off that master"), not a heavy org-chart. Composes the shared
// editorial atoms; the master block is left pixel-identical.
// ─────────────────────────────────────────────────────────────────────────────

// One tailored copy hanging off the vertical guide line: a connector tick + an
// accent node dot sitting ON the line, then monogram · identity · match · ghost.
function LineageNode({ v }) {
  return (
    <a
      href="#"
      className="group relative flex items-center gap-3 pl-6 py-2.5 -ml-px rounded-lg transition hover:bg-slate-50/70"
    >
      {/* horizontal connector from the guide line into the node */}
      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-px bg-slate-200 group-hover:bg-brand-200 transition-colors" />
      {/* node dot where the tick meets the guide line */}
      <span
        className="absolute -left-[5px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full ring-2 ring-white shrink-0"
        style={{ background: accentFor(v.templateId) }}
      />

      <Monogram size={30} round seed={v.id} label={variantLabel(v)} />

      <div className="min-w-0">
        <div className="text-sm font-semibold text-slate-800 truncate group-hover:text-brand-700">
          {v.role}
        </div>
        <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5 truncate">
          <span className="truncate">{v.company}</span>
          <Dot />
          <span className="shrink-0">Updated {fmtDate(v.updatedAt)}</span>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2.5 pl-2 shrink-0">
        <MatchChip score={v.matchScore} />
        <Icon.ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-brand-500 group-hover:translate-x-0.5 transition" />
      </div>
    </a>
  );
}

// The faint dashed affordance that hangs off the SAME guide line as the last
// real node — "branch a new tailored copy".
function BranchNew() {
  return (
    <button className="group relative flex items-center gap-3 pl-6 py-2.5 -ml-px rounded-lg transition hover:bg-slate-50/70">
      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-5 border-t border-dashed border-slate-300 group-hover:border-brand-300 transition-colors" />
      <span className="absolute -left-[5px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border border-dashed border-slate-300 bg-white group-hover:border-brand-400 transition-colors" />
      <span className="grid place-items-center w-[30px] h-[30px] rounded-full border border-dashed border-slate-300 text-slate-400 group-hover:border-brand-400 group-hover:text-brand-500 transition shrink-0">
        <Icon.Plus className="w-3.5 h-3.5" />
      </span>
      <span className="text-[13px] text-slate-400 group-hover:text-brand-600 transition">
        Branch a new tailored copy
      </span>
    </button>
  );
}

// The whole indented thread for one master: a relatively-positioned wrapper with
// an absolutely-positioned vertical guide line down its left edge, plus the
// stack of nodes. For a master with no copies, the thread terminates in a single
// empty-state node so the line still visibly "originates" at the master.
function Lineage({ master }) {
  const variants = master.variants;
  const empty = variants.length === 0;

  return (
    <div className="mt-6">
      <Eyebrow className="mb-1">Tailored from this master</Eyebrow>

      <div className="relative pl-6 sm:pl-10">
        {/* vertical guide line: starts just under the eyebrow, stops at the
            last node's dot (inset bottom) so it doesn't dangle past the tree */}
        <span
          aria-hidden
          className="absolute left-6 sm:left-10 top-0 bottom-7 w-px bg-slate-200"
        />

        {empty ? (
          <div className="relative pl-6 py-2.5 -ml-px">
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-px bg-slate-200" />
            <span className="absolute -left-[5px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full ring-2 ring-white bg-slate-200" />
            <EmptyTailored />
          </div>
        ) : (
          <>
            {variants.map((v) => (
              <LineageNode key={v.id} v={v} />
            ))}
            <BranchNew />
          </>
        )}
      </div>
    </div>
  );
}

export default function Variant6Tree() {
  // Reserved interactive hook (kept so the file owns its own state surface even
  // though every node is a static affordance in this gallery view).
  const [, setFocus] = useState(null);
  void setFocus;

  return (
    <PageShell>
      <Hero />
      {MASTERS.map((m, idx) => (
        <section key={m.id} className={idx ? 'border-t border-slate-200/70 pt-9 mt-9' : ''}>
          <MasterHeader master={m} thumbW={idx === 0 ? 200 : 176} featured={idx === 0} />
          <Lineage master={m} />
        </section>
      ))}
    </PageShell>
  );
}
