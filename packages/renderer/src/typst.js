// @resumex/renderer — Typst helpers (escaping + inline Markdown) for the Typst
// engine, which powers both the live preview and export.

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
  const ps = String(pageSize || '').toLowerCase();
  if (ps === 'a4') return 'a4';
  if (ps === 'letter' || ps === 'us-letter') return 'us-letter';
  if (ps === 'legal' || ps === 'us-legal') return 'us-legal';
  return 'a4';
}

// Renders an inline SVG icon loaded from the packages/renderer/icons directory.
// The path is absolute relative to the `--root` typst compiler option, which is
// the repository root.
export function typIcon(name, show = true) {
  if (!name || !show) return '';
  return `#box(baseline: 20%, height: 0.9em, image.decode(read("/packages/renderer/icons/${name}.svg").replace("<svg ", "<svg fill=\\"" + icon-color.to-hex() + "\\" ")))`;
}

// ── Customization resolver ─────────────────────────────────────────────────
// Each template declares its NATIVE style profile (the hand-tuned values it was
// designed with). The 1–5 level controls are RELATIVE multipliers anchored so
// that **level 3 == the template's native value (×1.0)**. An unset control
// therefore renders the template exactly as designed; nudging a level scales
// that native baseline up or down within sensible bounds.
//
// This is what lets every template keep its own typography and spacing while
// still being fully customizable — and it makes "reset to 3" reproduce the
// native look byte-for-byte (the panel default and the renderer default are the
// same anchor, so the round-trip is idempotent).
//
// `native` shape (every field optional; sensible fallbacks below):
//   pageSize, margin (Typst string), marginMm {top,bottom,left,right}, accent,
//   headerFont, bodyFont ('serif'|'sans-serif'|'mono'),
//   baseFontPt, nameFontPt, headingFontPt,            // absolute pt
//   sectionGapPt, entryGapPt,                         // absolute pt
//   leadingEm, paragraphGapEm, bulletGapEm,           // em (scale with text)
//   bulletStyle, ruleThickness, nameTransform, skillsLayout,
//   justify (bool), linkAccent (bool),
//   sideWidthCm (neat), columnRatio [left,right] (deedy)

const LEVEL = {
  // font size moves gently; gaps can swing wide; line-height is moderate.
  font:    { 1: 0.86, 2: 0.93, 3: 1.0, 4: 1.08, 5: 1.16 },
  header:  { 1: 0.80, 2: 0.90, 3: 1.0, 4: 1.14, 5: 1.30 },
  section: { 1: 0.45, 2: 0.70, 3: 1.0, 4: 1.42, 5: 1.90 },
  entry:   { 1: 0.40, 2: 0.68, 3: 1.0, 4: 1.46, 5: 1.95 },
  line:    { 1: 0.84, 2: 0.92, 3: 1.0, 4: 1.12, 5: 1.26 },
};
const mult = (table, level) => table[level] ?? table[3];

const ACCENT_COLOR_MAP = {
  blue: '#1D4ED8',
  green: '#15803D',
  orange: '#EA580C',
  red: '#DC2626',
};

const FONT_STACKS = {
  serif: '("Georgia", "Liberation Serif", "Times New Roman", "Times", "serif")',
  'sans-serif': '("Liberation Sans", "Arial", "Helvetica Neue", "Helvetica", "sans-serif")',
  mono: '("DejaVu Sans Mono", "Liberation Mono", "Consolas", "Courier New", "Courier", "monospace")',
};

const RULE_PT = { thin: 0.3, medium: 0.6, thick: 1.5 };

// Round to 2 decimals so generated Typst source stays tidy.
const r2 = (n) => Math.round(n * 100) / 100;

// Bullet markers with the accent hex baked in (so a marker that needs colour
// works in any template regardless of which Typst variables are in local scope).
// `accentTint` lets a template (e.g. deedy) colour its bullets with the accent
// no matter which glyph the user picks — so the plain "•" option matches the
// template's native accent bullet and can be pre-selected (no "Template" chip).
function bulletMarkerFor(style, accentHex, accentTint = false) {
  const tint = `rgb("${accentHex}")`;
  switch (style) {
    case 'none': return '[]'; // no marker glyph — items render flush, no bullets
    case 'dash': return accentTint ? `text(fill: ${tint})[#sym.dash.en]` : '[#sym.dash.en]';
    case 'arrow': return `box(baseline: 0.05em)[#text(fill: ${tint}, size: 0.72em)[#sym.triangle.filled.r]]`;
    case 'accent-bullet': return `text(fill: ${tint})[#sym.bullet]`;
    case 'circle': return accentTint ? `text(fill: ${tint})[#sym.circle.stroked.small]` : '[#sym.circle.stroked.small]';
    case 'bullet':
    default:
      // Tinted bullet is full-size accent (identical to the old 'accent-bullet');
      // untinted is the standard smaller ink bullet.
      return accentTint ? `text(fill: ${tint})[#sym.bullet]` : 'text(size: 0.72em)[#sym.bullet]';
  }
}

export function generateTypstStyles(opts = {}, native = {}) {
  opts = opts || {};
  native = native || {};
  const compactGap = opts.compactMode ? 0.78 : 1; // squeeze gaps in compact mode
  const compactLine = opts.compactMode ? 0.95 : 1; // gentle leading squeeze

  // ── Page size ──
  const paper = typPaper(opts.pageSize || native.pageSize || 'a4');

  // ── Margins ── native unless the user set explicit mm values. Partial edits
  // fall back to the native value per-side (not a flat 10) to stay idempotent.
  const nm = native.marginMm || {};
  let marginStr;
  if (opts.margins && Object.keys(opts.margins).length) {
    const top = opts.margins.top ?? nm.top ?? 10;
    const bottom = opts.margins.bottom ?? nm.bottom ?? 10;
    const left = opts.margins.left ?? nm.left ?? 10;
    const right = opts.margins.right ?? nm.right ?? 10;
    marginStr = `(top: ${top}mm, bottom: ${bottom}mm, left: ${left}mm, right: ${right}mm)`;
  } else if (native.margin) {
    marginStr = native.margin;
  } else {
    marginStr = '(top: 10mm, bottom: 10mm, left: 10mm, right: 10mm)';
  }

  // ── Accent ──
  let accentHex = native.accent || '#1d4ed8';
  if (opts.accentColor) accentHex = ACCENT_COLOR_MAP[opts.accentColor] || opts.accentColor;
  if (accentHex && !accentHex.startsWith('#')) accentHex = ACCENT_COLOR_MAP[accentHex] || accentHex;

  // ── Level multipliers (undefined → level 3 → ×1.0 → native) ──
  const fontMult   = mult(LEVEL.font,    opts.fontSize?.base);
  const headerMult = mult(LEVEL.header,  opts.fontSize?.headerScale);
  const sectMult   = mult(LEVEL.section, opts.spacing?.section) * compactGap;
  const entryMult  = mult(LEVEL.entry,   opts.spacing?.item) * compactGap;
  const lineMult   = mult(LEVEL.line,    opts.spacing?.lineHeight) * compactLine;

  // ── Typography (absolute pt = native × level) ──
  const baseFontPt = (native.baseFontPt ?? 11) * fontMult;
  const baseFontSize = `${r2(baseFontPt)}pt`;
  const nameFontSize = `${r2((native.nameFontPt ?? 24) * fontMult * headerMult)}pt`;
  const headingFontSize = `${r2((native.headingFontPt ?? 13) * fontMult * headerMult)}pt`;
  // Raw multiplier exposed for templates/packages that derive their own sizes.
  const headerScale = r2(headerMult);

  // ── Fonts ──
  const headerFontId = opts.fontSize?.headerFont || native.headerFont || 'sans-serif';
  const bodyFontId = opts.fontSize?.bodyFont || native.bodyFont || 'sans-serif';
  const headerFont = FONT_STACKS[headerFontId] || FONT_STACKS['sans-serif'];
  const bodyFont = FONT_STACKS[bodyFontId] || FONT_STACKS['sans-serif'];

  // ── Spacing (gaps in pt; text-relative rhythm in em) ──
  const sectionSpacing   = `${r2((native.sectionGapPt ?? 12) * sectMult)}pt`;
  const entrySpacing     = `${r2((native.entryGapPt ?? 8) * entryMult)}pt`;
  const leading          = `${r2((native.leadingEm ?? 0.6) * lineMult)}em`;
  // EVEN vertical rhythm: every gap inside an entry's body — between two wrapped
  // lines of one bullet, between two bullets, and between a description and its
  // bullets — equals the line leading. Without this, block spacing differs from
  // leading and the list looks like it alternates big/small gaps. Entries and
  // sections still use their own larger gaps (entrySpacing / sectionSpacing).
  const bulletSpacing    = leading;
  const paragraphSpacing = leading;

  // ── Style choices (native unless overridden) ──
  const bulletStyleId = opts.bulletStyle || native.bulletStyle || 'bullet';
  const bulletMarker = bulletMarkerFor(bulletStyleId, accentHex, native.bulletAccent ?? false);
  const ruleId = opts.ruleThickness || native.ruleThickness || 'medium';
  const ruleThickness = typeof ruleId === 'number'
    ? `${ruleId}pt`
    : `${RULE_PT[ruleId] ?? 0.6}pt`;
  const nameTransform = opts.nameTransform || native.nameTransform || 'normal';
  const skillsLayout = opts.skillsLayout || native.skillsLayout || 'inline';
  const justify = opts.justify ?? native.justify ?? false;
  const linkAccent = native.linkAccent ?? false;

  // ── Sidebar ── neat uses an absolute cm width; deedy uses fr column ratios.
  const sidebarWidth = opts.sidebarWidth || 'medium';
  const sideScale = { narrow: 0.82, medium: 1.0, wide: 1.22 }[sidebarWidth] ?? 1.0;
  const sideWidth = `${r2((native.sideWidthCm ?? 4) * sideScale)}cm`;
  const [cl, cr] = native.columnRatio || [1, 2.2];
  const colPair = {
    narrow: [cl * 0.78, cr * 1.16],
    medium: [cl, cr],
    wide:   [cl * 1.34, cr * 0.82],
  }[sidebarWidth] || [cl, cr];
  const columnRatioLeft = `${r2(colPair[0])}fr`;
  const columnRatioRight = `${r2(colPair[1])}fr`;

  return {
    paper,
    marginStr,
    accentHex,
    // typography
    baseFontSize,
    nameFontSize,
    headingFontSize,
    headerScale,
    headerFont,
    bodyFont,
    headerFontId,
    bodyFontId,
    // spacing
    sectionSpacing,
    entrySpacing,
    leading,
    paragraphSpacing,
    bulletSpacing,
    // legacy alias — old templates called the entry gap `itemSpacing`.
    itemSpacing: entrySpacing,
    // style choices
    bulletMarker,
    bulletStyleId,
    ruleThickness,
    nameTransform,
    skillsLayout,
    justify,
    linkAccent,
    showContactIcons: opts.showContactIcons ?? true,
    // sidebar
    sideWidth,
    columnRatioLeft,
    columnRatioRight,
  };
}

// Title-case a name ONLY when it was typed in a single case (all-caps or
// all-lowercase). Mixed-case names ("McDonald", "John Doe") are left alone.
// This is what makes the Name Style control always do something visible: without
// it, #upper / #smallcaps on an already-ALL-CAPS name produce no change.
function normalizeNameCase(s) {
  const letters = s.replace(/[^A-Za-z]/g, '');
  if (letters && (letters === letters.toUpperCase() || letters === letters.toLowerCase())) {
    return s.toLowerCase().replace(/\b([a-z])/g, (_, c) => c.toUpperCase());
  }
  return s;
}

// Wrap a name string in the Typst transform matching `nameTransform`.
// Templates call this so the Name Style control works everywhere. The base name
// is case-normalized first so each option (normal / upper / small-caps) renders
// distinctly regardless of how the user typed their name.
export function applyNameTransform(transform, content) {
  if (transform === 'upper') return `#upper[${content}]`;
  if (transform === 'small-caps') return `#smallcaps[${normalizeNameCase(content)}]`;
  return normalizeNameCase(content);
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

