import { useEffect, useMemo, useState } from 'react';
import { runAtsChecks, matchKeywords, resumeToText } from '@resumex/ats';
import { api } from '../lib/api.js';
import { baseUrlFor, providerReady } from '../lib/storage.js';
import { segmentByKeywords, highlightTokens, ringColor, ratioColor } from './ats/highlight.js';

// ATS analysis modal. The deterministic score + keyword match are recomputed
// instantly (offline, no key) as the JD changes; optional LLM advice is layered
// on top via api.atsScore when a key is present.
//
// Opened/closed by the Editor as `<AtsModal settings resume onClose />` — those
// three props are the contract and must not change. `jobDescription` / `entry`
// are accepted defensively (undefined today) so a future Editor can prefill the
// JD without any change here.
export default function AtsModal({ settings, resume, onClose, jobDescription, entry }) {
  const hasKey = providerReady(settings); // keys live server-side; gate on presence
  const baseUrl = baseUrlFor(settings?.provider, settings);

  const prefillJd = jobDescription || entry?.job?.description || '';
  const [jdInput, setJdInput] = useState(prefillJd);
  const [jd, setJd] = useState(prefillJd); // debounced value that actually drives scoring
  const [showHighlight, setShowHighlight] = useState(false);
  const [loading, setLoading] = useState(false);
  const [llm, setLlm] = useState(null);   // optional LLM enrichment, layered on top
  const [error, setError] = useState(null);

  // Light debounce: typing in the JD textarea shouldn't recompute on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => setJd(jdInput), 180);
    return () => clearTimeout(id);
  }, [jdInput]);

  // Deterministic, authoritative ATS analysis — instant, offline, no API key.
  const det = useMemo(() => runAtsChecks(resume, { jobDescription: jd }), [resume, jd]);
  const keywords = useMemo(
    () => (jd.trim() ? matchKeywords(resume, jd) : null),
    [resume, jd]
  );

  // Esc to close — matches the previous modal's expectation that onClose drives dismissal.
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function run() {
    if (!hasKey) return; // deterministic score already shown; only LLM advice needs a key
    setLoading(true);
    setError(null);
    try {
      const r = await api.atsScore({
        provider: settings.provider,
        model: settings.model,
        apiKey: '', // server injects the stored key
        baseUrl,
        resume,
        jobDescription: jd,
      });
      setLlm(r.llm && !r.llm.error ? r.llm : null);
      if (r.llm?.error) setError(`AI suggestions unavailable: ${r.llm.error}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const { score, grade, breakdown = [], issues = [], passed = [] } = det;

  return (
    <div className="rx-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rx-sheet rx-sheet-lg flex flex-col">
        {/* Header */}
        <header className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <div className="rx-eyebrow">ATS analysis</div>
            <h2 className="font-bold text-slate-900 text-lg leading-tight">Compatibility score</h2>
            <p className="text-xs text-slate-500 mt-0.5">How well automated screeners parse and rank your resume.</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all duration-200 ease-in-out active:scale-95"
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        <div className="px-6 py-5 space-y-6">
          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm text-rose-700">{error}</div>
          )}

          {/* Score + category breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-[auto,1fr] gap-6 items-center">
            <ScoreRing score={score} grade={grade} verdict={llm?.verdict} />
            <Breakdown breakdown={breakdown} />
          </div>

          {/* JD targeting */}
          <section>
            <div className="flex items-center justify-between gap-3 mb-2">
              <div>
                <div className="rx-eyebrow">Target a specific job</div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Paste a job description to score keyword match instantly — free, no API key.
                  {!hasKey && ' Add a key in Settings for AI reframing tips on top.'}
                </p>
              </div>
              {jd.trim() && (
                <button
                  onClick={() => setShowHighlight(v => !v)}
                  className={`rx-btn rx-btn-sm shrink-0 transition-all duration-200 ease-in-out active:scale-95 ${showHighlight ? 'rx-btn-soft' : 'rx-btn-ghost'}`}
                  aria-pressed={showHighlight}
                >
                  {showHighlight ? 'Hide highlights' : 'Highlight matches'}
                </button>
              )}
            </div>
            <textarea
              value={jdInput}
              onChange={e => setJdInput(e.target.value)}
              rows={3}
              placeholder="Paste a job description to see which keywords you're missing…"
              className="field resize-none"
              style={{ minHeight: '5rem' }}
            />
          </section>

          {/* Keyword match vs. the JD (deterministic) */}
          {keywords && <KeywordMatch keywords={keywords} />}

          {/* Inline highlight view */}
          {keywords && showHighlight && (
            <HighlightView resume={resume} matched={keywords.matched} />
          )}

          {/* AI suggestions (optional, layered on top) */}
          <AiSuggestions
            hasKey={hasKey}
            loading={loading}
            llm={llm}
            onRun={run}
          />

          {/* Issues + passed */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {issues.length > 0 && (
              <Section title={`Fix these (${issues.length})`}>
                <ul className="space-y-1.5">
                  {issues.map((it, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-700">
                      <Dot severity={it.severity} />
                      <span>{it.text}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
            {passed.length > 0 && (
              <Section title="Looking good">
                <ul className="space-y-1.5">
                  {passed.map((p, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-600">
                      <Check /><span>{p}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Score ring ───────────────────────────────────────────────────────────────
function ScoreRing({ score, grade, verdict }) {
  return (
    <div className="flex flex-col items-center gap-2 shrink-0">
      <div className="score-ring" style={{ '--p': Math.max(0, Math.min(100, score)), '--ring': ringColor(score) }}>
        <div className="text-center">
          <div className="text-2xl font-extrabold text-slate-900 tabular-nums leading-none">{score}</div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mt-0.5">/ 100</div>
        </div>
      </div>
      <div className="text-sm font-bold" style={{ color: ringColor(score) }}>{grade}</div>
      {verdict && <p className="text-xs text-slate-600 text-center max-w-[12rem] leading-snug">{verdict}</p>}
    </div>
  );
}

// ── Category breakdown ───────────────────────────────────────────────────────
function Breakdown({ breakdown }) {
  return (
    <div className="space-y-2.5 w-full">
      {breakdown.map((b, i) => {
        const ratio = b.max ? b.score / b.max : 0;
        const color = ratioColor(ratio);
        return (
          <div key={i}>
            <div className="flex justify-between items-baseline text-xs mb-1">
              <span className="text-slate-600 font-medium">{b.category}</span>
              <span className="tabular-nums text-slate-400">{b.score}/{b.max}</span>
            </div>
            <div className="meter">
              <span style={{ width: `${ratio * 100}%`, background: color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Keyword match (chips + percent) ──────────────────────────────────────────
function KeywordMatch({ keywords }) {
  const {
    percent = 0,
    matched = [], missing = [],
    matchedSkills = [], missingSkills = [],
    matchedTerms = [], missingTerms = [],
  } = keywords;
  const total = matched.length + missing.length;
  const tone = percent >= 70 ? '#16a34a' : percent >= 45 ? '#f59e0b' : '#ef4444';

  // Prefer skills-first ordering when the split lists are available.
  const missingOrdered = missingSkills.length || missingTerms.length ? [...missingSkills, ...missingTerms] : missing;
  const matchedOrdered = matchedSkills.length || matchedTerms.length ? [...matchedSkills, ...matchedTerms] : matched;

  return (
    <Section title="Job description keyword match">
      <div className="rounded-xl border border-slate-200 p-4 space-y-3.5">
        <div className="flex items-center gap-3">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold tabular-nums" style={{ color: tone }}>{percent}%</span>
            <span className="text-xs text-slate-500">{matched.length} of {total} keywords found</span>
          </div>
          <div className="flex-1 meter">
            <span style={{ width: `${percent}%`, background: tone }} />
          </div>
        </div>

        {missingOrdered.length > 0 ? (
          <div>
            <div className="rx-eyebrow mb-1.5">
              Missing — add these {missingSkills.length > 0 && '(skills first)'}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {missingOrdered.slice(0, 30).map((k, i) => (
                <span key={i} className="chip chip-miss">{k}</span>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-sm text-emerald-700">Every keyword from the job description appears in your resume.</div>
        )}

        {matchedOrdered.length > 0 && (
          <details className="group">
            <summary className="rx-eyebrow cursor-pointer hover:text-slate-600 select-none list-none transition-colors duration-200 ease-in-out active:scale-97">
              {matchedOrdered.length} matched ▾
            </summary>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {matchedOrdered.slice(0, 40).map((k, i) => (
                <span key={i} className="chip chip-match">{k}</span>
              ))}
            </div>
          </details>
        )}
      </div>
    </Section>
  );
}

// ── Inline highlight view ────────────────────────────────────────────────────
// Renders the resume-as-text with matched keywords wrapped in <mark class="kw-hit">.
function HighlightView({ resume, matched }) {
  const segments = useMemo(() => {
    const text = resumeToText(resume);
    const tokens = highlightTokens(matched);
    return segmentByKeywords(text, tokens);
  }, [resume, matched]);

  return (
    <Section title="Resume text — matched keywords highlighted">
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap max-h-72 overflow-auto">
        {segments.map((s, i) =>
          s.isMatch ? <mark key={i} className="kw-hit">{s.text}</mark> : <span key={i}>{s.text}</span>
        )}
      </div>
    </Section>
  );
}

// ── AI suggestions (optional LLM enrichment) ─────────────────────────────────
function AiSuggestions({ hasKey, loading, llm, onRun }) {
  const hasContent = llm?.keywordSuggestions?.length > 0 || llm?.topFixes?.length > 0;
  return (
    <section className="rounded-xl border border-slate-200 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="rx-eyebrow">AI suggestions</div>
          <p className="text-xs text-slate-500 mt-0.5">
            {hasKey
              ? 'Keyword and phrasing ideas from your model, on top of the deterministic score.'
              : 'Add an API key in Settings to get AI reframing tips.'}
          </p>
        </div>
        {hasKey && (
          <button onClick={onRun} disabled={loading} className="rx-btn rx-btn-primary rx-btn-sm shrink-0 transition-all duration-200 ease-in-out active:scale-95 disabled:active:scale-100">
            {loading ? 'Scoring…' : hasContent ? 'Refresh AI tips' : 'Get AI suggestions'}
          </button>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
          Getting AI keyword suggestions…
        </div>
      )}

      {llm?.keywordSuggestions?.length > 0 && (
        <div>
          <div className="rx-eyebrow mb-1.5">Keywords to consider adding</div>
          <div className="flex flex-wrap gap-1.5">
            {llm.keywordSuggestions.map((k, i) => (
              <span key={i} className="chip chip-brand">{k}</span>
            ))}
          </div>
        </div>
      )}

      {llm?.topFixes?.length > 0 && (
        <div>
          <div className="rx-eyebrow mb-1.5">Highest-impact changes</div>
          <ul className="space-y-1 text-sm text-slate-700 list-disc pl-5">
            {llm.topFixes.map((f, i) => <li key={i}>{f}</li>)}
          </ul>
        </div>
      )}
    </section>
  );
}

// ── Small shared bits ────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <section>
      <h3 className="rx-eyebrow mb-2">{title}</h3>
      {children}
    </section>
  );
}

function Dot({ severity }) {
  const color = severity === 'high' ? '#ef4444' : severity === 'medium' ? '#f59e0b' : '#94a3b8';
  return <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: color }} />;
}

function Check() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0">
      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
    </svg>
  );
}
