import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export default function AtsModal({ settings, resume, localResult, onClose }) {
  const apiKey = settings.apiKeys?.[settings.provider];
  const [jd, setJd] = useState('');
  const [loading, setLoading] = useState(false);
  // Show the deterministic score instantly; enrich with LLM advice when available.
  const [result, setResult] = useState(localResult || null);
  const [error, setError] = useState(null);

  async function run() {
    if (!apiKey) return; // deterministic score already shown; LLM enrichment needs a key
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
      setResult(r);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // Fetch LLM enrichment on open (if a key is set). The score is already visible.
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
          {result && <Results result={result} />}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-3">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
              Getting AI keyword suggestions…
            </div>
          )}

          {/* Optional JD targeting */}
          <div className="mt-5 pt-4 border-t border-slate-100">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Target a specific job (optional)
            </label>
            {!apiKey && (
              <p className="text-[11px] text-amber-600 mt-1">Add an API key in Settings to get AI keyword suggestions tailored to a job.</p>
            )}
            <textarea
              value={jd}
              onChange={e => setJd(e.target.value)}
              rows={3}
              placeholder="Paste a job description to get keyword-tailored ATS advice…"
              className="mt-2 w-full resize-none px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
            <button
              onClick={run}
              disabled={loading || !apiKey}
              className="mt-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              {loading ? 'Scoring…' : jd.trim() ? 'Re-score for this job' : 'Get AI suggestions'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const RING = { Excellent: 'text-emerald-600', Good: 'text-emerald-600', 'Needs work': 'text-amber-600', Poor: 'text-rose-600' };

function Results({ result }) {
  const { score, grade, breakdown = [], issues = [], passed = [], llm } = result;
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
        <Section title="Keywords to consider adding">
          <div className="flex flex-wrap gap-1.5">
            {llm.keywordSuggestions.map((k, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-brand-50 border border-brand-200 text-brand-800">{k}</span>
            ))}
          </div>
        </Section>
      )}

      {llm?.topFixes?.length > 0 && (
        <Section title="Highest-impact changes">
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
