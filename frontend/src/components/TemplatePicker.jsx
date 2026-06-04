import { useRef, useState } from 'react';
import { api } from '../lib/api.js';
import ResumePreview, { SAMPLE_RESUME } from './ResumePreview.jsx';

// Two-step new resume flow:
//   Step 1 — pick a template (grid, click to select, Next button)
//   Step 2 — import an existing resume or skip
export default function TemplatePicker({ templates, onSelect, onBack, onError }) {
  const [step, setStep] = useState(1); // 1 = pick template, 2 = import/skip
  const [chosen, setChosen] = useState(null); // templateId
  const [imported, setImported] = useState(null); // { text, filename }
  const [importing, setImporting] = useState(false);
  const fileRef = useRef(null);

  async function handleFile(file) {
    if (!file) return;
    setImporting(true);
    try {
      const res = await api.extract(file);
      setImported(res);
    } catch (e) {
      onError?.(`Import failed: ${e.message}`);
    } finally {
      setImporting(false);
    }
  }

  function finish(withImport) {
    onSelect(chosen, withImport ? imported?.text || null : null);
  }

  // ── Step 1: template grid ────────────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="min-h-full bg-slate-50 flex flex-col">
        <header className="bg-white border-b border-slate-200 shrink-0">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
            <button
              onClick={onBack}
              className="w-8 h-8 grid place-items-center rounded-lg text-slate-500 hover:bg-slate-100 transition"
            >
              <ArrowLeftIcon />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-slate-900">Choose a template</h1>
              <p className="text-xs text-slate-500">Pick a layout — you can switch it any time.</p>
            </div>
            {/* Step indicator */}
            <div className="flex items-center gap-2 text-xs text-slate-400 shrink-0">
              <span className="w-5 h-5 rounded-full bg-brand-600 text-white text-[10px] font-bold grid place-items-center">1</span>
              <span className="font-medium text-slate-600">Template</span>
              <span className="text-slate-300">→</span>
              <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-400 text-[10px] font-bold grid place-items-center">2</span>
              <span>Import</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          <div className="max-w-5xl mx-auto px-6 py-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {templates.map(t => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  selected={chosen === t.id}
                  onSelect={() => {
                    setChosen(t.id);
                    setStep(2);
                  }}
                />
              ))}
            </div>
          </div>
        </div>


      </div>
    );
  }

  // ── Step 2: import or skip ───────────────────────────────────────────────
  return (
    <div className="min-h-full bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 shrink-0">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => setStep(1)}
            className="w-8 h-8 grid place-items-center rounded-lg text-slate-500 hover:bg-slate-100 transition"
          >
            <ArrowLeftIcon />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-slate-900">Import your resume</h1>
            <p className="text-xs text-slate-500">We'll extract your details and fill in the <span className="font-medium">{templates.find(t => t.id === chosen)?.name}</span> template.</p>
          </div>
          {/* Step indicator */}
          <div className="flex items-center gap-2 text-xs text-slate-400 shrink-0">
            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 text-[10px] font-bold grid place-items-center">✓</span>
            <span className="text-slate-400">Template</span>
            <span className="text-slate-300">→</span>
            <span className="w-5 h-5 rounded-full bg-brand-600 text-white text-[10px] font-bold grid place-items-center">2</span>
            <span className="font-medium text-slate-600">Import</span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4">
          {/* Import card */}
          <div
            onClick={() => fileRef.current?.click()}
            className={`cursor-pointer rounded-2xl border-2 p-6 transition-all flex flex-col items-center text-center gap-3 ${
              imported
                ? 'border-emerald-300 bg-emerald-50'
                : 'border-dashed border-slate-300 bg-white hover:border-brand-400 hover:bg-brand-50'
            }`}
          >
            <div className={`w-12 h-12 rounded-xl grid place-items-center ${imported ? 'bg-emerald-100 text-emerald-600' : 'bg-brand-50 text-brand-600'}`}>
              {imported ? <CheckIcon size={22} /> : <UploadIcon />}
            </div>
            {imported ? (
              <>
                <div className="text-sm font-semibold text-emerald-700">"{imported.filename}" imported</div>
                <div className="text-xs text-slate-500">Click to replace with a different file</div>
              </>
            ) : (
              <>
                <div className="text-sm font-semibold text-slate-800">
                  {importing ? 'Reading your file…' : 'Import PDF or Word'}
                </div>
                <div className="text-xs text-slate-500">
                  We'll extract your experience, education, skills and fill the template automatically.
                </div>
              </>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={e => { handleFile(e.target.files?.[0]); e.target.value = ''; }}
          />

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {imported && (
              <button
                onClick={() => finish(true)}
                className="w-full py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition"
              >
                Use imported data →
              </button>
            )}
            <button
              onClick={() => finish(false)}
              className={`w-full py-2.5 rounded-xl text-sm font-medium transition ${
                imported
                  ? 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                  : 'bg-brand-600 text-white hover:bg-brand-700'
              }`}
            >
              {imported ? 'Skip — start fresh' : 'Skip import, start fresh →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Template card ────────────────────────────────────────────────────────────
function TemplateCard({ template, selected, onSelect }) {
  const t = template;
  return (
    <button
      onClick={onSelect}
      className={`group text-left rounded-2xl border-2 transition-all overflow-hidden ${
        selected
          ? 'border-brand-500 shadow-lg shadow-brand-100 ring-2 ring-brand-200'
          : 'border-slate-200 bg-white hover:border-brand-300 hover:shadow-md'
      }`}
    >
      {/* Preview — clipped to top ~62% of the A4 page to avoid blank whitespace */}
      <div className="relative bg-white" style={{ aspectRatio: '794 / 700' }}>
        <ResumePreview
          resume={SAMPLE_RESUME}
          template={t.id}
          className="absolute inset-0 w-full h-full"
        />

        {/* Selection overlay */}
        {selected && (
          <div className="absolute inset-0 bg-brand-600/5 flex items-start justify-end p-2">
            <span className="w-5 h-5 rounded-full bg-brand-600 text-white text-[10px] grid place-items-center shadow">
              <CheckMarkIcon />
            </span>
          </div>
        )}
        {/* Hover CTA for unselected */}
        {!selected && (
          <div className="absolute inset-0 bg-brand-600/0 group-hover:bg-brand-600/5 transition-colors grid place-items-end pb-3 opacity-0 group-hover:opacity-100">
            <span className="mx-auto px-3 py-1 rounded-full bg-brand-600 text-white text-xs font-medium shadow">
              Select
            </span>
          </div>
        )}
      </div>

      {/* Label row */}
      <div className={`px-3 py-2 border-t ${selected ? 'border-brand-200 bg-brand-50' : 'border-slate-100'}`}>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: t.accent }} />
          <span className={`font-semibold text-xs ${selected ? 'text-brand-700' : 'text-slate-900'}`}>{t.name}</span>
        </div>
      </div>
    </button>
  );
}

// ── Icons ────────────────────────────────────────────────────────────────────
function ArrowLeftIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
    </svg>
  );
}
function ArrowRightIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
    </svg>
  );
}
function UploadIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
    </svg>
  );
}
function CheckIcon({ size = 16 }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width={size} height={size}>
      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
    </svg>
  );
}
function CheckMarkIcon() {
  return (
    <svg viewBox="0 0 12 12" fill="currentColor" className="w-3 h-3">
      <path d="M10 3L5 8.5 2 5.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}
