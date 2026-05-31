// Tailor-to-a-job flow. Owned by task #4.
//
// Props:
//   master   — the source resume entry to tailor from (the "master")
//   settings — app settings { provider, model, apiKeys, baseUrls, tailorStrategy, ... }
//   onClose() — dismiss without saving
//   onSave({ resume, job, matchScore, title, messages }) — App creates a tailored VARIANT.
//     `messages` seeds the variant's chat with the tailoring diff as applied-but-undoable
//     suggestion cards, matching Editor.jsx's optimize path.
//
// Flow: paste JD → api.extractJd() → pick strategy (nudge/keywords/full) →
// api.tailor() → review per-EDIT changes (checkbox per edit row) →
// compute matchScore via api.atsScore() → onSave(...).

import { useMemo, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { baseUrlFor } from '../lib/storage.js';
import { diffResume, splitChangesIntoCards, applyCardPatch, invertCardPatch } from '@resumex/core';

const STRATEGIES = [
  { id: 'nudge', label: 'Nudge', hint: 'Minimal, conservative edits' },
  { id: 'keywords', label: 'Keywords', hint: 'Weave in JD keywords (balanced)' },
  { id: 'full', label: 'Full', hint: 'Aggressively re-angle for the role' },
];

// ── Edit-level helpers ───────────────────────────────────────────────────────

// All edit positions in a card: [{ci, ei, key, edit}] where key = "${ci}:${ei}"
function cardEditKeys(card) {
  const keys = [];
  (card.changes || []).forEach((change, ci) => {
    (change.edits || []).forEach((edit, ei) => {
      keys.push({ ci, ei, key: `${ci}:${ei}`, edit });
    });
  });
  return keys;
}

// Stable identifier for matching array items across master ↔ result
function itemName(item) {
  return (item?.company || item?.institution || item?.school || item?.name || item?.where || '').trim();
}

// Apply one edit to a resume item (bullet add/remove/revise, or scalar field revise)
function applyEditToItem(item, edit) {
  if (!item) return item;
  if (edit.kind === 'add' && edit.after !== undefined) {
    return { ...item, description: [...(item.description || []), edit.after] };
  }
  if (edit.kind === 'remove' && edit.before !== undefined) {
    if (Array.isArray(item.description)) {
      return { ...item, description: item.description.filter(b => b !== edit.before) };
    }
    return item;
  }
  if (edit.kind === 'revise' && edit.before !== undefined && edit.after !== undefined) {
    // Bullet in description array?
    if (Array.isArray(item.description) && item.description.includes(edit.before)) {
      return { ...item, description: item.description.map(b => b === edit.before ? edit.after : b) };
    }
    // Scalar field — find by before value
    for (const [k, v] of Object.entries(item)) {
      if (typeof v === 'string' && v === edit.before) return { ...item, [k]: edit.after };
    }
  }
  return item;
}

// Apply only the accepted edits (Set<editKey>) from one card to masterResume.
// For fully-accepted cards callers use applyCardPatch instead (it's faster + exact).
function applyPartialCard(masterResume, resultResume, card, acceptedKeys) {
  const cardId = card.id;

  // ── Profile card ──
  if (cardId === 'profile') {
    let res = { ...masterResume };
    const contact = { ...(masterResume.contact || {}) };
    for (const { key, edit } of cardEditKeys(card)) {
      if (!acceptedKeys.has(key) || !edit.after) continue;
      if (edit.before === masterResume.name || (!edit.before && resultResume?.name === edit.after))
        { res = { ...res, name: edit.after }; }
      else if (edit.before === masterResume.headline || (!edit.before && resultResume?.headline === edit.after))
        { res = { ...res, headline: edit.after }; }
      else if (edit.before === masterResume.summary || (!edit.before && resultResume?.summary === edit.after))
        { res = { ...res, summary: edit.after }; }
      else {
        for (const [k, v] of Object.entries(masterResume.contact || {})) {
          if (v === edit.before) { contact[k] = edit.after; break; }
        }
      }
    }
    return { ...res, contact };
  }

  // ── Array card: "{sectionKey}:{itemWhere}" ──
  const colonIdx = cardId.indexOf(':');
  if (colonIdx === -1) return masterResume;
  const sectionKey = cardId.slice(0, colonIdx);
  const itemWhere = cardId.slice(colonIdx + 1);
  const masterSection = Array.isArray(masterResume[sectionKey]) ? masterResume[sectionKey] : [];
  const resultSection = Array.isArray(resultResume?.[sectionKey]) ? resultResume[sectionKey] : [];

  const masterItem = masterSection.find(i => itemName(i) === itemWhere);
  const resultItem = resultSection.find(i => itemName(i) === itemWhere);

  // Item only exists in master → removal card; apply if any accepted edit
  if (!resultItem) {
    const shouldRemove = cardEditKeys(card).some(({ key, edit }) =>
      acceptedKeys.has(key) && (edit.kind === 'remove' || !edit.after));
    if (shouldRemove)
      return { ...masterResume, [sectionKey]: masterSection.filter(i => itemName(i) !== itemWhere) };
    return masterResume;
  }

  // Item only exists in result → brand-new item; insert it
  if (!masterItem) {
    const resultIdx = resultSection.findIndex(i => itemName(i) === itemWhere);
    const newSection = [...masterSection];
    newSection.splice(Math.min(resultIdx, newSection.length), 0, resultItem);
    return { ...masterResume, [sectionKey]: newSection };
  }

  // Item exists in both → start from master, apply only accepted edits
  let item = JSON.parse(JSON.stringify(masterItem));
  for (const { key, edit } of cardEditKeys(card)) {
    if (acceptedKeys.has(key)) item = applyEditToItem(item, edit);
  }
  return { ...masterResume, [sectionKey]: masterSection.map(i => itemName(i) === itemWhere ? item : i) };
}

// ── Component ────────────────────────────────────────────────────────────────

export default function TailorPanel({ master, settings, onClose, onSave }) {
  const auth = useMemo(() => ({
    provider: settings.provider,
    model: settings.model,
    apiKey: settings.apiKeys?.[settings.provider] || '',
    baseUrl: baseUrlFor(settings.provider, settings),
  }), [settings]);

  const [jd, setJd] = useState(master?.job?.description || '');
  const [strategy, setStrategy] = useState(settings.tailorStrategy || 'keywords');
  const [job, setJob] = useState(master?.job || null);

  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Review state: model result + per-edit acceptance map.
  // editAccepted: { [cardId]: { [editKey]: boolean } }  (editKey = "${ci}:${ei}")
  const [result, setResult] = useState(null);
  const [editAccepted, setEditAccepted] = useState({});

  const abortRef = useRef(null);
  const masterResume = master?.resume || {};
  const busy = analyzing || generating || saving;

  // Cards derived from master ↔ tailored diff
  const cards = useMemo(() => {
    if (!result?.resume || !result?.patch) return [];
    return splitChangesIntoCards(diffResume(masterResume, result.resume), result.patch, masterResume);
  }, [result, masterResume]);

  // Final resume — master + only accepted edits
  const finalResume = useMemo(() => {
    if (!cards.length || !result) return masterResume;
    let current = masterResume;
    for (const card of cards) {
      const cardAcc = editAccepted[card.id] || {};
      const allKeys = cardEditKeys(card);
      const accepted = new Set(allKeys.filter(({ key }) => cardAcc[key]).map(({ key }) => key));
      if (accepted.size === 0) continue;
      if (accepted.size === allKeys.length) {
        current = applyCardPatch(current, card.id, result.patch); // fast path
      } else {
        current = applyPartialCard(current, result.resume, card, accepted);
      }
    }
    return current;
  }, [cards, editAccepted, masterResume, result]);

  // Counters for footer
  const { totalEdits, acceptedEdits } = useMemo(() => {
    let total = 0, accepted = 0;
    for (const card of cards) {
      const cardAcc = editAccepted[card.id] || {};
      for (const { key } of cardEditKeys(card)) {
        total++;
        if (cardAcc[key]) accepted++;
      }
    }
    return { totalEdits: total, acceptedEdits: accepted };
  }, [cards, editAccepted]);

  function cancelInflight() {
    abortRef.current?.abort();
    abortRef.current = null;
  }

  async function analyze() {
    if (!jd.trim() || busy) return;
    setError('');
    setAnalyzing(true);
    cancelInflight();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const j = await api.extractJd({ ...auth, jobDescription: jd }, { signal: ctrl.signal });
      setJob(j);
    } catch (e) {
      if (e.name !== 'AbortError')
        setError(`Couldn't analyze the job — you can still tailor with the raw text. (${e.message})`);
    } finally {
      setAnalyzing(false);
      abortRef.current = null;
    }
  }

  async function generate() {
    if (!jd.trim() || busy) return;
    setError('');
    setGenerating(true);
    cancelInflight();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const r = await api.tailor(
        { ...auth, resume: masterResume, jobDescription: jd, job, strategy },
        { signal: ctrl.signal },
      );
      setResult(r);
      // Pre-accept every edit by default — opt-OUT review
      const initial = {};
      for (const c of splitChangesIntoCards(diffResume(masterResume, r.resume), r.patch, masterResume)) {
        initial[c.id] = {};
        for (const { key } of cardEditKeys(c)) initial[c.id][key] = true;
      }
      setEditAccepted(initial);
    } catch (e) {
      if (e.name !== 'AbortError') setError(e.message || 'Tailoring failed.');
    } finally {
      setGenerating(false);
      abortRef.current = null;
    }
  }

  function toggleEdit(cardId, editKey) {
    setEditAccepted(prev => {
      const cardAcc = { ...(prev[cardId] || {}) };
      cardAcc[editKey] = !cardAcc[editKey];
      return { ...prev, [cardId]: cardAcc };
    });
  }

  function setCardAllEdits(card, value) {
    const cardAcc = {};
    for (const { key } of cardEditKeys(card)) cardAcc[key] = value;
    setEditAccepted(prev => ({ ...prev, [card.id]: cardAcc }));
  }

  function acceptAll() {
    const next = {};
    for (const card of cards) {
      next[card.id] = {};
      for (const { key } of cardEditKeys(card)) next[card.id][key] = true;
    }
    setEditAccepted(next);
  }

  function clearAll() {
    const next = {};
    for (const card of cards) {
      next[card.id] = {};
      for (const { key } of cardEditKeys(card)) next[card.id][key] = false;
    }
    setEditAccepted(next);
  }

  async function save() {
    if (busy) return;
    setSaving(true);
    setError('');
    try {
      // Resolve job info — auto-extract if needed so tracker pre-fills correctly.
      let finalJob = job;
      if (!finalJob || (!finalJob.company && !finalJob.role)) {
        try {
          const j = await api.extractJd({ ...auth, jobDescription: jd });
          finalJob = { ...(finalJob || {}), ...j };
          setJob(finalJob);
        } catch { /* keep whatever we already have */ }
      }

      let title = (finalJob?.suggestedTitle || '').trim();
      if (!title && (finalJob?.role || finalJob?.company)) {
        title = [finalJob.role, finalJob.company].filter(Boolean).join(' · ');
      }
      if (!title) {
        try {
          const t = await api.generateTitle({ ...auth, jobDescription: jd });
          title = (t?.title || '').trim();
        } catch { /* fall through */ }
      }
      if (!title) title = `${master?.title || 'Resume'} (tailored)`;

      let matchScore = master?.matchScore ?? null;
      try {
        const ats = await api.atsScore({ ...auth, resume: finalResume, jobDescription: jd });
        matchScore = ats?.score ?? matchScore;
      } catch { /* scoring is best-effort — save anyway */ }

      // ── Seed the variant's chat with the tailoring diff as an applied-but-undoable
      // suggestion, mirroring Editor.jsx's optimize path (lines 248-272).
      // Each accepted card is individually undoable; "undo all" reverts to master.
      let messages = [];
      const acceptedCards = cards.filter(card =>
        cardEditKeys(card).some(({ key }) => (editAccepted[card.id] || {})[key])
      );

      if (acceptedCards.length > 0 && result) {
        const appliedCardsMap = {};
        for (const card of acceptedCards) {
          // Snapshot masterResume's state for this card → undo restores it
          appliedCardsMap[card.id] = { undo: invertCardPatch(masterResume, card.id, card.patch) };
        }

        // Recompute diff against the actual finalResume for accurate card descriptions
        const finalChanges = diffResume(masterResume, finalResume);
        const finalCards = splitChangesIntoCards(finalChanges, result.patch, masterResume);

        const roleAt = [finalJob?.role, finalJob?.company].filter(Boolean).join(' at ');
        const userDisplay = roleAt
          ? `✨ Tailored for ${roleAt}`
          : '✨ Tailored resume applied';

        messages = [
          {
            role: 'user',
            content: jd.slice(0, 500),
            display: userDisplay,
            optimize: true,
          },
          {
            role: 'assistant',
            content: result.message
              || 'I tailored your resume for this role. Each section can be undone individually — or tap "Undo all" to revert everything.',
            suggestion: {
              patch: result.patch,
              changes: finalChanges,
              cards: finalCards,
              appliedCards: appliedCardsMap,
              applied: true,
              undoAll: masterResume,
            },
          },
        ];
      }

      onSave({
        resume: finalResume,
        job: { description: jd, ...(finalJob || {}) },
        matchScore,
        title,
        messages,
      });
    } catch (e) {
      setError(e.message || 'Could not save the tailored resume.');
      setSaving(false);
    }
  }

  const stage = result ? 'review' : 'compose';

  return (
    <div className="rx-overlay" onClick={busy ? undefined : onClose}>
      <div className="rx-sheet rx-sheet-lg flex flex-col" style={{ maxHeight: '88vh' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex items-start justify-between gap-4">
          <div>
            <div className="rx-eyebrow mb-1">Tailor to a job</div>
            <h2 className="text-lg font-semibold text-slate-900 leading-tight">
              {master?.title || 'Resume'}
            </h2>
            <p className="text-slate-500 text-xs mt-1">
              Paste the job description, generate a tailored draft, then pick exactly which edits to keep.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg w-8 h-8 grid place-items-center transition-all active:scale-95 duration-200 ease-in-out shrink-0"
            title="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {stage === 'compose' ? (
            <ComposeStage
              jd={jd}
              setJd={setJd}
              job={job}
              analyzing={analyzing}
              onAnalyze={analyze}
              strategy={strategy}
              setStrategy={setStrategy}
              busy={busy}
            />
          ) : (
            <ReviewStage
              cards={cards}
              editAccepted={editAccepted}
              onToggleEdit={toggleEdit}
              onSetCardAll={setCardAllEdits}
              message={result?.message}
              onAcceptAll={acceptAll}
              onClearAll={clearAll}
            />
          )}

          {error && (
            <div className="text-xs bg-rose-50 border border-rose-200 text-rose-800 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {stage === 'review' && (
              <span>
                <span className="font-semibold text-slate-700 tabular-nums">{acceptedEdits}</span>
                {' '}of {totalEdits} edit{totalEdits === 1 ? '' : 's'} selected
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {stage === 'review' && (
              <button
                className="rx-btn rx-btn-ghost transition-all duration-200 ease-in-out active:scale-95 disabled:active:scale-100"
                onClick={() => { setResult(null); setEditAccepted({}); setError(''); }}
                disabled={busy}
              >
                Back
              </button>
            )}
            <button className="rx-btn rx-btn-ghost transition-all duration-200 ease-in-out active:scale-95 disabled:active:scale-100" onClick={onClose} disabled={busy}>Cancel</button>
            {stage === 'compose' ? (
              <button className="rx-btn rx-btn-primary transition-all duration-200 ease-in-out active:scale-95 disabled:active:scale-100" onClick={generate} disabled={!jd.trim() || busy}>
                {generating ? <><Spinner /> Generating…</> : 'Generate tailored resume'}
              </button>
            ) : (
              <button className="rx-btn rx-btn-primary transition-all duration-200 ease-in-out active:scale-95 disabled:active:scale-100" onClick={save} disabled={busy}>
                {saving ? <><Spinner /> Saving…</> : 'Save as tailored variant'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Stage 1: paste JD, analyze, pick strategy ────────────────────────────────
function ComposeStage({ jd, setJd, job, analyzing, onAnalyze, strategy, setStrategy, busy }) {
  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-slate-700">Job description</label>
          <button
            onClick={onAnalyze}
            disabled={!jd.trim() || busy}
            className="text-xs font-semibold text-brand-700 hover:text-brand-800 disabled:text-slate-300 disabled:cursor-not-allowed inline-flex items-center gap-1 transition-all active:scale-95 duration-200 ease-in-out"
          >
            {analyzing ? <><Spinner small /> Analyzing…</> : (job ? 'Re-analyze' : 'Analyze job')}
          </button>
        </div>
        <textarea
          value={jd}
          onChange={(e) => setJd(e.target.value)}
          rows={7}
          placeholder="Paste the full job description here…"
          className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition placeholder:text-slate-400"
        />
      </div>

      {job && <JobSummary job={job} />}

      <div>
        <label className="text-xs font-semibold text-slate-700 block mb-1.5">Tailoring strategy</label>
        <div className="seg" role="group" aria-label="Tailoring strategy">
          {STRATEGIES.map((s) => (
            <button
              key={s.id}
              type="button"
              className="seg-btn transition-all duration-200 ease-in-out active:scale-95"
              aria-pressed={strategy === s.id}
              onClick={() => setStrategy(s.id)}
              disabled={busy}
            >
              {s.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-slate-400 mt-1.5">
          {STRATEGIES.find((s) => s.id === strategy)?.hint}
        </p>
      </div>
    </>
  );
}

// Extracted role/company/seniority + required/preferred skill chips.
function JobSummary({ job }) {
  const meta = [job.role, job.company, job.seniority && job.seniority !== 'unknown' ? cap(job.seniority) : '']
    .filter(Boolean);
  const hasSkills = (job.requiredSkills?.length || 0) + (job.preferredSkills?.length || 0) > 0;
  if (!meta.length && !hasSkills) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
      {meta.length > 0 && (
        <div className="text-sm font-semibold text-slate-800 mb-2">{meta.join(' · ')}</div>
      )}
      {job.requiredSkills?.length > 0 && (
        <SkillRow label="Required" skills={job.requiredSkills} tone="chip-brand" />
      )}
      {job.preferredSkills?.length > 0 && (
        <SkillRow label="Preferred" skills={job.preferredSkills} tone="chip-neutral" />
      )}
    </div>
  );
}

function SkillRow({ label, skills, tone }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-1.5 first:mt-0">
      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mr-0.5">{label}</span>
      {skills.map((s, i) => (
        <span key={i} className={`chip ${tone}`}>{s}</span>
      ))}
    </div>
  );
}

// ── Stage 2: per-edit review ─────────────────────────────────────────────────
function ReviewStage({ cards, editAccepted, onToggleEdit, onSetCardAll, message, onAcceptAll, onClearAll }) {
  if (!cards.length) {
    return (
      <div className="text-center py-10">
        <div className="text-sm font-semibold text-slate-700">No changes proposed</div>
        <p className="text-xs text-slate-500 mt-1">
          The model left your resume as-is for this job. Try the &ldquo;Full&rdquo; strategy for a bolder re-angle.
        </p>
      </div>
    );
  }
  return (
    <>
      {message && (
        <div className="flex items-start gap-2 text-sm text-slate-700 bg-slate-100 rounded-2xl rounded-bl-sm px-3.5 py-2.5">
          <div className="w-6 h-6 rounded-md bg-brand-100 text-brand-700 grid place-items-center text-xs font-semibold shrink-0">R</div>
          <span className="leading-relaxed">{message}</span>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-slate-700">Review changes</div>
        <div className="flex items-center gap-3">
          <button onClick={onAcceptAll} className="text-xs font-medium text-brand-700 hover:text-brand-800 transition-all active:scale-95 duration-200 ease-in-out">Select all</button>
          <button onClick={onClearAll} className="text-xs font-medium text-slate-500 hover:text-slate-800 transition-all active:scale-95 duration-200 ease-in-out">Clear all</button>
        </div>
      </div>
      <div className="space-y-3">
        {cards.map((card) => (
          <ReviewCard
            key={card.id}
            card={card}
            cardAcc={editAccepted[card.id] || {}}
            onToggleEdit={onToggleEdit}
            onSetAll={onSetCardAll}
          />
        ))}
      </div>
    </>
  );
}

// One section card: shows per-edit checkboxes with card-level select/clear controls.
function ReviewCard({ card, cardAcc, onToggleEdit, onSetAll }) {
  const allKeys = cardEditKeys(card);
  const acceptedCount = allKeys.filter(({ key }) => cardAcc[key]).length;
  const total = allKeys.length;
  const allAccepted = acceptedCount === total && total > 0;
  const noneAccepted = acceptedCount === 0;
  const partial = !noneAccepted && !allAccepted;

  return (
    <div className={`rounded-xl border overflow-hidden shadow-sm transition ${
      noneAccepted ? 'border-slate-200 bg-slate-50/60 opacity-70' :
      partial      ? 'border-amber-200 bg-white' :
                     'border-brand-200 bg-white'
    }`}>
      {/* Card header */}
      <div className={`px-3 py-2 flex items-center gap-2 border-b ${
        noneAccepted ? 'border-slate-100' :
        partial      ? 'border-amber-100 bg-amber-50/40' :
                       'border-brand-100 bg-brand-50/60'
      }`}>
        <SparkIcon className={
          noneAccepted ? 'w-4 h-4 text-slate-400' :
          partial      ? 'w-4 h-4 text-amber-500' :
                         'w-4 h-4 text-brand-600'
        } />
        <span className={`text-xs font-semibold flex-1 min-w-0 truncate ${
          noneAccepted ? 'text-slate-500' :
          partial      ? 'text-amber-900' :
                         'text-brand-900'
        }`} title={card.label}>
          {card.label}
        </span>
        <span className={`text-[11px] tabular-nums mr-0.5 ${
          noneAccepted ? 'text-slate-400' :
          partial      ? 'text-amber-600 font-medium' :
                         'text-brand-600'
        }`}>{acceptedCount}/{total}</span>
        <div className="flex items-center gap-1">
          {!allAccepted && (
            <button
              onClick={() => onSetAll(card, true)}
              className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-brand-600 text-white hover:bg-brand-700 transition-all active:scale-95 duration-200 ease-in-out"
            >All</button>
          )}
          {!noneAccepted && (
            <button
              onClick={() => onSetAll(card, false)}
              className="text-[11px] px-2 py-0.5 rounded-md text-slate-500 hover:bg-slate-100 transition-all active:scale-95 duration-200 ease-in-out"
            >None</button>
          )}
        </div>
      </div>

      {/* Per-edit rows */}
      <div className="px-3 py-2.5 space-y-3 max-h-72 overflow-y-auto">
        {(card.changes || []).map((c, ci) => (
          <SectionDiff
            key={ci}
            change={c}
            ci={ci}
            cardId={card.id}
            cardAcc={cardAcc}
            onToggleEdit={onToggleEdit}
          />
        ))}
      </div>
    </div>
  );
}

const KIND_TONE = {
  add:    { sign: '+', cls: 'text-emerald-700 bg-emerald-100' },
  revise: { sign: '~', cls: 'text-amber-700  bg-amber-100'   },
  remove: { sign: '−', cls: 'text-rose-700   bg-rose-100'    },
};

function SectionDiff({ change, ci, cardId, cardAcc, onToggleEdit }) {
  const tone = KIND_TONE[change?.kind] || { sign: '•', cls: 'text-slate-600 bg-slate-100' };
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5 min-w-0">
        <span className={`w-4 h-4 rounded grid place-items-center text-[11px] font-bold leading-none shrink-0 ${tone.cls}`}>
          {tone.sign}
        </span>
        <span className="text-xs font-semibold text-slate-700 truncate">{change?.label}</span>
      </div>
      <div className="space-y-1 pl-0.5">
        {change?.edits?.map((e, ei) => (
          <EditRow
            key={ei}
            edit={e}
            editKey={`${ci}:${ei}`}
            cardId={cardId}
            accepted={!!cardAcc[`${ci}:${ei}`]}
            onToggle={onToggleEdit}
          />
        ))}
      </div>
    </div>
  );
}

// One edit row: a labeled checkbox with before/after diff content.
function EditRow({ edit, editKey, cardId, accepted, onToggle }) {
  const ctx = [edit?.where, edit?.field].filter(Boolean).join(' · ');
  return (
    <label className={`flex items-start gap-2.5 rounded-lg px-2 py-1.5 cursor-pointer transition ${
      accepted ? 'bg-white hover:bg-slate-50/80' : 'bg-slate-50/30 opacity-55 hover:opacity-75'
    }`}>
      <input
        type="checkbox"
        checked={accepted}
        onChange={() => onToggle(cardId, editKey)}
        className="mt-0.5 shrink-0 w-3.5 h-3.5 cursor-pointer rounded accent-[#3b6df6]"
      />
      <div className="flex-1 min-w-0 text-xs">
        {ctx && <div className="text-[11px] font-medium text-slate-400 mb-0.5">{ctx}</div>}
        {edit?.before && (
          <div className="rounded bg-rose-50 text-rose-700 px-2 py-1 flex gap-1.5">
            <span className="select-none font-semibold shrink-0">−</span>
            <span className="whitespace-pre-wrap break-words line-through decoration-rose-300/70">{edit.before}</span>
          </div>
        )}
        {edit?.after && (
          <div className="rounded bg-emerald-50 text-emerald-800 px-2 py-1 mt-1 flex gap-1.5">
            <span className="select-none font-semibold shrink-0">+</span>
            <span className="whitespace-pre-wrap break-words">{edit.after}</span>
          </div>
        )}
      </div>
    </label>
  );
}

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

function Spinner({ small }) {
  const sz = small ? 'w-3 h-3' : 'w-3.5 h-3.5';
  return (
    <svg className={`${sz} animate-spin`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z" />
    </svg>
  );
}

function SparkIcon({ className = 'w-4 h-4 text-brand-600' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M10 1.5a.75.75 0 0 1 .728.568l.622 2.49a4 4 0 0 0 2.892 2.892l2.49.622a.75.75 0 0 1 0 1.456l-2.49.622a4 4 0 0 0-2.892 2.892l-.622 2.49a.75.75 0 0 1-1.456 0l-.622-2.49a4 4 0 0 0-2.892-2.892l-2.49-.622a.75.75 0 0 1 0-1.456l2.49-.622a4 4 0 0 0 2.892-2.892l.622-2.49A.75.75 0 0 1 10 1.5Z" />
    </svg>
  );
}
