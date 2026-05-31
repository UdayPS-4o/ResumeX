import { useState } from 'react';
import { api } from '../lib/api.js';

export default function JobMatchModal({ settings, resume, onClose, onApply }) {
  const [jd, setJd] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function analyze() {
    if (!jd.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await api.jobMatch({
        provider: settings.provider,
        model: settings.model,
        apiKey: settings.apiKeys[settings.provider],
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

  function applyRewrittenSummary() {
    if (result?.rewrittenSummary) onApply({ summary: result.rewrittenSummary });
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm grid place-items-center p-4 slide-up">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[88vh] flex flex-col border border-slate-200">
        <header className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">Match against a job description</h2>
            <p className="text-[11px] text-slate-500">Paste the JD and get a fit score plus tailored suggestions.</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 grid place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700">✕</button>
        </header>

        <div className="grid grid-cols-2 gap-0 flex-1 min-h-0">
          <div className="border-r border-slate-100 p-4 flex flex-col min-h-0">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Job description</label>
            <textarea
              value={jd}
              onChange={e => setJd(e.target.value)}
              placeholder="Paste the full job description here…"
              className="flex-1 resize-none px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
            <button
              onClick={analyze}
              disabled={!jd.trim() || loading}
              className="mt-3 w-full py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition disabled:bg-slate-300"
            >
              {loading ? 'Analyzing…' : 'Analyze fit'}
            </button>
          </div>

          <div className="p-4 overflow-y-auto min-h-0">
            {!result && !error && !loading && (
              <div className="h-full grid place-items-center text-center text-sm text-slate-400 px-6">
                Paste a job description and click <em>Analyze fit</em> to see the match.
              </div>
            )}
            {error && (
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-rose-700">{error}</div>
            )}
            {result && <Result result={result} onApplySummary={applyRewrittenSummary} />}
          </div>
        </div>
      </div>
    </div>
  );
}

const TONE_STYLES = {
  good: { wrap: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
  ok:   { wrap: 'bg-amber-50 border-amber-200',     text: 'text-amber-700' },
  poor: { wrap: 'bg-rose-50 border-rose-200',       text: 'text-rose-700' },
};

function Result({ result, onApplySummary }) {
  const score = Math.max(0, Math.min(100, Number(result.score) || 0));
  const tone = TONE_STYLES[score >= 75 ? 'good' : score >= 50 ? 'ok' : 'poor'];

  return (
    <div className="space-y-4">
      <div className={`rounded-xl border p-3 ${tone.wrap}`}>
        <div className="flex items-baseline gap-3">
          <div className={`text-3xl font-bold ${tone.text}`}>{score}</div>
          <div className="text-sm font-medium text-slate-700">fit score</div>
        </div>
        {result.scoreReason && (
          <div className="text-xs text-slate-600 mt-1">{result.scoreReason}</div>
        )}
      </div>

      {result.strengths?.length > 0 && (
        <Section title="Strengths">
          <ul className="space-y-1 text-sm text-slate-700">
            {result.strengths.map((s, i) => <li key={i} className="flex gap-2"><Check /><span>{s}</span></li>)}
          </ul>
        </Section>
      )}

      {result.missingKeywords?.length > 0 && (
        <Section title="Keywords to add">
          <div className="flex flex-wrap gap-1.5">
            {result.missingKeywords.map((k, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800">{k}</span>
            ))}
          </div>
        </Section>
      )}

      {result.suggestions?.length > 0 && (
        <Section title="Suggested changes">
          <ul className="space-y-2 text-sm text-slate-700">
            {result.suggestions.map((s, i) => (
              <li key={i} className="border border-slate-200 rounded-lg p-2.5">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-slate-500">
                  <span className="px-1.5 py-0.5 rounded bg-slate-100">{s.section}</span>
                  {s.target && <span className="truncate">{s.target}</span>}
                </div>
                <div className="text-sm text-slate-700 mt-1">{s.change}</div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {result.rewrittenSummary && (
        <Section title="Tailored summary">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm italic text-slate-700">
            {result.rewrittenSummary}
          </div>
          <button
            onClick={onApplySummary}
            className="mt-2 text-xs px-3 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition"
          >
            Apply to resume
          </button>
        </Section>
      )}
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

function Check() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0">
      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
    </svg>
  );
}
