// Escape user-supplied text so it's safe to drop into a LaTeX source string.
// We don't try to support LaTeX commands inside content — only plain text.
const REPLACEMENTS = [
  [/\\/g, '\\textbackslash{}'],
  [/&/g, '\\&'],
  [/%/g, '\\%'],
  [/\$/g, '\\$'],
  [/#/g, '\\#'],
  [/_/g, '\\_'],
  [/\{/g, '\\{'],
  [/\}/g, '\\}'],
  [/~/g, '\\textasciitilde{}'],
  [/\^/g, '\\textasciicircum{}'],
];

export function tex(value) {
  if (value === undefined || value === null) return '';
  let s = String(value);
  for (const [pat, rep] of REPLACEMENTS) s = s.replace(pat, rep);
  return s;
}

// Join a list with " {sep} " skipping empties, then return as one escaped string.
export function joinTex(parts, sep = ' \\textbar{} ') {
  return parts.filter(p => p && String(p).trim()).map(tex).join(sep);
}

// Convert a URL into a clickable \href{}{display} pair.
export function hrefTex(url, display) {
  if (!url) return '';
  const d = display || url.replace(/^https?:\/\//, '');
  return `\\href{${url}}{${tex(d)}}`;
}

// Format a date range; either or both sides may be missing.
export function dateRange(start, end) {
  if (!start && !end) return '';
  if (start && end) return `${tex(start)} -- ${tex(end)}`;
  return tex(start || end);
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
