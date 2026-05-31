import { useEffect, useMemo, useState } from 'react';
import { diffResume } from '@resumex/core';
import { api } from '../lib/api.js';
import { baseUrlFor } from '../lib/storage.js';

// Enrichment wizard — owned by task #8.
//
// Props:
//   entry    — the resume entry to enrich (uses entry.resume)
//   settings — app settings (provider/model/apiKeys/baseUrls)
//   onClose()
//   onApply(newResume) — App persists via resumeStore.update(entry.id, { resume })
//
// 3 steps on the .wizard-steps rail:
//   1) Analyze — auto-call api.enrichAnalyze on open; list weak items.
//   2) Answer  — one question per item with an input the user can fill or skip.
//   3) Review  — api.enrichEnhance with only answered items; show a before/after
//      (diffResume(entry.resume, result.resume)) mirroring the suggestion cards,
//      then onApply(result.resume).

const STEPS = [
  { key: 'analyze', label: 'Find weak spots' },
  { key: 'answer', label: 'Answer' },
  { key: 'review', label: 'Review & apply' },
];

export default function EnrichWizard({ entry, settings, onClose, onApply }) {
  const resume = entry?.resume || {};

  // Auth quad — same shape every other panel uses.
  const auth = useMemo(() => ({
    provider: settings?.provider,
    model: settings?.model,
    apiKey: settings?.apiKeys?.[settings?.provider] || '',
    baseUrl: baseUrlFor(settings?.provider, settings),
  }), [settings]);

  const [step, setStep] = useState('analyze');

  // Step 1 — analyze
  const [analyzing, setAnalyzing] = useState(true);
  const [items, setItems] = useState([]);
  const [answers, setAnswers] = useState({}); // id -> answer text
  const [analyzeError, setAnalyzeError] = useState(null);

  // Step 3 — enhance
  const [enhancing, setEnhancing] = useState(false);
  const [result, setResult] = useState(null); // { message, resume, patch }
  const [enhanceError, setEnhanceError] = useState(null);

  // Esc closes the sheet (matches the other modals).
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Kick off analysis as soon as the wizard opens.
  useEffect(() => {
    let alive = true;
    (async () => {
      setAnalyzing(true);
      setAnalyzeError(null);
      try {
        const r = await api.enrichAnalyze({ ...auth, resume });
        if (!alive) return;
        setItems(Array.isArray(r?.items) ? r.items : []);
      } catch (e) {
        if (alive) setAnalyzeError(e.message || 'Analysis failed.');
      } finally {
        if (alive) setAnalyzing(false);
      }
    })();
    return () => { alive = false; };
    // Run once on mount — auth/resume are stable for the life of the wizard.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Items the user actually answered (non-empty) — only these go to /enhance.
  const answered = useMemo(
    () => items.filter((it) => (answers[it.id] || '').trim()),
    [items, answers]
  );

  const diff = useMemo(
    () => (result ? diffResume(resume, result.resume) : []),
    [result, resume]
  );

  async function runEnhance() {
    setStep('review');
    setEnhancing(true);
    setEnhanceError(null);
    setResult(null);
    try {
      const payload = answered.map((it) => ({
        id: it.id,
        where: it.where,
        field: it.field,
        original: it.original,
        question: it.question,
        answer: (answers[it.id] || '').trim(),
      }));
      const r = await api.enrichEnhance({ ...auth, resume, answers: payload });
      setResult(r);
    } catch (e) {
      setEnhanceError(e.message || 'Enhancement failed.');
    } finally {
      setEnhancing(false);
    }
  }

  function retryAnalyze() {
    setStep('analyze');
    setItems([]);
    setAnswers({});
    setAnalyzeError(null);
    setAnalyzing(true);
    api.enrichAnalyze({ ...auth, resume })
      .then((r) => setItems(Array.isArray(r?.items) ? r.items : []))
      .catch((e) => setAnalyzeError(e.message || 'Analysis failed.'))
      .finally(() => setAnalyzing(false));
  }

  return (
    <div className="rx-overlay" onClick={onClose}>
      <div className="rx-sheet rx-sheet-lg p-6" onClick={(e) => e.stopPropagation()}>
        {/* Header + step rail */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="rx-eyebrow mb-1">Strengthen resume</div>
            <h2 className="text-lg font-semibold text-slate-900">
              {entry?.title || 'Enrichment wizard'}
            </h2>
          </div>
          <button
            className="rx-btn rx-btn-ghost rx-btn-sm transition-all duration-200 ease-in-out active:scale-95 shrink-0"
            onClick={onClose}
            aria-label="Close"
          >
            Close
          </button>
        </div>

        <StepRail step={step} hasItems={items.length > 0} />

        <div className="mt-5">
          {step === 'analyze' && (
            <AnalyzeStep
              analyzing={analyzing}
              error={analyzeError}
              items={items}
              onRetry={retryAnalyze}
              onNext={() => setStep('answer')}
              onClose={onClose}
            />
          )}

          {step === 'answer' && (
            <AnswerStep
              items={items}
              answers={answers}
              setAnswers={setAnswers}
              answeredCount={answered.length}
              onBack={() => setStep('analyze')}
              onContinue={runEnhance}
            />
          )}

          {step === 'review' && (
            <ReviewStep
              enhancing={enhancing}
              error={enhanceError}
              result={result}
              diff={diff}
              onBack={() => setStep('answer')}
              onRetry={runEnhance}
              onApply={() => result?.resume && onApply(result.resume)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Step rail ─────────────────────────────────────────────────────────────────
function StepRail({ step, hasItems }) {
  const activeIdx = STEPS.findIndex((s) => s.key === step);
  return (
    <div className="wizard-steps mt-4">
      {STEPS.map((s, i) => {
        const state = i < activeIdx ? 'is-done' : i === activeIdx ? 'is-active' : '';
        return (
          <div key={s.key} className="flex items-center gap-3">
            <div className={`wizard-step transition-all duration-200 ease-in-out ${state}`}>
              <span className="wizard-dot">{i < activeIdx ? '✓' : i + 1}</span>
              <span>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && <span className="text-slate-300">›</span>}
          </div>
        );
      })}
    </div>
  );
}

// ── Step 1: Analyze ───────────────────────────────────────────────────────────
function AnalyzeStep({ analyzing, error, items, onRetry, onNext, onClose }) {
  if (analyzing) {
    return (
      <div className="py-12 flex flex-col items-center text-center gap-3">
        <span className="w-7 h-7 rounded-full border-2 border-slate-200 border-t-brand-500 animate-spin" />
        <div className="text-sm text-slate-500">Scanning your resume for weak bullets…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center">
        <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 inline-block">
          {error}
        </div>
        <div className="mt-4 flex justify-center gap-2">
          <button className="rx-btn rx-btn-ghost transition-all duration-200 ease-in-out active:scale-95" onClick={onClose}>Close</button>
          <button className="rx-btn rx-btn-primary transition-all duration-200 ease-in-out active:scale-95" onClick={onRetry}>Try again</button>
        </div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="py-10 text-center">
        <div className="text-3xl mb-2">✨</div>
        <div className="text-sm font-medium text-slate-700">No weak bullets found.</div>
        <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
          Your resume is already specific and quantified — nothing obvious to strengthen
          right now.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <button className="rx-btn rx-btn-ghost transition-all duration-200 ease-in-out active:scale-95" onClick={onRetry}>Re-scan</button>
          <button className="rx-btn rx-btn-primary transition-all duration-200 ease-in-out active:scale-95" onClick={onClose}>Done</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <p className="text-sm text-slate-500">
        Found <span className="font-semibold text-slate-700">{items.length}</span>{' '}
        {items.length === 1 ? 'line' : 'lines'} worth strengthening. Next, answer a quick
        question for each so they can be rewritten with real specifics.
      </p>
      <div className="mt-4 space-y-2.5 max-h-[46vh] overflow-auto pr-1">
        {items.map((it) => (
          <div key={it.id} className="rounded-lg bg-slate-50 border border-slate-200/70 px-3.5 py-3">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {[sectionLabel(it.section), it.where].filter(Boolean).join(' · ')}
              </span>
              {it.weakness && <span className="chip chip-miss">{it.weakness}</span>}
            </div>
            <div className="text-sm text-slate-700 whitespace-pre-wrap break-words">
              {it.original || <span className="text-slate-400 italic">(no text)</span>}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button className="rx-btn rx-btn-ghost transition-all duration-200 ease-in-out active:scale-95" onClick={onClose}>Cancel</button>
        <button className="rx-btn rx-btn-primary transition-all duration-200 ease-in-out active:scale-95" onClick={onNext}>
          Answer questions ({items.length})
        </button>
      </div>
    </>
  );
}

// ── Step 2: Answer ────────────────────────────────────────────────────────────
function AnswerStep({ items, answers, setAnswers, answeredCount, onBack, onContinue }) {
  const setAnswer = (id, val) => setAnswers((prev) => ({ ...prev, [id]: val }));

  return (
    <>
      <p className="text-sm text-slate-500">
        Answer what you can — skip anything you&apos;re unsure about. Only answered questions are
        rewritten; we never invent numbers.
      </p>
      <div className="mt-4 space-y-3 max-h-[46vh] overflow-auto pr-1">
        {items.map((it) => {
          const val = answers[it.id] || '';
          const done = !!val.trim();
          return (
            <div
              key={it.id}
              className={`rounded-lg border px-3.5 py-3 transition ${
                done ? 'border-brand-200 bg-brand-50/40' : 'border-slate-200/70 bg-white'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {[sectionLabel(it.section), it.where].filter(Boolean).join(' · ')}
                </span>
                {done
                  ? <span className="chip chip-match">Answered</span>
                  : <span className="chip chip-neutral">Optional</span>}
              </div>

              {it.original && (
                <div className="mt-1.5 text-xs text-slate-500 whitespace-pre-wrap break-words border-l-2 border-slate-200 pl-2">
                  {it.original}
                </div>
              )}

              <div className="mt-2 text-sm font-medium text-slate-800">{it.question}</div>
              <textarea
                className="field mt-1.5 resize-none"
                rows={2}
                placeholder="Your answer (e.g. numbers, scope, tools)…"
                value={val}
                onChange={(e) => setAnswer(it.id, e.target.value)}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex items-center justify-between gap-2">
        <button className="rx-btn rx-btn-ghost transition-all duration-200 ease-in-out active:scale-95" onClick={onBack}>Back</button>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">
            {answeredCount} of {items.length} answered
          </span>
          <button
            className="rx-btn rx-btn-primary transition-all duration-200 ease-in-out active:scale-95 disabled:active:scale-100"
            onClick={onContinue}
            disabled={answeredCount === 0}
            title={answeredCount === 0 ? 'Answer at least one question to continue' : undefined}
          >
            Rewrite {answeredCount > 0 ? `(${answeredCount})` : ''}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Step 3: Review & apply ────────────────────────────────────────────────────
function ReviewStep({ enhancing, error, result, diff, onBack, onRetry, onApply }) {
  if (enhancing) {
    return (
      <div className="py-12 flex flex-col items-center text-center gap-3">
        <span className="w-7 h-7 rounded-full border-2 border-slate-200 border-t-brand-500 animate-spin" />
        <div className="text-sm text-slate-500">Rewriting your bullets with the new details…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center">
        <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 inline-block">
          {error}
        </div>
        <div className="mt-4 flex justify-center gap-2">
          <button className="rx-btn rx-btn-ghost transition-all duration-200 ease-in-out active:scale-95" onClick={onBack}>Back</button>
          <button className="rx-btn rx-btn-primary transition-all duration-200 ease-in-out active:scale-95" onClick={onRetry}>Try again</button>
        </div>
      </div>
    );
  }

  const hasChanges = diff.length > 0;

  return (
    <>
      {result?.message && (
        <p className="text-sm text-slate-600 bg-slate-50 border border-slate-200/70 rounded-lg px-3.5 py-2.5">
          {result.message}
        </p>
      )}

      {!hasChanges ? (
        <div className="mt-4 py-8 text-center text-sm text-slate-500">
          No changes were produced from your answers. You can go back and add more detail.
        </div>
      ) : (
        <div className="mt-4 space-y-4 max-h-[46vh] overflow-auto pr-1">
          {diff.map((change, i) => (
            <SectionDiff key={`${change.key}-${i}`} change={change} />
          ))}
        </div>
      )}

      <div className="mt-5 flex items-center justify-between gap-2">
        <button className="rx-btn rx-btn-ghost transition-all duration-200 ease-in-out active:scale-95" onClick={onBack}>Back</button>
        <button
          className="rx-btn rx-btn-primary transition-all duration-200 ease-in-out active:scale-95 disabled:active:scale-100"
          onClick={onApply}
          disabled={!hasChanges}
        >
          Apply changes
        </button>
      </div>
    </>
  );
}

// ── Before/after diff rendering (mirrors the suggestion-card look) ─────────────
const KIND_TONE = {
  add: { sign: '+', cls: 'text-emerald-700 bg-emerald-100' },
  revise: { sign: '~', cls: 'text-amber-700 bg-amber-100' },
  remove: { sign: '−', cls: 'text-rose-700 bg-rose-100' },
};

function SectionDiff({ change }) {
  const tone = KIND_TONE[change?.kind] || { sign: '•', cls: 'text-slate-600 bg-slate-100' };
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5 min-w-0">
        <span className={`w-4 h-4 rounded grid place-items-center text-[11px] font-bold leading-none shrink-0 ${tone.cls}`}>
          {tone.sign}
        </span>
        <span className="text-xs font-semibold text-slate-600">{change.label}</span>
      </div>
      <div className="space-y-2.5 pl-5">
        {change.edits.map((edit, i) => <EditRow key={i} edit={edit} />)}
      </div>
    </div>
  );
}

function EditRow({ edit }) {
  const ctx = [edit?.where, edit?.field].filter(Boolean).join(' · ');
  return (
    <div className="text-xs">
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
  );
}

// ── helpers ───────────────────────────────────────────────────────────────────
const SECTION_LABELS = {
  experience: 'Experience',
  projects: 'Projects',
  summary: 'Summary',
  education: 'Education',
};
function sectionLabel(s) {
  return SECTION_LABELS[s] || (s ? s[0].toUpperCase() + s.slice(1) : '');
}
