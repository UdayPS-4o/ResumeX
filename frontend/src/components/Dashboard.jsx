import { useMemo, useState } from 'react';
import ResumePreview from './ResumePreview.jsx';
import ConfirmModal from './ConfirmModal.jsx';

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard — "multiple masters → tailored variants" model, rendered in the
// approved editorial / "Side Rail" layout (showcase variant d2):
//   • masters sit directly on the page background, separated by hairline rules
//     (no boxed white card), inside a wide ~1200px container
//   • each master is a LANDSCAPE block: live thumbnail (brand-accented left edge)
//     · identity + actions on the right
//   • its tailored copies live in a scrollable RIGHT rail divided by a hairline
//
// Every resume entry is either a MASTER (parentId == null) or a TAILORED variant
// pointing at its master via parentId. Grouping is derived from the `resumes`
// prop so the view never falls out of sync with App's state.
// ─────────────────────────────────────────────────────────────────────────────

export default function Dashboard({
  resumes,
  onCreateNew,
  onOpen,
  onDelete,
  onDuplicate,
  onOpenSettings,
  onOpenTracker,
  onTailor,
  onOpenDocuments,
  onEnrich,
  hasKey,
  mounted = true,
  user = null,
  onLogout = () => {},
}) {
  const [confirmState, setConfirmState] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  const { masters, variantsByParent } = useMemo(() => {
    const list = resumes || [];
    const byParent = new Map();
    const masterList = [];
    for (const e of list) {
      if (e.parentId) {
        if (!byParent.has(e.parentId)) byParent.set(e.parentId, []);
        byParent.get(e.parentId).push(e);
      } else {
        masterList.push(e);
      }
    }
    const masterIds = new Set(masterList.map((m) => m.id));
    for (const [pid, kids] of byParent) {
      if (!masterIds.has(pid)) {
        for (const k of kids) masterList.push(k);
        byParent.delete(pid);
      }
    }
    return { masters: masterList, variantsByParent: byParent };
  }, [resumes]);

  const empty = (resumes || []).length === 0;

  return (
    <div className="min-h-full" style={{ background: '#f7f8fc' }}>
      {/* Top bar */}
      <header className="sticky top-0 z-20 bg-white/85 backdrop-blur border-b border-slate-200/70">
        <div className="mx-auto w-full max-w-[1200px] px-6 lg:px-10 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-600 text-white grid place-items-center font-bold text-sm shadow-sm shadow-brand-600/30">R</div>
            <span className="font-bold text-slate-900 tracking-tight">ResumeX</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={onOpenTracker} className="rx-btn rx-btn-ghost rx-btn-sm">
              <TrackerIcon />
              <span className="hidden sm:inline">Application Tracker</span>
            </button>
            <button onClick={onOpenSettings} className="rx-btn rx-btn-ghost rx-btn-sm">
              <SettingsIcon />
              <span className="hidden sm:inline">Settings</span>
              {mounted && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${hasKey ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {hasKey ? 'ready' : 'no key'}
                </span>
              )}
            </button>
            <div className="w-px h-6 bg-slate-200 mx-1" />
            <AccountMenu user={user} onLogout={onLogout} />
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1200px] px-6 lg:px-10 py-9">
        {/* Hero */}
        <div className="flex items-end justify-between gap-4 mb-9">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.09em] text-slate-400">Your resumes</div>
            <h1 className="text-[28px] leading-tight font-bold text-slate-900 tracking-tight mt-1">Masters &amp; tailored variants</h1>
            <p className="text-sm text-slate-500 mt-1.5 max-w-2xl">
              Keep a master per career story, then spin off a tailored copy for every job you chase.
            </p>
          </div>
          <button onClick={onCreateNew} className="rx-btn rx-btn-primary shrink-0">
            <PlusIcon />
            New resume
          </button>
        </div>

        {/* No-key inline notice */}
        {mounted && !hasKey && (
          <button
            onClick={onOpenSettings}
            className="w-full mb-8 flex items-center gap-3 text-left rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 hover:bg-amber-100/70 transition"
          >
            <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-600 grid place-items-center shrink-0">
              <KeyIcon />
            </span>
            <span className="text-sm text-amber-800">
              <span className="font-semibold">No API key yet.</span>{' '}
              AI tailoring, drafting and enrichment stay locked until you add one.
            </span>
            <span className="ml-auto text-sm font-semibold text-amber-700 whitespace-nowrap">Open settings →</span>
          </button>
        )}

        {/* Empty state */}
        {mounted && empty && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-500 grid place-items-center mx-auto mb-5">
              <DocIcon />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">No resumes yet</h3>
            <p className="text-sm text-slate-500 max-w-xs mx-auto mb-6 leading-relaxed">
              Create your first master resume — chat with AI or fill in fields manually. Then tailor it to any job in a click.
            </p>
            <button onClick={onCreateNew} className="rx-btn rx-btn-primary mx-auto">
              <PlusIcon />
              Create your first resume
            </button>
          </div>
        )}

        {/* Masters — laid directly on the page, hairline-separated (gallery d2) */}
        {!empty &&
          masters.map((master, idx) => (
            <MasterCard
              key={master.id}
              master={master}
              variants={variantsByParent.get(master.id) || []}
              idx={idx}
              onOpen={onOpen}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              onTailor={onTailor}
              onOpenDocuments={onOpenDocuments}
              onEnrich={onEnrich}
              hasKey={hasKey}
              onRequestConfirm={(title, message, onConfirm) => setConfirmState({ isOpen: true, title, message, onConfirm })}
            />
          ))}
      </div>
      
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmText="Delete"
        danger={true}
        onConfirm={() => confirmState.onConfirm?.()}
        onCancel={() => setConfirmState(s => ({ ...s, isOpen: false }))}
      />
    </div>
  );
}

// ── Account menu (avatar + logout) ───────────────────────────────────────────
function AccountMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const name = user?.username || 'You';
  const initials =
    String(name)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join('') || 'U';

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={user?.email || name}
        className="w-8 h-8 rounded-full bg-brand-600 text-white font-semibold text-xs flex items-center justify-center shadow-sm ring-1 ring-brand-700/20 shrink-0 hover:bg-brand-700 transition-colors"
      >
        {initials}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-30 bg-white rounded-xl border border-slate-200 shadow-xl py-1.5 w-56 overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-100">
              <div className="text-sm font-semibold text-slate-800 truncate">{name}</div>
              {user?.email && <div className="text-xs text-slate-400 truncate">{user.email}</div>}
            </div>
            <button
              onClick={() => { setOpen(false); onLogout(); }}
              className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 text-slate-700 hover:bg-slate-50 transition"
            >
              <LogoutIcon /> Log out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function LogoutIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
    </svg>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const MONO_PALETTE = ['#2557eb', '#0d9488', '#7c3aed', '#b45309', '#0e7490', '#be123c', '#4338ca', '#15803d'];
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}
function monogram(title) {
  const words = String(title || '').split(/\s+/).filter((w) => /^[a-zA-Z0-9]/.test(w));
  const letters = words.slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  return letters || '·';
}
function fmtDate(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function countSections(resume) {
  return ['experience', 'education', 'projects', 'skills', 'certifications', 'awards']
    .reduce((n, k) => n + (resume?.[k]?.length || 0), 0);
}
function Dot() {
  return <span className="w-1 h-1 rounded-full bg-slate-300 inline-block shrink-0" />;
}

// ── Master block ──────────────────────────────────────────────────────────────
function MasterCard({ master, variants, idx, onOpen, onDelete, onDuplicate, onTailor, onOpenDocuments, onEnrich, hasKey, onRequestConfirm }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const name = master.resume?.name || master.title || 'Untitled';
  const headline = master.resume?.headline || '';
  const sections = countSections(master.resume);
  const n = variants.length;
  const noKeyTitle = !hasKey ? 'Add an API key in settings first' : undefined;

  function handleDelete() {
    setMenuOpen(false);
    const warn = n
      ? `Delete "${master.title}" and its ${n} tailored ${n === 1 ? 'variant' : 'variants'}? This cannot be undone.`
      : `Delete "${master.title}"? This cannot be undone.`;
    onRequestConfirm('Delete Resume', warn, () => onDelete(master.id));
  }

  return (
    <section className={idx ? 'border-t border-slate-200/70 pt-9 mt-9' : ''}>
      <div className="flex flex-col lg:flex-row gap-8 items-center">
        {/* LEFT — thumbnail + identity + actions */}
        <div className="lg:flex-1 lg:max-w-[58%] flex gap-6 items-center">
          {/* Thumbnail + overflow menu. The outer wrapper is NOT clipped so the
              menu dropdown can extend past the card; the inner div clips the
              preview to rounded corners. */}
          <div className="relative group shrink-0" style={{ width: 180, aspectRatio: '210 / 297' }}>
            <div
              onClick={() => onOpen(master.id)}
              className="w-full h-full overflow-hidden rounded-xl rounded-l-2xl bg-white ring-1 ring-slate-200/80 shadow-sm border-l-[6px] border-brand-600 cursor-pointer hover:shadow-md transition-shadow"
            >
              <ResumePreview resume={master.resume} template={master.templateId} fallbackName={name} className="w-full h-full" />
            </div>

            <div className={`absolute top-2 right-2 z-20 transition-opacity ${menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'}`}>
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen((m) => !m); }}
                className="w-7 h-7 grid place-items-center rounded-lg bg-white/95 backdrop-blur ring-1 ring-slate-200 shadow-sm text-slate-500 hover:text-slate-800 hover:bg-white transition"
                aria-label="More actions"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <DotsIcon />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-9 z-30 bg-white rounded-xl border border-slate-200 shadow-xl py-1.5 w-56 overflow-hidden">
                    <MenuBtn onClick={() => { onOpenDocuments(master); setMenuOpen(false); }} disabled={!hasKey} title={noKeyTitle}>
                      <MailIcon /> Cover letter &amp; outreach
                    </MenuBtn>
                    <MenuBtn onClick={() => { onDuplicate(master.id); setMenuOpen(false); }}>
                      <CopyIcon /> Duplicate
                    </MenuBtn>
                    <div className="my-1 border-t border-slate-100" />
                    <MenuBtn onClick={handleDelete} danger>
                      <TrashIcon /> Delete
                    </MenuBtn>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            {/* Badge row — clean, no orphaned controls */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="badge badge-master">Master</span>
              <span className="text-xs font-semibold text-slate-400 capitalize">{master.templateId}</span>
            </div>

            {/* Title */}
            <h2
              onClick={() => onOpen(master.id)}
              className="text-[30px] leading-[1.05] font-bold text-slate-900 tracking-tight mt-2 cursor-pointer hover:text-brand-600 transition-colors"
            >
              {master.title || name}
            </h2>

            {/* Headline */}
            {headline && (
              <div className="text-brand-600 font-bold tracking-wide text-[14px] mt-2">
                {headline.replace(/\s*[·•]\s*/g, ' | ').toUpperCase()}
              </div>
            )}

            {/* Meta */}
            <div className="text-[13px] text-slate-500 mt-2 flex items-center gap-1.5 flex-wrap">
              <span className="capitalize">{master.templateId}</span>
              <Dot />
              <span>Updated {fmtDate(master.updatedAt)}</span>
              {sections > 0 && (<><Dot /><span>{sections} items</span></>)}
              <Dot />
              <span>{n} tailored</span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-wrap mt-4">
              <button onClick={() => onOpen(master.id)} className="rx-btn rx-btn-primary rx-btn-sm">
                <EditIcon /> Open
              </button>
              <button onClick={() => onTailor(master)} disabled={!hasKey} title={noKeyTitle} className="rx-btn rx-btn-soft rx-btn-sm">
                <TargetIcon /> Tailor to a job
              </button>
              <button onClick={() => onEnrich(master)} disabled={!hasKey} title={noKeyTitle} className="rx-btn rx-btn-ghost rx-btn-sm">
                <SparkleIcon /> Strengthen
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT — tailored rail */}
        {n > 0 && (
          <aside className="lg:w-[40%] lg:border-l lg:border-slate-200/70 lg:pl-8">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[11px] font-bold uppercase tracking-[0.09em] text-slate-400">Tailored copies</div>
              <span className="chip chip-neutral">{n}</span>
            </div>
            <div className="relative">
              <div
                className="space-y-1.5 overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden"
                style={{ maxHeight: 280, scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {variants.map((v) => (
                  <RailRow key={v.id} variant={v} onOpen={onOpen} />
                ))}
              </div>
              {n > 4 && (
                <>
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-5 rounded-t-xl" style={{ background: 'linear-gradient(to bottom, #f7f8fc, rgba(247,248,252,0))' }} />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6" style={{ background: 'linear-gradient(to top, #f7f8fc, rgba(247,248,252,0))' }} />
                </>
              )}
            </div>
          </aside>
        )}
      </div>
    </section>
  );
}

// ── Tailored-copy row inside the rail ─────────────────────────────────────────
function RailRow({ variant, onOpen }) {
  const job = variant.job || {};
  const role = job.role || '';
  const company = job.company || '';
  const label = role && company ? `${role} · ${company}` : (role || company || variant.title || 'Tailored resume');
  const displayRole = role || variant.title || 'Tailored resume';
  const score = variant.matchScore;

  return (
    <div
      onClick={() => onOpen(variant.id)}
      className="group flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50 ring-1 ring-transparent hover:ring-slate-200/70 transition cursor-pointer"
    >
      <span
        className="grid place-items-center text-white font-bold shrink-0 rounded-full"
        style={{ width: 30, height: 30, background: MONO_PALETTE[hashStr(label) % MONO_PALETTE.length], fontSize: 11 }}
      >
        {monogram(label)}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[13px] font-semibold text-slate-800 truncate group-hover:text-brand-700 transition">
          {displayRole}
        </span>
        <span className="block text-[11px] text-slate-400 truncate">
          {company && `${company} · `}Updated {fmtDate(variant.updatedAt)}
        </span>
      </span>
      {score != null && (
        <span className={`chip shrink-0 ${score >= 70 ? 'chip-match' : 'chip-neutral'}`}>{score}% match</span>
      )}
    </div>
  );
}

// ── Small shared bits ────────────────────────────────────────────────────────
function MenuBtn({ children, onClick, danger, disabled, title }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 transition disabled:opacity-40 disabled:cursor-not-allowed ${
        danger ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-700 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  );
}

// ── Icons ────────────────────────────────────────────────────────────────────
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
function TrackerIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
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
function TargetIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
      <path fillRule="evenodd" d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm0 2.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11Zm0 2.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" clipRule="evenodd" />
    </svg>
  );
}
function MailIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
      <path d="M3 4a2 2 0 0 0-2 2v.5l9 4.5 9-4.5V6a2 2 0 0 0-2-2H3Z" />
      <path d="M19 8.118 10 12.5 1 8.118V14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.118Z" />
    </svg>
  );
}
function SparkleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
      <path d="M9 1.5a.5.5 0 0 1 .95-.22l1.1 2.42 2.42 1.1a.5.5 0 0 1 0 .9l-2.42 1.1-1.1 2.42a.5.5 0 0 1-.9 0l-1.1-2.42-2.42-1.1a.5.5 0 0 1 0-.9l2.42-1.1 1.05-2.3A.5.5 0 0 1 9 1.5ZM15.5 11a.4.4 0 0 1 .76-.17l.7 1.54 1.54.7a.4.4 0 0 1 0 .73l-1.54.7-.7 1.54a.4.4 0 0 1-.73 0l-.7-1.54-1.54-.7a.4.4 0 0 1 0-.73l1.54-.7.67-1.47A.4.4 0 0 1 15.5 11ZM5 12a.4.4 0 0 1 .76-.17l.52 1.15 1.15.52a.4.4 0 0 1 0 .73l-1.15.52-.52 1.15a.4.4 0 0 1-.73 0l-.52-1.15-1.15-.52a.4.4 0 0 1 0-.73l1.15-.52.49-1.08A.4.4 0 0 1 5 12Z" />
    </svg>
  );
}
function KeyIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M8 7a5 5 0 1 1 3.61 4.804l-1.903 1.903A1 1 0 0 1 9 14H8v1a1 1 0 0 1-1 1H6v1a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-2a1 1 0 0 1 .293-.707L8.196 8.39A5.02 5.02 0 0 1 8 7Zm5-3a.75.75 0 0 0 0 1.5A1.5 1.5 0 0 1 14.5 7 .75.75 0 0 0 16 7a3 3 0 0 0-3-3Z" clipRule="evenodd" />
    </svg>
  );
}
