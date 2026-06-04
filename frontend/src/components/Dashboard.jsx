import { useState } from 'react';
import ResumePreview from './ResumePreview.jsx';
import { Avatar } from 'avatar-forge/react';

export default function Dashboard({ resumes, onCreateNew, onOpen, onDelete, onDuplicate, onOpenSettings, hasKey }) {
  return (
    <div className="min-h-full" style={{ background: '#f7f8fc' }}>
      {/* Top bar */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-600 text-white grid place-items-center font-bold text-sm shadow-sm shadow-brand-600/30">R</div>
            <span className="font-bold text-slate-900 tracking-tight">Resumex</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={onOpenSettings}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition"
            >
              <SettingsIcon />
              Settings
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${hasKey ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                {hasKey ? 'ready' : 'no key'}
              </span>
            </button>
            <div className="w-px h-6 bg-slate-200"></div>
            <Avatar value="Uday PS" size={32} style="marble" rounded="circle" />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Hero row */}
        <div className="flex items-end justify-between mb-7">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Resumes</h1>
            <p className="text-sm text-slate-500 mt-1">Build, refine, and download — all in one place.</p>
          </div>
          <button
            onClick={onCreateNew}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 shadow-md shadow-brand-600/25 transition-all hover:-translate-y-px"
          >
            <PlusIcon />
            New resume
          </button>
        </div>

        {/* Empty state */}
        {resumes.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-500 grid place-items-center mx-auto mb-5">
              <DocIcon />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">No resumes yet</h3>
            <p className="text-sm text-slate-500 max-w-xs mx-auto mb-6 leading-relaxed">
              Create your first resume — chat with AI or fill in fields manually. Get a polished PDF in minutes.
            </p>
            <button
              onClick={onCreateNew}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 shadow-md shadow-brand-600/25 transition"
            >
              <PlusIcon />
              Create your first resume
            </button>
          </div>
        )}

        {/* Resume grid */}
        {resumes.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {/* "New" card */}
            <button
              onClick={onCreateNew}
              className="group h-full min-h-[220px] flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 text-slate-400 hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50/40 transition-all"
            >
              <div className="w-10 h-10 rounded-full border-2 border-current grid place-items-center group-hover:scale-110 transition-transform">
                <PlusIcon />
              </div>
              <span className="text-sm font-semibold">New resume</span>
            </button>

            {resumes.map(r => (
              <ResumeCard
                key={r.id}
                entry={r}
                onOpen={() => onOpen(r.id)}
                onDelete={() => onDelete(r.id)}
                onDuplicate={() => onDuplicate(r.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const TEMPLATE_ACCENTS = {
  jake: '#1f2937', modern: '#2062c9', classic: '#111827', compact: '#7c3aed',
};

function ResumeCard({ entry, onOpen, onDelete, onDuplicate }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const name = entry.resume?.name || '';
  const headline = entry.resume?.headline || '';
  const sections = ['experience', 'education', 'projects', 'skills']
    .reduce((n, k) => n + (entry.resume?.[k]?.length || 0), 0);
  const date = new Date(entry.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const accent = TEMPLATE_ACCENTS[entry.templateId] || '#2563eb';

  return (
    <div className="group relative bg-white rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all duration-200 overflow-hidden cursor-pointer">
      {/* Color accent top bar */}
      <div className="h-1.5 w-full" style={{ background: accent }} />

      {/* Preview area */}
      <div onClick={onOpen} className="px-5 pt-4 pb-3">
        {/* Live, scaled render of the actual resume */}
        <div className="rounded-lg overflow-hidden border border-slate-200/70 ring-1 ring-slate-100 mb-3 bg-white" style={{ aspectRatio: '794 / 1123' }}>
          <ResumePreview resume={entry.resume} template={entry.templateId} fallbackName={name} className="w-full h-full" />
        </div>

        <div className="font-semibold text-slate-900 text-sm truncate">{name || 'Untitled'}</div>
        {headline && <div className="text-[11px] text-slate-500 mt-0.5 truncate">{headline}</div>}
      </div>

      {/* Footer */}
      <div className="px-5 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar value={name || 'Untitled'} size={20} style="blob" />
          <span className="text-[11px] text-slate-400">{date}</span>
          <span className="w-1 h-1 rounded-full bg-slate-300" />
          <span className="text-[11px] text-slate-400 capitalize">{entry.templateId}</span>
          {sections > 0 && (
            <>
              <span className="w-1 h-1 rounded-full bg-slate-300" />
              <span className="text-[11px] text-slate-400">{sections} sections</span>
            </>
          )}
        </div>
        <div className="relative">
          <button
            onClick={e => { e.stopPropagation(); setMenuOpen(m => !m); }}
            className="w-7 h-7 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <DotsIcon />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 bottom-9 z-20 bg-white rounded-xl border border-slate-200 shadow-xl py-1.5 w-40 overflow-hidden">
                <MenuBtn onClick={() => { onOpen(); setMenuOpen(false); }}>
                  <EditIcon /> Edit
                </MenuBtn>
                <MenuBtn onClick={() => { onDuplicate(); setMenuOpen(false); }}>
                  <CopyIcon /> Duplicate
                </MenuBtn>
                <div className="my-1 border-t border-slate-100" />
                <MenuBtn onClick={() => { if (confirm('Delete this resume?')) { onDelete(); setMenuOpen(false); } }} danger>
                  <TrashIcon /> Delete
                </MenuBtn>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MenuBtn({ children, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 transition ${
        danger ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-700 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  );
}

function PlusIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
    </svg>
  );
}
function SettingsIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.43l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}
function DocIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor" className="w-8 h-8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  );
}
function DotsIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path d="M10 3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM10 8.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM11.5 15.5a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0Z" />
    </svg>
  );
}
function EditIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path d="M2.695 14.763l-1.262 3.154a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.885L17.5 5.5a2.121 2.121 0 0 0-3-3L3.58 13.42a4 4 0 0 0-.885 1.343Z" /></svg>;
}
function CopyIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path d="M7 3.5A1.5 1.5 0 0 1 8.5 2h3.879a1.5 1.5 0 0 1 1.06.44l3.122 3.12A1.5 1.5 0 0 1 17 6.622V12.5a1.5 1.5 0 0 1-1.5 1.5h-1v-3.379a3 3 0 0 0-.879-2.121L10.5 5.379A3 3 0 0 0 8.379 4.5H7v-1Z" /><path d="M4.5 6A1.5 1.5 0 0 0 3 7.5v9A1.5 1.5 0 0 0 4.5 18h7a1.5 1.5 0 0 0 1.5-1.5v-5.879a1.5 1.5 0 0 0-.44-1.06L9.44 6.439A1.5 1.5 0 0 0 8.378 6H4.5Z" /></svg>;
}
function TrashIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" /></svg>;
}
