import { useEffect, useRef, useState } from 'react';
import RichText from './RichText.jsx';

// Full manual editor — editable fields, collapsible sections, add/remove items,
// and drag-and-drop reordering for items, bullets, and whole sections. Edits
// flow straight into the shared `resume` state so the live preview + ATS update
// instantly.

const DEFAULT_ORDER = ['summary', 'experience', 'education', 'projects', 'skills', 'certifications', 'awards'];

const SECTION_LABELS = {
  summary: 'Professional Summary',
  experience: 'Work Experience',
  education: 'Education',
  projects: 'Projects',
  skills: 'Skills',
  certifications: 'Certifications',
  awards: 'Awards',
};

const BLANKS = {
  experience: () => ({ title: '', company: '', location: '', start: '', end: '', description: '', bullets: [] }),
  education: () => ({ school: '', degree: '', location: '', start: '', end: '', gpa: '', details: [] }),
  projects: () => ({ name: '', description: '', tech: [], link: '', start: '', end: '', bullets: [] }),
  skills: () => ({ category: '', items: [] }),
  certifications: () => ({ name: '', issuer: '', date: '' }),
  awards: () => ({ name: '', issuer: '', date: '', description: '' }),
};

// Move element from index `from` to index `to` in a fresh copy of `arr`.
function reorder(arr, from, to) {
  const next = [...arr];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export default function FormEditor({ resume, onChange }) {
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [openItems, setOpenItems] = useState(() => new Set());

  // Section drag state.
  const [dragKey, setDragKey] = useState(null);
  const [overKey, setOverKey] = useState(null);

  const r = resume || {};
  const contact = r.contact || {};
  const sectionTitles = r.sectionTitles || {};

  // ── immutable update helpers ──
  const patch = (p) => onChange({ ...r, ...p });
  // Per-section heading override. Empty string clears it (falls back to template default).
  const setSectionTitle = (key, value) => {
    const next = { ...sectionTitles };
    if (value && value.trim()) next[key] = value;
    else delete next[key];
    patch({ sectionTitles: next });
  };
  const patchContact = (p) => onChange({ ...r, contact: { ...contact, ...p } });
  const updItem = (key, idx, p) => {
    const arr = [...(r[key] || [])];
    arr[idx] = { ...arr[idx], ...p };
    patch({ [key]: arr });
  };
  const addItem = (key) => {
    const arr = [...(r[key] || []), BLANKS[key]()];
    patch({ [key]: arr });
    setOpenItems(s => new Set(s).add(`${key}:${arr.length - 1}`));
  };
  const delItem = (key, idx) => patch({ [key]: (r[key] || []).filter((_, i) => i !== idx) });
  const moveItem = (key, from, to) => {
    const arr = r[key] || [];
    if (to < 0 || to >= arr.length || from === to) return;
    patch({ [key]: reorder(arr, from, to) });
  };

  // ── section ordering ──
  const effectiveOrder = () => {
    const base = (Array.isArray(r.sectionOrder) && r.sectionOrder.length) ? [...r.sectionOrder] : [...DEFAULT_ORDER];
    for (const k of DEFAULT_ORDER) if (!base.includes(k)) base.push(k);
    return base.filter(k => DEFAULT_ORDER.includes(k));
  };
  const order = effectiveOrder();

  // Drop the dragged section before/at the target's position.
  const dropSection = (targetKey) => {
    if (!dragKey || dragKey === targetKey) { setDragKey(null); setOverKey(null); return; }
    const from = order.indexOf(dragKey);
    const to = order.indexOf(targetKey);
    if (from !== -1 && to !== -1) patch({ sectionOrder: reorder(order, from, to) });
    setDragKey(null);
    setOverKey(null);
  };

  const toggleSection = (key) =>
    setCollapsed(s => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const toggleItem = (key) =>
    setOpenItems(s => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });

  return (
    <div className="h-full overflow-y-auto bg-white px-5 pt-2 pb-4 divide-y divide-slate-200">
      {/* Personal details — always first, not reorderable */}
      <Section
        title="Personal Details"
        collapsed={collapsed.has('personal')}
        onToggle={() => toggleSection('personal')}
      >
        <Grid>
          <Text label="Full name" value={r.name} onChange={v => patch({ name: v })} placeholder="Jane Doe" />
          <Text label="Headline / target role" value={r.headline} onChange={v => patch({ headline: v })} placeholder="Senior Software Engineer" />
          <Text label="Email" value={contact.email} onChange={v => patchContact({ email: v })} placeholder="jane@email.com" />
          <Text label="Phone" value={contact.phone} onChange={v => patchContact({ phone: v })} placeholder="+1 555 123 4567" />
          <Text label="Location" value={contact.location} onChange={v => patchContact({ location: v })} placeholder="City, Country" />
          <Text label="Website" value={contact.website} onChange={v => patchContact({ website: v })} placeholder="janedoe.com" />
          <Text label="LinkedIn" value={contact.linkedin} onChange={v => patchContact({ linkedin: v })} placeholder="linkedin.com/in/jane" />
          <Text label="GitHub" value={contact.github} onChange={v => patchContact({ github: v })} placeholder="github.com/jane" />
        </Grid>
      </Section>

      {/* Reorderable content sections */}
      {order.map((key) => (
        <Section
          key={key}
          title={SECTION_LABELS[key]}
          count={key === 'summary' ? undefined : (r[key]?.length || 0)}
          collapsed={collapsed.has(key)}
          onToggle={() => toggleSection(key)}
          // drag-and-drop
          draggable
          dragging={dragKey === key}
          dragOver={overKey === key && dragKey !== key}
          onDragStart={() => setDragKey(key)}
          onDragEnter={() => dragKey && setOverKey(key)}
          onDrop={() => dropSection(key)}
          onDragEnd={() => { setDragKey(null); setOverKey(null); }}
        >
          <HeadingOverride
            value={sectionTitles[key]}
            placeholder={SECTION_LABELS[key]}
            onChange={(v) => setSectionTitle(key, v)}
          />

          {key === 'summary' && (
            <Rich
              label="Summary"
              hint="2–4 punchy sentences. Quantify impact where you can."
              minHeight={96}
              value={r.summary}
              onChange={v => patch({ summary: v })}
              placeholder="Full-stack engineer with 5 years building…"
            />
          )}

          {key === 'experience' && (
            <ItemSection
              items={r.experience} sectionKey="experience"
              labelFor={x => x.title || 'Untitled role'}
              subFor={x => [x.company, fmtRange(x.start, x.end)].filter(Boolean).join(' · ')}
              openItems={openItems} toggleItem={toggleItem}
              onAdd={() => addItem('experience')} onDel={i => delItem('experience', i)}
              onMove={(from, to) => moveItem('experience', from, to)}
              addLabel="Add experience"
              render={(x, i) => (
                <>
                  <Grid>
                    <Text label="Job title" value={x.title} onChange={v => updItem('experience', i, { title: v })} />
                    <Text label="Company" value={x.company} onChange={v => updItem('experience', i, { company: v })} />
                    <Text label="Start" value={x.start} onChange={v => updItem('experience', i, { start: v })} placeholder="Jan 2023" />
                    <Text label="End" value={x.end} onChange={v => updItem('experience', i, { end: v })} placeholder="Present" />
                    <Text label="Location" value={x.location} onChange={v => updItem('experience', i, { location: v })} className="md:col-span-2" />
                  </Grid>
                  <Rich label="Intro / summary (optional)" minHeight={48} value={x.description} onChange={v => updItem('experience', i, { description: v })} placeholder="One-line overview of the role" />
                  <BulletList label="Bullet points" value={x.bullets} onChange={v => updItem('experience', i, { bullets: v })} placeholder="Achieved X by doing Y, resulting in Z" />
                </>
              )}
            />
          )}

          {key === 'education' && (
            <ItemSection
              items={r.education} sectionKey="education"
              labelFor={e => e.school || 'School'}
              subFor={e => [e.degree, fmtRange(e.start, e.end)].filter(Boolean).join(' · ')}
              openItems={openItems} toggleItem={toggleItem}
              onAdd={() => addItem('education')} onDel={i => delItem('education', i)}
              onMove={(from, to) => moveItem('education', from, to)}
              addLabel="Add education"
              render={(e, i) => (
                <>
                  <Grid>
                    <Text label="School" value={e.school} onChange={v => updItem('education', i, { school: v })} />
                    <Text label="Degree" value={e.degree} onChange={v => updItem('education', i, { degree: v })} />
                    <Text label="Start" value={e.start} onChange={v => updItem('education', i, { start: v })} placeholder="2021" />
                    <Text label="End" value={e.end} onChange={v => updItem('education', i, { end: v })} placeholder="2025" />
                    <Text label="Location" value={e.location} onChange={v => updItem('education', i, { location: v })} />
                    <Text label="GPA (optional)" value={e.gpa} onChange={v => updItem('education', i, { gpa: v })} />
                  </Grid>
                  <BulletList label="Details (optional)" value={e.details} onChange={v => updItem('education', i, { details: v })} placeholder="Relevant coursework, honors, activities" />
                </>
              )}
            />
          )}

          {key === 'projects' && (
            <ItemSection
              items={r.projects} sectionKey="projects"
              labelFor={p => p.name || 'Project'}
              subFor={p => [(p.tech || []).join(', '), fmtRange(p.start, p.end)].filter(Boolean).join(' · ')}
              openItems={openItems} toggleItem={toggleItem}
              onAdd={() => addItem('projects')} onDel={i => delItem('projects', i)}
              onMove={(from, to) => moveItem('projects', from, to)}
              addLabel="Add project"
              render={(p, i) => (
                <>
                  <Grid>
                    <Text label="Project name" value={p.name} onChange={v => updItem('projects', i, { name: v })} className="md:col-span-2" />
                    <Text label="Start (optional)" value={p.start} onChange={v => updItem('projects', i, { start: v })} placeholder="Jan 2024" />
                    <Text label="End / date (optional)" value={p.end} onChange={v => updItem('projects', i, { end: v })} placeholder="Aug 2024" />
                    <Text label="Link (optional)" value={p.link} onChange={v => updItem('projects', i, { link: v })} className="md:col-span-2" placeholder="github.com/..." />
                  </Grid>
                  <Tags label="Tech / tools" value={p.tech} onChange={v => updItem('projects', i, { tech: v })} placeholder="React, Node.js, Postgres" />
                  <Rich label="Description (optional)" minHeight={48} value={p.description} onChange={v => updItem('projects', i, { description: v })} placeholder="What it does and the impact it had" />
                  <BulletList label="Bullet points" value={p.bullets} onChange={v => updItem('projects', i, { bullets: v })} placeholder="What it does and the impact it had" />
                </>
              )}
            />
          )}

          {key === 'skills' && (
            <ItemSection
              items={r.skills} sectionKey="skills"
              labelFor={s => s.category || 'Skill group'}
              subFor={s => (s.items || []).join(', ')}
              openItems={openItems} toggleItem={toggleItem}
              onAdd={() => addItem('skills')} onDel={i => delItem('skills', i)}
              onMove={(from, to) => moveItem('skills', from, to)}
              addLabel="Add skill group"
              render={(s, i) => (
                <>
                  <Text label="Category" value={s.category} onChange={v => updItem('skills', i, { category: v })} placeholder="Languages" />
                  <Tags label="Skills" value={s.items} onChange={v => updItem('skills', i, { items: v })} placeholder="JavaScript, Python, Go" />
                </>
              )}
            />
          )}

          {key === 'certifications' && (
            <ItemSection
              items={r.certifications} sectionKey="certifications"
              labelFor={c => c.name || 'Certification'}
              subFor={c => [c.issuer, c.date].filter(Boolean).join(' · ')}
              openItems={openItems} toggleItem={toggleItem}
              onAdd={() => addItem('certifications')} onDel={i => delItem('certifications', i)}
              onMove={(from, to) => moveItem('certifications', from, to)}
              addLabel="Add certification"
              render={(c, i) => (
                <Grid>
                  <Text label="Name" value={c.name} onChange={v => updItem('certifications', i, { name: v })} />
                  <Text label="Issuer" value={c.issuer} onChange={v => updItem('certifications', i, { issuer: v })} />
                  <Text label="Date" value={c.date} onChange={v => updItem('certifications', i, { date: v })} className="md:col-span-2" />
                </Grid>
              )}
            />
          )}

          {key === 'awards' && (
            <ItemSection
              items={r.awards} sectionKey="awards"
              labelFor={a => a.name || 'Award'}
              subFor={a => [a.issuer, a.date].filter(Boolean).join(' · ')}
              openItems={openItems} toggleItem={toggleItem}
              onAdd={() => addItem('awards')} onDel={i => delItem('awards', i)}
              onMove={(from, to) => moveItem('awards', from, to)}
              addLabel="Add award"
              render={(a, i) => (
                <>
                  <Grid>
                    <Text label="Name" value={a.name} onChange={v => updItem('awards', i, { name: v })} />
                    <Text label="Issuer" value={a.issuer} onChange={v => updItem('awards', i, { issuer: v })} />
                    <Text label="Date" value={a.date} onChange={v => updItem('awards', i, { date: v })} className="md:col-span-2" />
                  </Grid>
                  <Rich label="Description (optional)" minHeight={48} value={a.description} onChange={v => updItem('awards', i, { description: v })} placeholder="What you achieved" />
                </>
              )}
            />
          )}
        </Section>
      ))}

      <p className="text-[11px] text-slate-500 text-center pt-1 pb-4">
        Tip: drag any section or entry by its <span className="font-medium text-slate-600">⠿ grip</span> to reorder it.
      </p>
    </div>
  );
}

/* ───────────────────────── primitives ───────────────────────── */

function Section({
  title, count, collapsed, onToggle, children,
  draggable, dragging, dragOver, onDragStart, onDragEnter, onDrop, onDragEnd,
}) {
  return (
    <section
      onDragOver={draggable ? (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; onDragEnter?.(); } : undefined}
      onDrop={draggable ? (e) => { e.preventDefault(); onDrop?.(); } : undefined}
      className={`${dragOver ? 'dnd-over rounded-xl' : ''} ${dragging ? 'dnd-dragging' : ''}`}
    >
      {/* The whole header is the drag handle — grab it anywhere to reorder. */}
      <div
        className={`flex items-center gap-2 py-3.5 ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
        draggable={draggable}
        onDragStart={draggable ? (e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart?.(); } : undefined}
        onDragEnd={draggable ? onDragEnd : undefined}
      >
        {draggable && (
          <span className="grip text-slate-400 px-0.5 select-none shrink-0" title="Drag to reorder">
            <Grip className="w-4 h-4" />
          </span>
        )}
        <button onClick={onToggle} className="flex items-center gap-2 flex-1 min-w-0 text-left group">
          <Chevron open={!collapsed} />
          <span className="font-semibold text-slate-900 text-sm truncate">{title}</span>
          {typeof count === 'number' && (
            <span className="text-[11px] text-slate-600 bg-slate-100 rounded-full px-1.5 py-0.5 tabular-nums">{count}</span>
          )}
        </button>
      </div>
      {!collapsed && <div className="reveal pb-5 pt-0.5 space-y-4">{children}</div>}
    </section>
  );
}

function ItemSection({
  items, sectionKey, labelFor, subFor, render, openItems, toggleItem,
  onAdd, onDel, onMove, addLabel,
}) {
  const list = items || [];
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);

  const drop = (target) => {
    if (dragIdx !== null && dragIdx !== target) onMove(dragIdx, target);
    setDragIdx(null);
    setOverIdx(null);
  };

  return (
    <div className="space-y-2 pt-2">
      {list.length === 0 && (
        <p className="text-xs text-slate-400 italic py-1">Nothing here yet — add your first entry below.</p>
      )}
      {list.map((item, i) => {
        const itemKey = `${sectionKey}:${i}`;
        const open = openItems.has(itemKey);
        return (
          <div
            key={i}
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (dragIdx !== null) setOverIdx(i); }}
            onDrop={(e) => { e.preventDefault(); drop(i); }}
            className={`form-subcard rounded-xl ${
              overIdx === i && dragIdx !== i ? 'dnd-over' : ''
            } ${dragIdx === i ? 'dnd-dragging' : ''}`}
          >
            {/* The whole row is the drag handle — grab it anywhere to reorder. */}
            <div
              className="flex items-center gap-1 px-2.5 py-2 cursor-grab active:cursor-grabbing"
              draggable
              onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; setDragIdx(i); }}
              onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
            >
              <span className="grip text-slate-300 select-none shrink-0" title="Drag to reorder">
                <Grip className="w-3.5 h-3.5" />
              </span>
              <button onClick={() => toggleItem(itemKey)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
                <Chevron open={open} small />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-slate-900 truncate">{labelFor(item)}</span>
                  {subFor(item) && <span className="block text-[11px] text-slate-500 truncate">{subFor(item)}</span>}
                </span>
              </button>
              <IconBtn onClick={() => onDel(i)} title="Delete" danger>✕</IconBtn>
            </div>
            {open && <div className="reveal px-3 pb-3 pt-2 space-y-3 border-t border-slate-200/60">{render(item, i)}</div>}
          </div>
        );
      })}
      <button
        onClick={onAdd}
        className="w-full text-sm text-brand-700 hover:text-brand-800 hover:bg-brand-50 border border-dashed border-brand-300 rounded-xl py-2.5 transition font-medium"
      >
        + {addLabel}
      </button>
    </div>
  );
}

// Editable section heading. Renames how this section's title prints on the
// resume (e.g. "Projects" → "Selected Work"), across every template. Empty =
// the template's default heading.
function HeadingOverride({ value, placeholder, onChange }) {
  return (
    <label className="flex items-center gap-2 mb-1">
      <span className="text-[11px] font-medium text-slate-400 shrink-0">Heading</span>
      <input
        type="text"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        title="Rename this section's heading on the resume (leave blank for the default)"
        className="flex-1 min-w-0 text-sm font-medium text-slate-700 bg-transparent border-b border-dashed border-slate-200 focus:border-brand-400 outline-none py-0.5 placeholder:text-slate-400 placeholder:font-normal"
      />
    </label>
  );
}

function Grid({ children }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3.5">{children}</div>;
}

function Text({ label, value, onChange, placeholder, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-[11px] font-medium text-slate-500 mb-1.5">{label}</span>
      <input
        type="text"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="field"
      />
    </label>
  );
}

// Rich-text field (bold/italic, stored as Markdown).
function Rich({ label, hint, value, onChange, placeholder, minHeight }) {
  return (
    <div className="block">
      <span className="block text-[11px] font-medium text-slate-500 mb-1.5">{label}</span>
      <RichText value={value} onChange={onChange} placeholder={placeholder} minHeight={minHeight} />
      {hint && <span className="block text-[10px] text-slate-400 mt-1">{hint}</span>}
    </div>
  );
}

// Comma-separated tags ↔ string array. Keeps a local string so commas type smoothly.
function Tags({ label, value, onChange, placeholder }) {
  const arr = Array.isArray(value) ? value : [];
  const joined = arr.join(', ');
  const [text, setText] = useState(joined);
  const focused = useRef(false);

  // Resync when the underlying array changes externally (and we're not editing).
  useEffect(() => { if (!focused.current) setText(joined); }, [joined]);

  const commit = (s) => onChange(s.split(',').map(t => t.trim()).filter(Boolean));

  return (
    <label className="block">
      <span className="block text-[11px] font-medium text-slate-500 mb-1.5">{label}</span>
      <input
        type="text"
        value={text}
        placeholder={placeholder}
        onFocus={() => { focused.current = true; }}
        onBlur={() => { focused.current = false; setText(arr.join(', ')); }}
        onChange={e => { setText(e.target.value); commit(e.target.value); }}
        className="field"
      />
      <span className="block text-[10px] text-slate-400 mt-1">Separate with commas</span>
    </label>
  );
}

function BulletList({ label, value, onChange, placeholder }) {
  const list = Array.isArray(value) ? value : [];
  const set = (i, v) => { const a = [...list]; a[i] = v; onChange(a); };
  const add = () => onChange([...list, '']);
  const del = (i) => onChange(list.filter((_, j) => j !== i));

  // Drag-to-reorder by the grip, so the row's text stays editable.
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const drop = (target) => {
    if (dragIdx !== null && dragIdx !== target) onChange(reorder(list, dragIdx, target));
    setDragIdx(null);
    setOverIdx(null);
  };

  return (
    <div>
      <span className="block text-[11px] font-medium text-slate-500 mb-1.5">{label}</span>
      <div className="space-y-1.5">
        {list.map((b, i) => (
          <div
            key={i}
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (dragIdx !== null) setOverIdx(i); }}
            onDrop={(e) => { e.preventDefault(); drop(i); }}
            className={`flex items-start gap-1.5 rounded-lg ${overIdx === i && dragIdx !== i ? 'dnd-over' : ''} ${dragIdx === i ? 'dnd-dragging' : ''}`}
          >
            <span
              className="grip text-slate-300 hover:text-slate-500 select-none shrink-0 pt-2"
              title="Drag to reorder"
              draggable
              onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; setDragIdx(i); }}
              onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
            >
              <Grip className="w-3.5 h-3.5" />
            </span>
            <div className="flex-1 min-w-0">
              <RichText value={b} onChange={v => set(i, v)} placeholder={placeholder} minHeight={36} />
            </div>
            <IconBtn onClick={() => del(i)} title="Remove" danger>✕</IconBtn>
          </div>
        ))}
      </div>
      <button
        onClick={add}
        className="mt-1.5 text-xs text-brand-700 hover:text-brand-800 font-medium"
      >
        + Add bullet
      </button>
    </div>
  );
}

function IconBtn({ children, onClick, title, disabled, danger }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`grid place-items-center rounded-md transition shrink-0 w-6 h-6 text-xs ${
        disabled
          ? 'text-slate-300 cursor-not-allowed'
          : danger
            ? 'cursor-pointer text-slate-500 hover:text-rose-600 hover:bg-rose-50'
            : 'cursor-pointer text-slate-600 hover:text-slate-900 hover:bg-slate-200'
      }`}
    >
      {children}
    </button>
  );
}

// Six-dot drag-handle glyph, shared by sections, items, and bullets.
function Grip({ className = 'w-4 h-4' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
      <circle cx="7" cy="5" r="1.4" /><circle cx="13" cy="5" r="1.4" />
      <circle cx="7" cy="10" r="1.4" /><circle cx="13" cy="10" r="1.4" />
      <circle cx="7" cy="15" r="1.4" /><circle cx="13" cy="15" r="1.4" />
    </svg>
  );
}

function Chevron({ open, small }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
      className={`${small ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`}
    >
      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z" clipRule="evenodd" />
    </svg>
  );
}

function fmtRange(start, end) {
  const s = (start || '').trim();
  const e = (end || '').trim();
  if (s && e) return `${s} – ${e}`;
  return s || e || '';
}
