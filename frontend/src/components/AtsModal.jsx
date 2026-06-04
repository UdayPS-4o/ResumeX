import { useEffect, useMemo, useState } from 'react';
import { runAtsChecks } from '@resumex/ats';
import { api } from '../lib/api.js';

export default function AtsModal({ settings, resume, onClose }) {
  const apiKey = settings.apiKeys?.[settings.provider];
  const [jd, setJd] = useState('');
  const [loading, setLoading] = useState(false);
  const [llm, setLlm] = useState(null);   // optional LLM enrichment, layered on top
  const [error, setError] = useState(null);

  // Deterministic score + keyword match, recomputed instantly as the JD changes.
  // No API key needed — this is the authoritative, offline ATS analysis.
  const det = useMemo(() => runAtsChecks(resume, { jobDescription: jd }), [resume, jd]);
  const result = useMemo(() => ({ ...det, llm }), [det, llm]);

  async function run() {
    if (!apiKey) return; // deterministic score already shown; only LLM advice needs a key
    setLoading(true);
    setError(null);
    try {
      const r = await api.atsScore({
        provider: settings.provider,
        model: settings.model,
        apiKey,
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

  // Fetch optional LLM enrichment on open (if a key is set). Score is already visible.
  useEffect(() => { run(); /* eslint-disable-line */ }, []);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm grid place-items-center p-4 slide-up">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[88vh] flex flex-col border border-slate-200">
        <header className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">ATS compatibility score</h2>
            <p className="text-[11px] text-slate-500">How well automated screeners will parse and match your resume.</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 grid place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700">✕</button>
        </header>

        <div className="p-5 overflow-y-auto">
          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-rose-700 mb-3">{error}</div>
          )}
          <Results result={result} />
          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-3">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
              Getting AI keyword suggestions…
            </div>
          )}

          {/* JD targeting — drives the deterministic keyword match (no key needed). */}
          <div className="mt-5 pt-4 border-t border-slate-100">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Target a specific job
            </label>
            <p className="text-[11px] text-slate-500 mt-1">
              Paste a job description to score keyword match instantly — free, no API key.
              {!apiKey && ' Add a key in Settings for AI reframing tips on top.'}
            </p>
            <textarea
              value={jd}
              onChange={e => setJd(e.target.value)}
              rows={3}
              placeholder="Paste a job description to see which keywords you're missing…"
              className="mt-2 w-full resize-none px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
            {apiKey && (
              <button
                onClick={run}
                disabled={loading}
                className="mt-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                {loading ? 'Scoring…' : 'Get AI suggestions'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const RING = { Excellent: 'text-emerald-600', Good: 'text-emerald-600', 'Needs work': 'text-amber-600', Poor: 'text-rose-600' };

function Results({ result }) {
  const { score, grade, breakdown = [], issues = [], passed = [], keywords, llm } = result;
  return (
    <div className="space-y-5">
      {/* Score header */}
      <div className="flex items-center gap-5">
        <Gauge score={score} />
        <div>
          <div className={`text-lg font-bold ${RING[grade] || 'text-slate-700'}`}>{grade}</div>
          <div className="text-sm text-slate-500">{score}/100 ATS readiness</div>
          {llm?.verdict && <div className="text-xs text-slate-600 mt-1 max-w-sm">{llm.verdict}</div>}
        </div>
      </div>

      {/* Keyword match vs. the job description (deterministic) */}
      {keywords && <KeywordMatch keywords={keywords} />}

      {/* Breakdown bars */}
      <div className="space-y-2">
        {breakdown.map((b, i) => {
          const pct = b.max ? (b.score / b.max) * 100 : 0;
          const tone = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500';
          return (
            <div key={i}>
              <div className="flex justify-between text-xs text-slate-600 mb-0.5">
                <span>{b.category}</span>
                <span className="tabular-nums text-slate-400">{b.score}/{b.max}</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${tone} rounded-full transition-all`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Issues */}
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

      {/* LLM keyword suggestions */}
      {llm?.keywordSuggestions?.length > 0 && (
        <Section title="AI: keywords to consider adding">
          <div className="flex flex-wrap gap-1.5">
            {llm.keywordSuggestions.map((k, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-brand-50 border border-brand-200 text-brand-800">{k}</span>
            ))}
          </div>
        </Section>
      )}

      {llm?.topFixes?.length > 0 && (
        <Section title="AI: highest-impact changes">
          <ul className="space-y-1 text-sm text-slate-700 list-disc pl-5">
            {llm.topFixes.map((f, i) => <li key={i}>{f}</li>)}
          </ul>
        </Section>
      )}

      {/* Passed */}
      {passed.length > 0 && (
        <Section title="Looking good">
          <ul className="space-y-1">
            {passed.map((p, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-600">
                <Check /><span>{p}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function KeywordMatch({ keywords }) {
  const { percent, matched = [], missing = [], missingSkills = [] } = keywords;
  const tone = percent >= 70 ? 'text-emerald-600' : percent >= 45 ? 'text-amber-600' : 'text-rose-600';
  return (
    <Section title="Job description keyword match">
      <div className="rounded-xl border border-slate-200 p-3.5 space-y-3">
        <div className="flex items-baseline gap-2">
          <span className={`text-2xl font-bold tabular-nums ${tone}`}>{percent}%</span>
          <span className="text-xs text-slate-500">{matched.length} of {matched.length + missing.length} keywords found</span>
        </div>
        {missing.length > 0 ? (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Missing — add these {missingSkills.length > 0 && '(skills first)'}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {missing.slice(0, 24).map((k, i) => (
                <span key={i} className={`text-xs px-2 py-0.5 rounded-full border ${i < missingSkills.length ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>{k}</span>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-sm text-emerald-700">Every keyword from the job description appears in your resume. 🎯</div>
        )}
        {matched.length > 0 && (
          <details className="group">
            <summary className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 cursor-pointer hover:text-slate-600 select-none">
              {matched.length} matched
            </summary>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {matched.slice(0, 30).map((k, i) => (
                <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">{k}</span>
              ))}
            </div>
          </details>
        )}
      </div>
    </Section>
  );
}

function Gauge({ score }) {
  const r = 30, c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const tone = score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : '#f43f5e';
  return (
    <div className="relative w-20 h-20 shrink-0">
      <svg viewBox="0 0 80 80" className="w-20 h-20 -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle cx="40" cy="40" r={r} fill="none" stroke={tone} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} className="transition-all duration-500" />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="text-xl font-bold text-slate-800 tabular-nums">{score}</span>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section>
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">{title}</h3>
      {children}
    </section>
  );
}

function Dot({ severity }) {
  const color = severity === 'high' ? 'bg-rose-500' : severity === 'medium' ? 'bg-amber-500' : 'bg-slate-400';
  return <span className={`w-1.5 h-1.5 rounded-full ${color} mt-1.5 shrink-0`} />;
}

function Check() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0">
      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
    </svg>
  );
}
