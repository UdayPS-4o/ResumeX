import React, { useRef, useState, useEffect } from 'react';
import { HexColorPicker } from 'react-colorful';
import Switch from './Switch.jsx';

const ACCENT_COLORS = [
  { id: 'blue',   primary: '#1D4ED8', name: 'Blue' },
  { id: 'green',  primary: '#15803D', name: 'Green' },
  { id: 'orange', primary: '#EA580C', name: 'Orange' },
  { id: 'red',    primary: '#DC2626', name: 'Red' },
];

const FONTS = [
  { id: 'sans-serif', name: 'Sans',  family: 'system-ui, sans-serif' },
  { id: 'serif',      name: 'Serif', family: 'Georgia, serif' },
  { id: 'mono',       name: 'Mono',  family: 'monospace' },
];

// Standard options for the discrete controls. The "Template" (= native) choice
// is added automatically by <Native*> ONLY when the template's native value
// isn't one of these — so when the native already matches an option we simply
// pre-select it (no redundant Template chip), and reserve "Template" for styles
// particular to a template (e.g. a unique heading font, an accent-tinted bullet).
const BULLET_STYLES = [
  { id: 'none',   label: 'None' },
  { id: 'bullet', label: '•' },
  { id: 'dash',   label: '–' },
  { id: 'arrow',  label: '▶' },
];

const RULE_THICKNESS = [
  { id: 'thin',   label: 'Thin' },
  { id: 'medium', label: 'Mid' },
  { id: 'thick',  label: 'Thick' },
];

const SKILLS_LAYOUTS = [
  { id: 'inline',   label: 'Inline' },
  { id: 'grouped',  label: 'Grouped' },
  { id: 'bulleted', label: 'Bullets' },
];

const SIDEBAR_WIDTHS = [
  { id: 'narrow', label: 'Narrow' },
  { id: 'medium', label: 'Medium' },
  { id: 'wide',   label: 'Wide' },
];

const DENSITY_PRESETS = [
  { id: 'compact', label: 'Compact', spacing: { section: 2, item: 2, lineHeight: 2 } },
  { id: 'cozy',    label: 'Cozy',    spacing: { section: 3, item: 3, lineHeight: 3 } },
  { id: 'relaxed', label: 'Relaxed', spacing: { section: 4, item: 4, lineHeight: 4 } },
];

// If a template ships no capabilities map, assume it honours everything.
const ALL_CAPS = {
  accent: true, margins: true, fonts: true, baseSize: true, headerScale: true,
  spacing: true, lineHeight: true, bulletStyle: true, ruleThickness: true,
  nameTransform: true, skillsLayout: true, justify: true, sidebarWidth: true,
};

const DEFAULT_FORMATTING = {
  compactMode: false,
  showContactIcons: true,
  sidebarWidth: 'medium',
};

const PRESET_IDS = new Set(['blue', 'green', 'orange', 'red']);

export default function CustomizePanel({
  value, onChange, templateDefaultFonts, templateId, templateAccent,
  templateCapabilities, templateNativeMargins, templateUiDefaults,
}) {
  const settings = value || DEFAULT_FORMATTING;
  const cap = templateCapabilities || ALL_CAPS;
  const ui = templateUiDefaults || {};
  const nativeMargins = templateNativeMargins || { top: 10, bottom: 10, left: 10, right: 10 };

  const update = (patch) => onChange({ ...settings, ...patch });
  const handleMarginChange = (key, val) => update({ margins: { ...(settings.margins || {}), [key]: val } });
  // Patch several margins at once (needed for linked pairs — two separate single
  // updates would race on the same stale `settings.margins` snapshot).
  const handleMarginsChange = (patch) => update({ margins: { ...(settings.margins || {}), ...patch } });
  const handleSpacingChange = (key, val) => update({ spacing: { ...(settings.spacing || {}), [key]: val } });
  const handleFontChange = (key, val) => update({ fontSize: { ...(settings.fontSize || {}), [key]: val } });
  const handleReset = () => onChange({ ...DEFAULT_FORMATTING });

  const activeDensity = DENSITY_PRESETS.find((p) =>
    (settings.spacing?.section ?? 3) === p.spacing.section &&
    (settings.spacing?.item ?? 3) === p.spacing.item &&
    (settings.spacing?.lineHeight ?? 3) === p.spacing.lineHeight
  )?.id;

  // --- Color picker state ---
  const isCustom = !!settings.accentColor && !PRESET_IDS.has(settings.accentColor);
  const customHex = isCustom ? settings.accentColor : (templateAccent || '#1D4ED8');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerHex, setPickerHex] = useState(customHex);
  const [hexInput, setHexInput] = useState(customHex.replace('#', ''));
  const pickerRef = useRef(null);

  useEffect(() => {
    if (!isCustom) {
      const seed = templateAccent || '#1D4ED8';
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPickerHex(seed);
      setHexInput(seed.replace('#', ''));
    }
  }, [templateAccent, isCustom]);

  useEffect(() => {
    if (!pickerOpen) return;
    const handler = (e) => { if (pickerRef.current && !pickerRef.current.contains(e.target)) setPickerOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [pickerOpen]);

  const applyCustom = (hex) => {
    const clean = hex.startsWith('#') ? hex : '#' + hex;
    setPickerHex(clean);
    setHexInput(clean.replace('#', ''));
    update({ accentColor: clean });
  };

  const showSpacingSection = cap.spacing || cap.lineHeight;
  const showTypographySection = cap.baseSize || cap.headerScale || cap.fonts;
  const showStyleSection = cap.bulletStyle || cap.ruleThickness || cap.skillsLayout || cap.sidebarWidth;

  // If the template's native accent IS one of the preset swatches, pre-select
  // that swatch and drop the redundant "Template" chip (e.g. executive → Blue).
  const nativeAccentPreset = ACCENT_COLORS.find(
    (c) => c.primary.toLowerCase() === String(templateAccent || '').toLowerCase(),
  );
  const activeAccentId = settings.accentColor ?? nativeAccentPreset?.id;

  return (
    <div className="h-full overflow-y-auto bg-slate-50 px-5 py-4 space-y-6">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Template Customization
        </div>
        <p className="text-xs text-slate-500 mt-0.5 leading-snug">
          Fine-tune typography, spacing, margins and accents. Each control starts on this
          template&apos;s native design; &ldquo;Template&rdquo; marks a style unique to this template.
        </p>
      </div>

      {/* ── Accent Color ─────────────────────────────────────── */}
      {cap.accent && (
        <Section title="Accent Color">
          <div className="flex gap-2 flex-wrap items-center">
            {templateAccent && !nativeAccentPreset && (
              <button
                onClick={() => update({ accentColor: undefined })}
                className={chip(!settings.accentColor)}
                title={`Template default: ${templateAccent}`}
              >
                <span className="w-3 h-3 rounded-full shrink-0 ring-1 ring-black/10" style={{ backgroundColor: templateAccent }} />
                Template
              </button>
            )}
            {ACCENT_COLORS.map((color) => (
              <button key={color.id} onClick={() => update({ accentColor: color.id })} className={chip(activeAccentId === color.id)}>
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color.primary }} />
                {color.name}
              </button>
            ))}
            <div className="relative" ref={pickerRef}>
              <button
                onClick={() => { setPickerHex(customHex); setHexInput(customHex.replace('#', '')); setPickerOpen((o) => !o); }}
                className={chip(isCustom)}
                title="Pick a custom color"
              >
                <span
                  className="w-3 h-3 rounded-full shrink-0 ring-1 ring-black/10"
                  style={{ background: isCustom ? settings.accentColor : 'linear-gradient(135deg, #f472b6 0%, #a78bfa 35%, #34d399 65%, #fbbf24 100%)' }}
                />
                Custom
              </button>
              {pickerOpen && (
                <div className="absolute z-50 mt-2 left-0 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden" style={{ width: 240 }}>
                  <div className="p-3 pb-0">
                    <HexColorPicker color={pickerHex} onChange={(hex) => { setPickerHex(hex); setHexInput(hex.replace('#', '')); update({ accentColor: hex }); }} style={{ width: '100%', height: 180 }} />
                  </div>
                  <div className="flex items-center gap-2 px-3 py-3">
                    <span className="w-8 h-8 rounded-lg shrink-0 border border-slate-200 shadow-inner" style={{ backgroundColor: pickerHex }} />
                    <div className="flex items-center flex-1 border border-slate-200 rounded-lg overflow-hidden bg-white">
                      <span className="text-slate-400 text-xs px-2 font-mono select-none">#</span>
                      <input
                        type="text" maxLength={6} value={hexInput}
                        onChange={(e) => { const raw = e.target.value.replace(/[^0-9a-fA-F]/g, ''); setHexInput(raw); if (raw.length === 6) applyCustom('#' + raw); }}
                        onBlur={() => { if (hexInput.length === 6) applyCustom('#' + hexInput); else setHexInput(pickerHex.replace('#', '')); }}
                        className="text-xs font-mono text-slate-700 flex-1 py-1.5 pr-2 bg-transparent outline-none uppercase w-0"
                        spellCheck={false}
                      />
                    </div>
                  </div>
                  <div className="px-3 pb-3">
                    <div className="text-[10px] text-slate-400 font-medium mb-1.5 uppercase tracking-wider">Popular</div>
                    <div className="flex gap-1.5 flex-wrap">
                      {['#1D4ED8','#0d9488','#7c3aed','#ea580c','#dc2626','#db2777','#0891b2','#059669','#d97706','#4f46e5','#111827','#374151'].map((hex) => (
                        <button key={hex} onClick={() => applyCustom(hex)} className="w-5 h-5 rounded-md border border-slate-200 hover:scale-110 transition-transform ring-offset-1 hover:ring-2 hover:ring-brand-400 shrink-0" style={{ backgroundColor: hex }} title={hex} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

        </Section>
      )}

      {/* ── Density preset ───────────────────────────────────── */}
      {cap.spacing && (
        <>
          <Divider />
          <Section title="Density">
            <div className="flex gap-1.5">
              {DENSITY_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => update({ spacing: { ...p.spacing } })}
                  className={`flex-1 px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
                    activeDensity === p.id
                      ? 'border-brand-500 bg-white ring-2 ring-brand-200 text-brand-700 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </Section>
        </>
      )}

      {/* ── Margins ──────────────────────────────────────────── */}
      {cap.margins && (
        <>
          <Divider />
          <Section title="Margins (mm)">
            <MarginsGrid margins={settings.margins} native={nativeMargins} onChange={handleMarginsChange} />
          </Section>
        </>
      )}

      {/* ── Spacing & Layout ─────────────────────────────────── */}
      {showSpacingSection && (
        <>
          <Divider />
          <Section title="Spacing & Layout">
            <div className="space-y-3">
              {cap.spacing && <LevelSelector label="Section Gap" value={settings.spacing?.section ?? 3} onChange={(v) => handleSpacingChange('section', v)} />}
              {cap.spacing && <LevelSelector label="Item Gap" value={settings.spacing?.item ?? 3} onChange={(v) => handleSpacingChange('item', v)} />}
              {cap.lineHeight && <LevelSelector label="Line Height" value={settings.spacing?.lineHeight ?? 3} onChange={(v) => handleSpacingChange('lineHeight', v)} />}
            </div>
          </Section>
        </>
      )}

      {/* ── Typography ───────────────────────────────────────── */}
      {showTypographySection && (
        <>
          <Divider />
          <Section title="Typography">
            <div className="space-y-3.5">
              {cap.baseSize && <LevelSelector label="Base Font Size" value={settings.fontSize?.base ?? 3} onChange={(v) => handleFontChange('base', v)} />}
              {cap.headerScale && <LevelSelector label="Header Scale" value={settings.fontSize?.headerScale ?? 3} onChange={(v) => handleFontChange('headerScale', v)} />}

              {cap.fonts && (
                <NativeFontRow
                  label="Header Font"
                  nativeId={'headerFont' in ui ? ui.headerFont : (templateDefaultFonts?.header ?? null)}
                  value={settings.fontSize?.headerFont} onChange={(id) => handleFontChange('headerFont', id)}
                />
              )}
              {cap.fonts && (
                <NativeFontRow
                  label="Body Font"
                  nativeId={'bodyFont' in ui ? ui.bodyFont : (templateDefaultFonts?.body ?? null)}
                  value={settings.fontSize?.bodyFont} onChange={(id) => handleFontChange('bodyFont', id)}
                />
              )}

            </div>
          </Section>
        </>
      )}

      {/* ── Style Details ─────────────────────────────────────── */}
      {showStyleSection && (
        <>
          <Divider />
          <Section title="Style Details">
            <div className="space-y-3">
              {cap.bulletStyle && (
                <NativeSegmented label="Bullet Style" options={BULLET_STYLES} nativeId={ui.bulletStyle} value={settings.bulletStyle} onChange={(id) => update({ bulletStyle: id })} />
              )}
              {cap.ruleThickness && (
                <NativeSegmented label="Section Rules" options={RULE_THICKNESS} nativeId={ui.ruleThickness} value={settings.ruleThickness} onChange={(id) => update({ ruleThickness: id })} />
              )}
              {cap.skillsLayout && (
                <NativeSegmented label="Skills Layout" options={SKILLS_LAYOUTS} nativeId={ui.skillsLayout} value={settings.skillsLayout} onChange={(id) => update({ skillsLayout: id })} />
              )}
              {cap.sidebarWidth && (
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-slate-600">Sidebar Width</span>
                    <span className="ml-1.5 text-[10px] text-slate-400">(this template)</span>
                  </div>
                  <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    {SIDEBAR_WIDTHS.map((w) => (
                      <button key={w.id} onClick={() => update({ sidebarWidth: w.id })} className={seg((settings.sidebarWidth ?? 'medium') === w.id)}>
                        {w.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Section>
        </>
      )}

      {/* ── Options (Toggles) ────────────────────────────────── */}
      <Divider />
      <Section title="Options">
        <div className="space-y-3">
          {cap.inlineHeadline && (
            <Toggle checked={settings.inlineHeadline ?? ui.inlineHeadline ?? true} onChange={(v) => update({ inlineHeadline: v })} label="Inline headline" description="Display the headline on the same line as the name" />
          )}
          {cap.spacing && (
            <Toggle checked={settings.compactMode ?? false} onChange={(v) => update({ compactMode: v })} label="Compact spacing mode" description="Tightens section and item gaps" />
          )}
          {cap.justify && (
            <Toggle checked={settings.justify ?? false} onChange={(v) => update({ justify: v })} label="Justify body text" description="Align paragraphs to both margins" />
          )}
          <Toggle checked={settings.showContactIcons ?? true} onChange={(v) => update({ showContactIcons: v })} label="Show contact icons" description="Display phone, email and social icons" />
        </div>
      </Section>

      {/* ── Reset ────────────────────────────────────────────── */}
      <div className="pt-2 pb-4">
        <button
          onClick={handleReset}
          className="w-full text-xs py-2 rounded-lg border border-dashed border-slate-300 text-slate-600 hover:text-slate-900 hover:border-slate-400 bg-white transition font-medium"
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

const chip = (active) =>
  `flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
    active ? 'border-brand-500 bg-white ring-2 ring-brand-200 text-brand-700 shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
  }`;

const seg = (active) =>
  `px-2.5 py-1 rounded-md text-xs font-semibold transition ${active ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`;

function Section({ title, children }) {
  return (
    <div className="space-y-2.5">
      <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">{title}</h4>
      {children}
    </div>
  );
}

function Divider() {
  return <hr className="border-slate-200" />;
}

const clampMargin = (n) => Math.max(5, Math.min(30, n));

// Four separate margin boxes, each in its own white card, arranged as two pairs:
// Top/Bottom on one row and Left/Right on the next. Each row has its own sync
// toggle floating between its two boxes — so Top/Bottom and Left/Right link
// independently of each other.
function MarginsGrid({ margins, native, onChange }) {
  const get = (k) => Math.round(margins?.[k] ?? native?.[k] ?? 10);
  return (
    <div className="space-y-3">
      <MarginPairRow aKey="top"  bKey="bottom" get={get} onChange={onChange} />
      <MarginPairRow aKey="left" bKey="right"  get={get} onChange={onChange} />
    </div>
  );
}

const titleCase = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// One row: two side-by-side margin boxes with a sync toggle between them. When
// synced, dragging either slider moves both by the same delta (asymmetry kept).
function MarginPairRow({ aKey, bKey, get, onChange }) {
  const [synced, setSynced] = useState(true);

  const setOne = (key, other, v) => {
    if (!synced) return onChange({ [key]: v });
    const d = v - get(key);
    onChange({ [key]: v, [other]: clampMargin(get(other) + d) });
  };

  return (
    <div className="relative grid grid-cols-2 gap-3">
      <MarginSlider label={titleCase(aKey)} value={get(aKey)} onChange={(v) => setOne(aKey, bKey, v)} />
      <MarginSlider label={titleCase(bKey)} value={get(bKey)} onChange={(v) => setOne(bKey, aKey, v)} />

      {/* Link toggle for this pair, centred between the two boxes. */}
      <button
        type="button"
        onClick={() => setSynced((s) => !s)}
        aria-pressed={synced}
        title={synced
          ? `Linked — ${titleCase(aKey)} & ${titleCase(bKey)} move together. Click to unlink.`
          : `Click to link ${titleCase(aKey)} & ${titleCase(bKey)}.`}
        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-8 h-8 grid place-items-center rounded-full border-2 shadow-sm transition ${
          synced
            ? 'border-slate-300 bg-slate-100 text-slate-600'
            : 'border-slate-200 bg-white text-slate-400 hover:text-slate-600 hover:border-slate-300'
        }`}
      >
        {synced ? <LinkIcon /> : <UnlinkIcon />}
      </button>
    </div>
  );
}

// A single margin slider in its own white card.
function MarginSlider({ label, value, onChange }) {
  return (
    <div className="flex flex-col gap-1.5 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
      <div className="flex justify-between items-center">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        <span className="text-xs font-bold text-slate-700 font-mono">{value} mm</span>
      </div>
      <input type="range" min={5} max={30} value={value} onChange={(e) => onChange(parseInt(e.target.value, 10))} className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600" />
    </div>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M8.5 11.5a2.5 2.5 0 0 0 3.6.05l2.4-2.4a2.55 2.55 0 0 0-3.6-3.6l-1.1 1.1" />
      <path d="M11.5 8.5a2.5 2.5 0 0 0-3.6-.05l-2.4 2.4a2.55 2.55 0 0 0 3.6 3.6l1.1-1.1" />
    </svg>
  );
}

function UnlinkIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M9 6.5 11.4 4.1a2.55 2.55 0 0 1 3.6 3.6L13.2 9.5" />
      <path d="M11 13.5 8.6 15.9a2.55 2.55 0 0 1-3.6-3.6l1.8-1.8" />
      <path d="M4 4l12 12" />
    </svg>
  );
}

function LevelSelector({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
        {[1, 2, 3, 4, 5].map((level) => (
          <button key={level} onClick={() => onChange(level)} className={`w-7 h-6 rounded-md text-xs font-semibold font-mono transition ${value === level ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
            {level}
          </button>
        ))}
      </div>
    </div>
  );
}

// Segmented control that pre-selects the template's native option. A "Template"
// choice (clears the override) is shown ONLY when the native value isn't one of
// the standard options — i.e. it's particular to this template.
function NativeSegmented({ label, options, nativeId, value, onChange }) {
  const standardIds = options.map((o) => o.id);
  const particular = nativeId == null || !standardIds.includes(nativeId);
  const items = particular ? [{ id: '__native__', label: 'Template' }, ...options] : options;
  const selected = value != null ? value : (particular ? '__native__' : nativeId);
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs font-medium text-slate-600 shrink-0">{label}</span>
      <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
        {items.map((o) => (
          <button
            key={o.id}
            onClick={() => onChange(o.id === '__native__' ? undefined : o.id)}
            className={seg(o.id === selected)}
            title={o.id === '__native__' ? "This template's own style" : undefined}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// Font picker that pre-selects the native font. Shows a "Template" choice only
// when the native font is particular (e.g. Fira Sans / Mulish — not Sans/Serif/Mono).
function NativeFontRow({ label, nativeId, value, onChange }) {
  const standardIds = FONTS.map((f) => f.id);
  const particular = nativeId == null || !standardIds.includes(nativeId);
  const items = particular ? [{ id: '__native__', name: 'Template', family: 'inherit' }, ...FONTS] : FONTS;
  const selected = value != null ? value : (particular ? '__native__' : nativeId);
  return (
    <div className="flex items-center justify-between">
      <div>
        <span className="text-xs font-medium text-slate-600">{label}</span>
        <span className="ml-1.5 text-[10px] text-slate-400">(native: {particular ? 'template' : nativeId})</span>
      </div>
      <div className="flex gap-1.5">
        {items.map((f) => (
          <button
            key={f.id}
            onClick={() => onChange(f.id === '__native__' ? undefined : f.id)}
            style={{ fontFamily: f.family }}
            className={`px-2.5 py-1 text-xs border rounded-lg transition font-medium ${
              f.id === selected ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
            }`}
            title={f.id === '__native__' ? "This template's own font" : undefined}
          >
            {f.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function Toggle({ checked, onChange, label, description }) {
  return (
    <div className="flex items-center justify-between gap-3 group">
      <span
        onClick={() => onChange(!checked)}
        className="text-xs font-medium text-slate-700 group-hover:text-slate-900 transition cursor-pointer select-none"
      >
        {label}
        {description && <span className="block text-[10px] text-slate-400 font-normal">{description}</span>}
      </span>
      <Switch checked={checked} onChange={onChange} aria-label={label} />
    </div>
  );
}
