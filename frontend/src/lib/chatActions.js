// Validation + normalization for the chat ACTIONS channel.
//
// The chat model proposes app actions (styling, template, page, documents,
// opening tools) alongside its message. We sanitize everything here BEFORE the
// Editor executes it, so a hallucinated value can never corrupt state or the
// live preview — unknown action types are dropped, enums are checked, levels and
// margins are clamped, hex colours are validated.
//
// Keep these enums in sync with CustomizePanel.jsx (the manual controls) and the
// renderer's generateTypstStyles (packages/renderer/src/typst.js, the keys it
// actually honours). The prompt catalogue lives in
// packages/llm/src/prompts/builder.js (buildActionsSection) — update both together.

const FONTS = ['sans-serif', 'serif', 'mono'];
const ACCENT_PRESETS = ['blue', 'green', 'orange', 'red'];
const BULLET_STYLES = ['none', 'bullet', 'dash', 'arrow'];
const RULE_THICKNESS = ['thin', 'medium', 'thick'];
const SKILLS_LAYOUTS = ['inline', 'grouped', 'bulleted'];
const SIDEBAR_WIDTHS = ['narrow', 'medium', 'wide'];
const NAME_TRANSFORMS = ['normal', 'uppercase', 'small-caps', 'lowercase', 'none'];
const PAGE_SIZES = ['a4', 'legal'];
const TONES = ['professional', 'warm', 'direct'];
const CHANNELS = ['linkedin', 'email'];

// Quick density presets → spacing levels (mirrors CustomizePanel DENSITY_PRESETS).
const DENSITY = {
  compact: { section: 2, item: 2, lineHeight: 2 },
  cozy: { section: 3, item: 3, lineHeight: 3 },
  relaxed: { section: 4, item: 4, lineHeight: 4 },
};

// Sentinels the model might use to mean "clear this override, back to native".
// Deliberately excludes 'none' — that's a real bulletStyle value.
const CLEAR = new Set(['', 'template', 'native', 'default', 'unset', 'reset']);

const clampLevel = (n) => Math.max(1, Math.min(5, Math.round(Number(n))));
const clampMargin = (n) => Math.max(5, Math.min(30, Math.round(Number(n))));
const isNum = (n) => typeof n === 'number' ? Number.isFinite(n) : (typeof n === 'string' && n.trim() !== '' && !Number.isNaN(Number(n)));
const inEnum = (v, list) => typeof v === 'string' && list.includes(v);
const isClear = (v) => v == null || (typeof v === 'string' && CLEAR.has(v.trim().toLowerCase()));

function normHex(s) {
  let h = String(s).trim().toLowerCase();
  if (!h.startsWith('#')) h = '#' + h;
  if (/^#[0-9a-f]{3}$/.test(h)) h = '#' + h.slice(1).split('').map((c) => c + c).join('');
  return /^#[0-9a-f]{6}$/.test(h) ? h : null;
}

// Deep-ish merge so a partial styling patch (e.g. only spacing.section) doesn't
// wipe its siblings (spacing.item). One level deep is all formatting needs.
export function mergeFormatting(current = {}, patch = {}) {
  const out = { ...current };
  for (const [k, v] of Object.entries(patch)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && current[k] && typeof current[k] === 'object') {
      out[k] = { ...current[k], ...v };
    } else {
      out[k] = v; // primitives, arrays, or undefined (= clear to native)
    }
  }
  return out;
}

// Turn a raw `formatting` object from the model into a safe partial patch.
// `capabilities` is the target template's capability map; controls it doesn't
// honour are dropped so we never show a chip for a change that wouldn't render.
export function normalizeFormatting(raw, capabilities = null) {
  if (!raw || typeof raw !== 'object') return null;
  const allow = (k) => !capabilities || capabilities[k];
  const out = {};

  // Density preset is a shortcut for the three spacing levels.
  if (raw.density && DENSITY[raw.density] && allow('spacing')) {
    out.spacing = { ...DENSITY[raw.density] };
  }

  // Accent: preset id, hex, or a clear-to-native sentinel.
  if (allow('accent') && 'accentColor' in raw) {
    const v = raw.accentColor;
    if (isClear(v)) out.accentColor = undefined;
    else if (inEnum(v, ACCENT_PRESETS)) out.accentColor = v;
    else { const hex = normHex(v); if (hex) out.accentColor = hex; }
  }

  // Spacing levels (may layer over a density preset).
  const s = raw.spacing && typeof raw.spacing === 'object' ? raw.spacing : {};
  const sp = {};
  if (allow('spacing') && isNum(s.section)) sp.section = clampLevel(s.section);
  if (allow('spacing') && isNum(s.item)) sp.item = clampLevel(s.item);
  if (allow('lineHeight') && isNum(s.lineHeight)) sp.lineHeight = clampLevel(s.lineHeight);
  if (Object.keys(sp).length) out.spacing = { ...(out.spacing || {}), ...sp };

  // Typography.
  const f = raw.fontSize && typeof raw.fontSize === 'object' ? raw.fontSize : {};
  const fs = {};
  if (allow('baseSize') && isNum(f.base)) fs.base = clampLevel(f.base);
  if (allow('headerScale') && isNum(f.headerScale)) fs.headerScale = clampLevel(f.headerScale);
  if (allow('fonts') && 'headerFont' in f) { if (inEnum(f.headerFont, FONTS)) fs.headerFont = f.headerFont; else if (isClear(f.headerFont)) fs.headerFont = undefined; }
  if (allow('fonts') && 'bodyFont' in f) { if (inEnum(f.bodyFont, FONTS)) fs.bodyFont = f.bodyFont; else if (isClear(f.bodyFont)) fs.bodyFont = undefined; }
  if (Object.keys(fs).length) out.fontSize = fs;

  // Margins (mm).
  if (allow('margins') && raw.margins && typeof raw.margins === 'object') {
    const m = {};
    for (const k of ['top', 'bottom', 'left', 'right']) if (isNum(raw.margins[k])) m[k] = clampMargin(raw.margins[k]);
    if (Object.keys(m).length) out.margins = m;
  }

  // Discrete style choices (each can be cleared back to native).
  for (const [key, list, capKey] of [
    ['bulletStyle', BULLET_STYLES, 'bulletStyle'],
    ['ruleThickness', RULE_THICKNESS, 'ruleThickness'],
    ['skillsLayout', SKILLS_LAYOUTS, 'skillsLayout'],
    ['nameTransform', NAME_TRANSFORMS, 'nameTransform'],
  ]) {
    if (!allow(capKey) || !(key in raw)) continue;
    const v = raw[key];
    if (inEnum(v, list)) out[key] = v;
    else if (isClear(v)) out[key] = undefined;
  }
  if (allow('sidebarWidth') && inEnum(raw.sidebarWidth, SIDEBAR_WIDTHS)) out.sidebarWidth = raw.sidebarWidth;

  // Boolean toggles.
  for (const [key, capKey] of [['compactMode', 'spacing'], ['justify', 'justify'], ['inlineHeadline', 'inlineHeadline'], ['showContactIcons', null]]) {
    if ((capKey === null || allow(capKey)) && typeof raw[key] === 'boolean') out[key] = raw[key];
  }

  return Object.keys(out).length ? out : null;
}

// Validate a raw actions array from the model. Returns a clean array (possibly
// empty); never throws. `templates` gates set_template, `capabilities` gates the
// styling keys inside set_formatting.
export function validateActions(raw, { templates = [], capabilities = null } = {}) {
  if (!Array.isArray(raw)) return [];
  const ids = new Set(templates.map((t) => t.id));
  const out = [];
  for (const a of raw) {
    if (!a || typeof a !== 'object' || typeof a.type !== 'string') continue;
    switch (a.type) {
      case 'set_formatting': {
        const formatting = normalizeFormatting(a.formatting, capabilities);
        if (formatting) out.push({ type: 'set_formatting', formatting });
        break;
      }
      case 'reset_formatting':
        out.push({ type: 'reset_formatting' });
        break;
      case 'set_template':
        if (ids.has(a.templateId)) out.push({ type: 'set_template', templateId: a.templateId });
        break;
      case 'set_page_size':
        if (inEnum(a.pageSize, PAGE_SIZES)) out.push({ type: 'set_page_size', pageSize: a.pageSize });
        break;
      case 'set_title':
        if (typeof a.title === 'string' && a.title.trim()) out.push({ type: 'set_title', title: a.title.trim().slice(0, 120) });
        break;
      case 'generate_cover_letter':
        out.push({ type: 'generate_cover_letter', tone: inEnum(a.tone, TONES) ? a.tone : 'professional', jobDescription: typeof a.jobDescription === 'string' ? a.jobDescription : '' });
        break;
      case 'generate_outreach':
        out.push({ type: 'generate_outreach', channel: inEnum(a.channel, CHANNELS) ? a.channel : 'linkedin' });
        break;
      case 'open_tailor':
      case 'open_documents':
      case 'open_strengthen':
      case 'open_ats':
      case 'download_pdf':
        out.push({ type: a.type });
        break;
      default:
        break; // unknown action → ignore
    }
  }
  return out;
}

// Apply order: layout/page first (set_template resets formatting), then styling,
// then rename, then async generators, then navigation. Keeps a "switch template
// AND recolor" request deterministic regardless of the model's array order.
const ORDER = {
  set_template: 0, set_page_size: 1, reset_formatting: 2, set_formatting: 3, set_title: 4,
  generate_cover_letter: 5, generate_outreach: 5,
  open_tailor: 6, open_documents: 6, open_strengthen: 6, open_ats: 6, download_pdf: 6,
};
export function orderActions(actions) {
  return [...actions].sort((a, b) => (ORDER[a.type] ?? 9) - (ORDER[b.type] ?? 9));
}

// Actions whose effect a single snapshot-restore can undo (a styling batch).
export const STYLE_ACTION_TYPES = new Set(['set_formatting', 'reset_formatting', 'set_template', 'set_page_size', 'set_title']);

// ── Human-readable summaries (for the chat confirmation chips) ────────────────

const ACCENT_NAMES = { blue: 'Blue', green: 'Green', orange: 'Orange', red: 'Red' };
const FONT_NAMES = { 'sans-serif': 'Sans', serif: 'Serif', mono: 'Mono' };
const fontName = (id) => (id == null ? 'template' : FONT_NAMES[id] || id);
const cap1 = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function describeFormatting(f) {
  const bits = [];
  if ('accentColor' in f) bits.push(`accent → ${f.accentColor === undefined ? 'template' : (ACCENT_NAMES[f.accentColor] || f.accentColor)}`);
  if (f.spacing) {
    const p = [];
    if (f.spacing.section != null) p.push(`section ${f.spacing.section}`);
    if (f.spacing.item != null) p.push(`item ${f.spacing.item}`);
    if (f.spacing.lineHeight != null) p.push(`line ${f.spacing.lineHeight}`);
    if (p.length) bits.push(`spacing (${p.join(', ')})`);
  }
  if (f.fontSize) {
    if (f.fontSize.base != null) bits.push(`text size ${f.fontSize.base}`);
    if (f.fontSize.headerScale != null) bits.push(`header size ${f.fontSize.headerScale}`);
    if ('headerFont' in f.fontSize) bits.push(`header font ${fontName(f.fontSize.headerFont)}`);
    if ('bodyFont' in f.fontSize) bits.push(`body font ${fontName(f.fontSize.bodyFont)}`);
  }
  if (f.margins) bits.push('margins');
  if ('bulletStyle' in f) bits.push(`bullets ${f.bulletStyle ?? 'template'}`);
  if ('ruleThickness' in f) bits.push(`rules ${f.ruleThickness ?? 'template'}`);
  if ('skillsLayout' in f) bits.push(`skills ${f.skillsLayout ?? 'template'}`);
  if ('sidebarWidth' in f) bits.push(`sidebar ${f.sidebarWidth}`);
  if ('nameTransform' in f) bits.push(`name ${f.nameTransform ?? 'template'}`);
  if ('compactMode' in f) bits.push(f.compactMode ? 'compact on' : 'compact off');
  if ('justify' in f) bits.push(f.justify ? 'justified' : 'unjustified');
  if ('inlineHeadline' in f) bits.push(f.inlineHeadline ? 'inline headline' : 'stacked headline');
  if ('showContactIcons' in f) bits.push(f.showContactIcons ? 'contact icons on' : 'contact icons off');
  return bits.length ? cap1(bits.join(' · ')) : 'Updated styling';
}

// A short label for an executed action, shown as a chip in the chat.
export function describeAction(action, { templates = [] } = {}) {
  const tName = (id) => templates.find((t) => t.id === id)?.name || id;
  switch (action.type) {
    case 'set_formatting': return describeFormatting(action.formatting);
    case 'reset_formatting': return 'Reset styling to template default';
    case 'set_template': return `Template → ${tName(action.templateId)}`;
    case 'set_page_size': return `Page size → ${action.pageSize === 'legal' ? 'Long' : 'A4'}`;
    case 'set_title': return `Renamed to “${action.title}”`;
    case 'generate_cover_letter': return `Cover letter (${action.tone})`;
    case 'generate_outreach': return `Outreach · ${action.channel === 'email' ? 'Email' : 'LinkedIn'}`;
    case 'open_tailor': return 'Opened Tailor to a job';
    case 'open_documents': return 'Opened Documents';
    case 'open_strengthen': return 'Opened Strengthen';
    case 'open_ats': return 'Opened ATS report';
    case 'download_pdf': return 'Downloading PDF';
    default: return action.type;
  }
}
