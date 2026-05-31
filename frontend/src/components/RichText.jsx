import { useEffect, useRef } from 'react';

// Lightweight WYSIWYG editor that stores Markdown (**bold**, *italic*).
// Resumes only need inline emphasis, so we keep it to bold/italic — which keeps
// the stored value ATS-safe plain text that every LaTeX template can render.

// ── markdown ⇄ html ──────────────────────────────────────────────────────────

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Markdown → HTML for the editable surface.
function mdToHtml(md) {
  if (!md) return '';
  let h = escapeHtml(md);
  // bold first (** **), then italic (* *). Non-greedy, no nesting needed for resumes.
  h = h.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  h = h.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return h;
}

// HTML (from contentEditable) → Markdown.
function htmlToMd(node) {
  let out = '';
  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      out += child.textContent;
      return;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) return;
    const tag = child.tagName.toLowerCase();
    const inner = htmlToMd(child);
    if (tag === 'br') out += '\n';
    else if (tag === 'b' || tag === 'strong') out += inner.trim() ? `**${inner}**` : inner;
    else if (tag === 'i' || tag === 'em') out += inner.trim() ? `*${inner}*` : inner;
    else if (tag === 'div' || tag === 'p') out += (out && !out.endsWith('\n') ? '\n' : '') + inner;
    else out += inner;
  });
  return out;
}

export default function RichText({ value, onChange, placeholder, minHeight = 64, singleLine = false }) {
  const ref = useRef(null);
  const focused = useRef(false);

  // Push external value into the DOM only when not actively editing, so the
  // caret never jumps while typing.
  useEffect(() => {
    if (focused.current) return;
    const el = ref.current;
    if (!el) return;
    const html = mdToHtml(value || '');
    if (el.innerHTML !== html) el.innerHTML = html;
  }, [value]);

  const emit = () => {
    const el = ref.current;
    if (!el) return;
    let md = htmlToMd(el).replace(/ /g, ' ');
    if (singleLine) md = md.replace(/\n+/g, ' ');
    md = md.replace(/[ \t]+\n/g, '\n').trimStart();
    onChange(md);
  };

  const exec = (cmd) => { document.execCommand(cmd, false); ref.current?.focus(); emit(); };

  const onKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) { e.preventDefault(); exec('bold'); }
    else if ((e.ctrlKey || e.metaKey) && (e.key === 'i' || e.key === 'I')) { e.preventDefault(); exec('italic'); }
    else if (singleLine && e.key === 'Enter') { e.preventDefault(); }
  };

  const empty = !(value && value.trim());

  return (
    <div className="rt">
      <div className="rt-toolbar">
        <RtBtn label="Bold (Ctrl+B)" onClick={() => exec('bold')}>
          <span className="font-bold">B</span>
        </RtBtn>
        <RtBtn label="Italic (Ctrl+I)" onClick={() => exec('italic')}>
          <span className="italic font-serif">I</span>
        </RtBtn>
        <span className="rt-hint">Select text, then format</span>
      </div>
      <div className="rt-surface-wrap">
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          onFocus={() => { focused.current = true; }}
          onBlur={() => { focused.current = false; emit(); }}
          onInput={emit}
          onKeyDown={onKeyDown}
          className="rt-surface"
          style={{ minHeight }}
        />
        {empty && <div className="rt-placeholder" style={{ minHeight }}>{placeholder}</div>}
      </div>
    </div>
  );
}

function RtBtn({ children, label, onClick }) {
  return (
    <button
      type="button"
      title={label}
      // Use onMouseDown so the contentEditable keeps its selection when clicked.
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className="w-7 h-7 grid place-items-center rounded-md text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm transition text-sm"
    >
      {children}
    </button>
  );
}
