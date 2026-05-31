import { useRef, useState } from 'react';
import { api } from '../lib/api.js';
import ResumePreview, { SAMPLE_RESUME } from './ResumePreview.jsx';

export default function TemplatePicker({ templates, onSelect, onBack, onError }) {
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

  function choose(templateId) {
    onSelect(templateId, imported?.text || null);
  }

  return (
    <div className="min-h-full bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={onBack}
            className="w-8 h-8 grid place-items-center rounded-lg text-slate-500 hover:bg-slate-100 transition"
          >
            <ArrowLeftIcon />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Choose a template</h1>
            <p className="text-xs text-slate-500">Pick a layout, then chat to fill it in — or import an existing resume first.</p>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Import banner */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 grid place-items-center shrink-0">
            <UploadIcon />
          </div>
          <div className="flex-1 min-w-0">
            {imported ? (
              <>
                <div className="text-sm font-medium text-emerald-700 flex items-center gap-1.5">
                  <CheckIcon /> Imported “{imported.filename}”
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Now pick a template below — we'll auto-fill it from your resume.
                </div>
              </>
            ) : (
              <>
                <div className="text-sm font-medium text-slate-900">Already have a resume?</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Import a PDF or Word file and we'll extract everything into your chosen template.
                </div>
              </>
            )}
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="shrink-0 text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition font-medium"
          >
            {importing ? 'Reading…' : imported ? 'Replace file' : 'Import PDF / Word'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={e => { handleFile(e.target.files?.[0]); e.target.value = ''; }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {templates.map(t => (
            <TemplateCard
              key={t.id}
              template={t}
              cta={imported ? 'Use & import' : 'Use this template'}
              onSelect={() => choose(t.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function TemplateCard({ template, onSelect, cta = 'Use this template' }) {
  const t = template;

  return (
    <button
      onClick={onSelect}
      className="group text-left bg-white rounded-2xl border border-slate-200 hover:border-brand-400 hover:shadow-lg transition-all overflow-hidden"
    >
      {/* Preview: a live, razor-sharp render of a sample resume in this template. */}
      <div className="relative overflow-hidden bg-white border-b border-slate-100" style={{ aspectRatio: '816 / 1056' }}>
        <ResumePreview resume={SAMPLE_RESUME} template={t.id} className="w-full h-full" />

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-brand-600/0 group-hover:bg-brand-600/5 transition-colors grid place-items-center opacity-0 group-hover:opacity-100">
          <span className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium shadow-lg">
            {cta}
          </span>
        </div>
      </div>
      <div className="px-4 py-3 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: t.accent }} />
          <span className="font-semibold text-sm text-slate-900">{t.name}</span>
        </div>
        <p className="text-xs text-slate-500 mt-1 leading-snug line-clamp-2">{t.description}</p>
      </div>
    </button>
  );
}

function ArrowLeftIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
    </svg>
  );
}
