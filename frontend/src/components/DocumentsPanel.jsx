// Cover-letter & outreach generators (task #6).
//
// Props:
//   entry    — the resume entry (has .resume, .job, .documents)
//   settings — app settings (provider/model/apiKeys/baseUrls/features/language)
//   onClose()
//   onSave(docs) — App persists via resumeStore.setDocuments(entry.id, docs);
//                  docs is { coverLetter?, outreach? }
//
// The cover-letter PDF download posts directly to /api/documents/cover-letter/pdf
// (a plain fetch, NOT api.js) so we can stream the PDF blob and trigger a download.

import { useMemo, useState } from 'react';
import { api } from '../lib/api.js';
import { baseUrlFor, providerReady } from '../lib/storage.js';

const COVER_TONES = [
  { id: 'professional', label: 'Professional' },
  { id: 'warm', label: 'Warm' },
  { id: 'direct', label: 'Direct' },
];

const CHANNELS = [
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'email', label: 'Email' },
];

// A friendly, locale-aware date string for the letter (e.g. "June 5, 2026").
function formattedToday() {
  try {
    return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return '';
  }
}

export default function DocumentsPanel({ entry, settings, onClose, onSave }) {
  // Auth quad — the four bits every generator call needs.
  const auth = useMemo(() => ({
    provider: settings.provider,
    model: settings.model,
    apiKey: settings.apiKeys?.[settings.provider] || '',
    baseUrl: baseUrlFor(settings.provider, settings),
  }), [settings]);
  const language = settings.language || 'en';
  const features = settings.features || {};
  const hasKey = providerReady(settings); // keyless providers (ollama, …) count as ready

  // Which generators are enabled. If a feature is toggled off it's hidden entirely.
  const tabs = [
    features.coverLetter !== false && { id: 'cover', label: 'Cover letter' },
    features.outreach !== false && { id: 'outreach', label: 'Outreach' },
  ].filter(Boolean);

  const [tab, setTab] = useState(tabs[0]?.id || 'cover');
  // The effective tab — falls back to the first enabled one if `tab` got disabled.
  const activeTab = tabs.some((t) => t.id === tab) ? tab : tabs[0]?.id;

  return (
    <div className="rx-overlay" onClick={onClose}>
      <div className="rx-sheet rx-sheet-md" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-start justify-between gap-4 border-b border-slate-100">
          <div>
            <div className="rx-eyebrow mb-1">Documents</div>
            <h2 className="text-lg font-semibold text-slate-900">Cover letter & outreach</h2>
            <p className="text-slate-500 text-sm mt-1">
              Generated from <span className="font-medium text-slate-700">{entry?.title || 'this resume'}</span>
              {entry?.job?.company ? ` · ${entry.job.company}` : ''}.
            </p>
          </div>
          <button
            className="w-8 h-8 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all duration-200 ease-in-out active:scale-95"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5">
          {/* Tabs */}
          {tabs.length > 1 && (
            <div className="seg mb-5" role="tablist">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  className="seg-btn transition-all duration-200 ease-in-out active:scale-95"
                  aria-pressed={activeTab === t.id}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {!hasKey && (
            <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
              Add an API key for {auth.provider} in Settings to generate documents.
            </div>
          )}

          {tabs.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">
              Both generators are turned off. Enable them in Settings to write a cover letter or outreach message.
            </p>
          ) : activeTab === 'outreach' ? (
            <OutreachTab entry={entry} auth={auth} language={language} hasKey={hasKey} onSave={onSave} />
          ) : (
            <CoverLetterTab entry={entry} auth={auth} language={language} hasKey={hasKey} onSave={onSave} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Cover letter ──────────────────────────────────────────────────────────────

function CoverLetterTab({ entry, auth, language, hasKey, onSave }) {
  const [jd, setJd] = useState(entry?.job?.description || '');
  const [tone, setTone] = useState('professional');
  const [text, setText] = useState(entry?.documents?.coverLetter || '');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const { text: out } = await api.coverLetter({
        ...auth,
        resume: entry.resume,
        jobDescription: jd,
        job: entry.job || null,
        language,
        tone,
      });
      setText(out || '');
      setSaved(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function save() {
    onSave({ coverLetter: text });
    setSaved(true);
  }

  // Direct fetch (NOT api.js) so we can pull the PDF blob and download it.
  async function downloadPdf() {
    setDownloading(true);
    setError(null);
    try {
      const resp = await fetch('/api/documents/cover-letter/pdf', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          resume: entry.resume,
          body: text,
          date: formattedToday(),
        }),
      });
      if (!resp.ok) {
        let detail = resp.statusText;
        try { detail = (await resp.json()).error || detail; } catch { /* keep statusText */ }
        throw new Error(`${resp.status} ${detail}`);
      }
      const blob = await resp.blob();
      triggerDownload(blob, fileNameFor(entry, 'cover-letter'));
    } catch (e) {
      setError(e.message);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div>
      {/* Job description (optional) */}
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
        Job description <span className="font-normal normal-case text-slate-400">— optional, sharpens the letter</span>
      </label>
      <textarea
        className="field resize-none"
        rows={4}
        value={jd}
        onChange={(e) => setJd(e.target.value)}
        placeholder="Paste the job description to tailor the letter to its specific needs…"
      />

      {/* Tone + generate */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Tone</span>
          <div className="seg">
            {COVER_TONES.map((t) => (
              <button key={t.id} className="seg-btn transition-all duration-200 ease-in-out active:scale-95" aria-pressed={tone === t.id} onClick={() => setTone(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <button className="rx-btn rx-btn-primary transition-all duration-200 ease-in-out active:scale-95 disabled:active:scale-100" onClick={generate} disabled={loading || !hasKey}>
          {loading ? <Spinner label={text ? 'Regenerating…' : 'Writing…'} /> : (text ? 'Regenerate' : 'Generate')}
        </button>
      </div>

      {error && <ErrorBar message={error} />}

      {/* Editable result */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cover letter</label>
          <CharCount value={text} />
        </div>
        <textarea
          className="field resize-y font-[450] leading-relaxed"
          rows={12}
          value={text}
          onChange={(e) => { setText(e.target.value); setSaved(false); }}
          placeholder={loading ? '' : 'Your cover letter will appear here. Generate one above, or write your own — you can edit freely before saving or downloading.'}
        />
      </div>

      {/* Actions */}
      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        <button className="rx-btn rx-btn-ghost transition-all duration-200 ease-in-out active:scale-95 disabled:active:scale-100" onClick={downloadPdf} disabled={!text.trim() || downloading}>
          {downloading ? <Spinner label="Building PDF…" /> : 'Download PDF'}
        </button>
        <button className="rx-btn rx-btn-soft transition-all duration-200 ease-in-out active:scale-95 disabled:active:scale-100" onClick={save} disabled={!text.trim()}>
          {saved ? 'Saved ✓' : 'Save'}
        </button>
      </div>
    </div>
  );
}

// ── Outreach ──────────────────────────────────────────────────────────────────

function OutreachTab({ entry, auth, language, hasKey, onSave }) {
  const [channel, setChannel] = useState('linkedin');
  const [text, setText] = useState(entry?.documents?.outreach || '');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const { text: out } = await api.outreach({
        ...auth,
        resume: entry.resume,
        jobDescription: entry?.job?.description || '',
        job: entry.job || null,
        language,
        channel,
      });
      setText(out || '');
      setSaved(false);
      setCopied(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function save() {
    onSave({ outreach: text });
    setSaved(true);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('Could not copy to clipboard.');
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Channel</span>
          <div className="seg">
            {CHANNELS.map((c) => (
              <button key={c.id} className="seg-btn transition-all duration-200 ease-in-out active:scale-95" aria-pressed={channel === c.id} onClick={() => setChannel(c.id)}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <button className="rx-btn rx-btn-primary transition-all duration-200 ease-in-out active:scale-95 disabled:active:scale-100" onClick={generate} disabled={loading || !hasKey}>
          {loading ? <Spinner label={text ? 'Regenerating…' : 'Writing…'} /> : (text ? 'Regenerate' : 'Generate')}
        </button>
      </div>

      <p className="text-[11px] text-slate-400 mt-2">
        {channel === 'linkedin'
          ? 'A short connection note — under ~90 words to fit LinkedIn’s limit.'
          : 'A subject line plus a concise 120–160 word email body.'}
      </p>

      {error && <ErrorBar message={error} />}

      <div className="mt-4">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Message</label>
          <CharCount value={text} />
        </div>
        <textarea
          className="field resize-y leading-relaxed"
          rows={channel === 'email' ? 9 : 6}
          value={text}
          onChange={(e) => { setText(e.target.value); setSaved(false); setCopied(false); }}
          placeholder={loading ? '' : 'Your outreach message will appear here. Generate one above, or write your own.'}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        <button className="rx-btn rx-btn-ghost transition-all duration-200 ease-in-out active:scale-95 disabled:active:scale-100" onClick={copy} disabled={!text.trim()}>
          {copied ? 'Copied ✓' : 'Copy'}
        </button>
        <button className="rx-btn rx-btn-soft transition-all duration-200 ease-in-out active:scale-95 disabled:active:scale-100" onClick={save} disabled={!text.trim()}>
          {saved ? 'Saved ✓' : 'Save'}
        </button>
      </div>
    </div>
  );
}

// ── Small shared bits ─────────────────────────────────────────────────────────

function Spinner({ label }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80 animate-pulse" />
      {label}
    </span>
  );
}

function CharCount({ value }) {
  const n = (value || '').length;
  if (!n) return null;
  const words = value.trim() ? value.trim().split(/\s+/).length : 0;
  return <span className="text-[11px] text-slate-400 tabular-nums">{words} words · {n} chars</span>;
}

function ErrorBar({ message }) {
  return (
    <div className="mt-3 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700">
      {message}
    </div>
  );
}

function fileNameFor(entry, kind) {
  const who = (entry?.resume?.name || 'resume').trim().replace(/\s+/g, '-').replace(/[^\w\-]/g, '');
  return `${who || 'resume'}-${kind}.pdf`;
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
