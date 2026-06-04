// @resumex/renderer — Typst helpers (escaping + inline Markdown), mirroring
// latex.js for the Typst engine. Typst compiles ~25x faster than the LaTeX path,
// so it powers both the live preview and export.

// Escape characters that have markup meaning in Typst *content* mode so that
// arbitrary user text renders literally. The single-pass callback prepends a
// backslash to each, so the backslash itself (matched first in the class) is
// safely doubled.
export function typ(value) {
  if (value === undefined || value === null) return '';
  return String(value).replace(/[\\#$*_`\[\]<>@]/g, (ch) => '\\' + ch);
}

// Escape text AND convert inline Markdown (**bold**, *italic*) to Typst calls.
// Used for any free-text field a user might format (summary, bullets, etc.).
export function typMd(value) {
  if (value === undefined || value === null) return '';
  const parts = String(value).split(/(\*\*[^*]+\*\*|\*[^*]+\*|\+\+[^+]+\+\+)/g);
  return parts
    .map((p) => {
      if (/^\*\*[^*]+\*\*$/.test(p)) return `#strong[${typ(p.slice(2, -2))}]`;
      if (/^\*[^*]+\*$/.test(p)) return `#emph[${typ(p.slice(1, -1))}]`;
      if (/^\+\+[^+]+\+\+$/.test(p)) return `#highlight(fill: rgb("#dcfce7"), extent: 1pt)[${typ(p.slice(2, -2))}]`;
      return typ(p);
    })
    .join('');
}

export function shortenUrl(url) {
  if (!url) return '';
  let s = String(url).replace(/^https?:\/\/(www\.)?/, '');
  s = s.replace(/\/$/, '');
  if (s.startsWith('github.com/')) {
    s = s.substring('github.com/'.length);
  } else if (s.startsWith('linkedin.com/in/')) {
    s = s.substring('linkedin.com/in/'.length);
  }
  return s;
}

// A URL as a Typst #link("url")[display]. JSON.stringify yields a valid Typst
// string literal (Typst supports the same \" and \\ escapes).
export function typLink(url, display) {
  if (!url) return '';
  const d = display || shortenUrl(url);
  return `#link(${JSON.stringify(String(url))})[${typ(d)}]`;
}

// Date range; either side may be missing. Typst renders "---" as an em dash.
export function typDate(start, end) {
  if (!start && !end) return '';
  if (start && end) return `${typ(start)} --- ${typ(end)}`;
  return typ(start || end);
}

// Map the app's pageSize to a Typst paper name.
export function typPaper(pageSize) {
  if (pageSize === 'a4') return 'a4';
  if (pageSize === 'letter') return 'us-letter';
  if (pageSize === 'legal') return 'us-legal';
  return 'a4';
}

// Renders an inline SVG icon loaded from the packages/renderer/icons directory.
// The path is absolute relative to the `--root` typst compiler option, which is
// the repository root.
export function typIcon(name) {
  if (!name) return '';
  return `#box(baseline: 20%, height: 0.9em, image.decode(read("/packages/renderer/icons/${name}.svg").replace("<svg ", "<svg fill=\\"" + icon-color.to-hex() + "\\" ")))`;
}

// Built-in default section headings.
export const DEFAULT_SECTION_TITLES = {
  summary: 'Summary',
  experience: 'Experience',
  education: 'Education',
  projects: 'Projects',
  skills: 'Skills',
  certifications: 'Certifications',
  awards: 'Awards',
};

// Resolve a section's heading: a user override (resume.sectionTitles[key]) wins,
// then the template's fallback, then the built-in default.
export function sectionTitle(resume, key, fallback) {
  const custom = resume?.sectionTitles?.[key];
  if (custom && String(custom).trim()) return String(custom).trim();
  return fallback || DEFAULT_SECTION_TITLES[key] || key;
}

// Order rendered section blocks. `blocks` maps sectionKey -> rendered string
// (falsy/empty entries are skipped). The resume's explicit `sectionOrder`
// (when non-empty) wins; otherwise the template's `fallbackOrder` is used.
// Any keys present in `blocks` but missing from the order are appended last.
export function orderSections(blocks, fallbackOrder, explicitOrder) {
  const order = (Array.isArray(explicitOrder) && explicitOrder.length) ? explicitOrder : fallbackOrder;
  const out = [];
  const seen = new Set();
  for (const k of order || []) {
    if (blocks[k]) out.push(blocks[k]);
    seen.add(k);
  }
  for (const k of Object.keys(blocks)) {
    if (!seen.has(k) && blocks[k]) out.push(blocks[k]);
  }
  return out;
}

