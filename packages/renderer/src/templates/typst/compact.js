// Compact technical resume — Typst port of the LaTeX `compact` layout.
// Dense single column, tight spacing, purple accent, thin rule-under headings.
// The goal is to fit a lot cleanly on one page (great for senior engineers).
// Compiles via the Typst engine (format: 'typst').

import { sectionTitle, orderSections, generateTypstStyles, applyNameTransform } from '../../typst.js';
import { typ, typMd, typLink, typDate, typPaper, typIcon } from '../../typst.js';

// Native style profile — the values this template was hand-tuned with. The
// customization levels scale these (level 3 == native), so an untouched resume
// renders exactly like the original design. See generateTypstStyles().
const NATIVE = {
  pageSize: 'a4',
  margin: '(left: 0.5in, right: 0.5in, top: 0.5in, bottom: 0.5in)',
  marginMm: { top: 12.7, bottom: 12.7, left: 12.7, right: 12.7 },
  accent: '#7c3aed',
  headerFont: 'serif', bodyFont: 'serif',
  baseFontPt: 9.5, nameFontPt: 17, headingFontPt: 10.5,
  sectionGapPt: 10, entryGapPt: 8,
  leadingEm: 0.55, paragraphGapEm: 0.65, bulletGapEm: 0.55,
  bulletStyle: 'bullet', ruleThickness: 'thin', nameTransform: 'normal',
  skillsLayout: 'inline', justify: false,
};

export const META = {
  name: 'Compact',
  description: 'Dense single column — fits more on one page. Great for senior engineers.',
  author: 'Resumex',
  license: 'MIT',
  accent: NATIVE.accent,
  defaultPageSize: 'a4',
  format: 'typst',
  uiDefaults: {
    bulletStyle: 'bullet', ruleThickness: 'thin', nameTransform: 'normal',
    skillsLayout: 'inline', headerFont: 'serif', bodyFont: 'serif', inlineHeadline: false,
  },
  defaultFonts: { header: 'serif', body: 'serif' },
  nativeMarginsMm: NATIVE.marginMm,
  // Which customization controls this template honours (drives the panel UI).
  capabilities: {
    accent: true, margins: true, fonts: true, baseSize: true, headerScale: true,
    spacing: true, lineHeight: true, bulletStyle: true, ruleThickness: true,
    nameTransform: true, skillsLayout: true, justify: true, sidebarWidth: false,
    inlineHeadline: true,
  },
};

export function renderCompact(r, opts = {}) {
  const styles = generateTypstStyles(opts.formatting, { ...NATIVE, pageSize: opts.pageSize || NATIVE.pageSize });
  const paper = styles.paper;
  const showIcons = styles.showContactIcons;

  const c = r.contact || {};
  const contact = [
    c.email && `${typIcon('email', showIcons)} ${typLink('mailto:' + c.email, c.email)}`,
    c.phone && `${typIcon('phone', showIcons)} ${typ(c.phone)}`,
    c.location && `${typIcon('location', showIcons)} ${typ(c.location)}`,
    c.linkedin && `${typIcon('linkedin', showIcons)} ${typLink(c.linkedin)}`,
    c.github && `${typIcon('github', showIcons)} ${typLink(c.github)}`,
    c.website && `${typIcon('website', showIcons)} ${typLink(c.website)}`,
  ]
    .filter(Boolean)
    .join('  #sym.bullet  ');

  // Section heading helper: user override → generic default. Escaped for Typst.
  const H = (key, fallback) => typ(sectionTitle(r, key, fallback));

  const blocks = {};

  if (r.summary?.trim()) {
    blocks.summary = `#sectionhead[${H('summary', 'Summary')}]\n${typMd(r.summary)}`;
  }

  if (r.experience?.length) {
    const items = r.experience.map((x) => {
      const lhs = [
        `#strong[${typ(x.title || '')}]`,
        ' #sym.dash.em ',
        typ(x.company || ''),
        x.location ? `, ${typ(x.location)}` : '',
      ].join('');
      const lines = [`#entryline[${lhs}][${typDate(x.start, x.end)}]`];
      if (x.bullets?.length) {
        lines.push(`#v(2pt)\n${x.bullets.map((b) => `- ${typMd(b)}`).join('\n')}`);
      }
      return `#block(above: ${styles.entrySpacing}, below: 0pt, width: 100%)[\n${lines.join('\n')}\n]`;
    });
    blocks.experience = `#sectionhead[${H('experience', 'Experience')}]\n${items.join('\n')}`;
  }

  if (r.projects?.length) {
    const items = r.projects.map((p) => {
      const date = typDate(p.start, p.end);
      const techLine = p.tech?.length
        ? ` #sym.dash.em #emph[${p.tech.map(typ).join(', ')}]`
        : '';
      const right = date ? typ(date) : p.link ? typLink(p.link) : '';
      const lhs = `#strong[${typMd(p.name)}]${techLine}`;

      const details = [];
      if (date && p.link) details.push(typLink(p.link));
      if (p.description?.trim()) details.push(typMd(p.description));

      const lines = [`#entryline[${lhs}][${right}]`];
      if (details.length) {
        lines.push(`#v(2pt)\n${details.join(' \\\n')}`);
      }
      if (p.bullets?.length) {
        lines.push(`#v(2pt)\n${p.bullets.map((b) => `- ${typMd(b)}`).join('\n')}`);
      }
      return `#block(above: ${styles.entrySpacing}, below: 0pt, width: 100%)[\n${lines.join('\n')}\n]`;
    });
    blocks.projects = `#sectionhead[${H('projects', 'Projects')}]\n${items.join('\n')}`;
  }

  if (r.education?.length) {
    const items = r.education.map((e) => {
      const lhs = `#strong[${typ(e.school || '')}]${e.location ? `, ${typ(e.location)}` : ''}`;
      const degreeLine = `#emph[${typ(e.degree || '')}]${e.gpa ? ` #sym.dash.em GPA: ${typ(e.gpa)}` : ''}`;

      const lines = [`#entryline[${lhs}][${typDate(e.start, e.end)}]`];
      lines.push(`#v(2pt)\n${degreeLine}`);
      if (e.details?.length) {
        lines.push(`#v(2pt)\n${e.details.map((d) => `- ${typMd(d)}`).join('\n')}`);
      }
      return `#block(above: ${styles.entrySpacing}, below: 0pt, width: 100%)[\n${lines.join('\n')}\n]`;
    });
    blocks.education = `#sectionhead[${H('education', 'Education')}]\n${items.join('\n')}`;
  }

  if (r.skills?.length) {
    blocks.skills = `#sectionhead[${H('skills', 'Skills')}]\n#skillblock[\n${renderSkills(r.skills, styles.skillsLayout)}\n]`;
  }

  if (r.certifications?.length) {
    const items = r.certifications.map((c2) => {
      const lhs = `#strong[${typ(c2.name)}], ${typ(c2.issuer)}`;
      return `#block(above: ${styles.entrySpacing}, below: 0pt, width: 100%)[\n#entryline[${lhs}][${typ(c2.date)}]\n]`;
    });
    blocks.certifications = `#sectionhead[${H('certifications', 'Certifications')}]\n${items.join('\n')}`;
  }

  if (r.awards?.length) {
    const items = r.awards.map((a) => {
      const lhs = `#strong[${typMd(a.name)}]${a.issuer ? `, ${typ(a.issuer)}` : ''}`;
      const lines = [`#entryline[${lhs}][${typ(a.date)}]`];
      if (a.description?.trim()) {
        lines.push(`#v(2pt)\n${typMd(a.description)}`);
      }
      return `#block(above: ${styles.entrySpacing}, below: 0pt, width: 100%)[\n${lines.join('\n')}\n]`;
    });
    blocks.awards = `#sectionhead[${H('awards', 'Awards')}]\n${items.join('\n')}`;
  }

  const ordered = orderSections(
    blocks,
    ['summary', 'experience', 'projects', 'education', 'skills', 'certifications', 'awards'],
    r.sectionOrder,
  );

  const isInlineHeadline = opts.formatting?.inlineHeadline ?? false;
  const name = applyNameTransform(styles.nameTransform, typ(r.name || 'Your Name'));
  const headlineTyp = r.headline ? typ(r.headline) : '';
  // Name and headline share a line; Typst wraps to a second line automatically
  // when they don't fit, mirroring the LaTeX \settowidth measurement.
  const header = headlineTyp
    ? isInlineHeadline
      ? `#text(font: font-header, size: ${styles.nameFontSize}, weight: "bold", fill: accent)[${name}] #h(0.25em) #sym.dash.em #h(0.25em) #text(size: ${styles.baseFontSize} * 1.37, weight: "bold")[${headlineTyp}]`
      : `#text(font: font-header, size: ${styles.nameFontSize}, weight: "bold", fill: accent)[${name}]\n#v(6pt, weak: true)\n#text(size: ${styles.baseFontSize} * 1.37, weight: "bold")[${headlineTyp}]`
    : `#text(font: font-header, size: ${styles.nameFontSize}, weight: "bold", fill: accent)[${name}]`;

  return `#set document(title: ${JSON.stringify(String(r.name || 'Resume'))})
#set page(paper: "${paper}", margin: ${styles.marginStr})
#set text(font: ${styles.bodyFont}, size: ${styles.baseFontSize}, fill: rgb("#1A1A1A"))
#set par(leading: ${styles.leading}, spacing: ${styles.paragraphSpacing}, justify: ${styles.justify})

#let accent = rgb("${styles.accentHex}")
#let icon-color = accent
#let font-header = ${styles.headerFont}
#let base-size = ${styles.baseFontSize}
${styles.linkAccent ? '#show link: set text(fill: accent)\n' : ''}
// Bullet lists — slightly loosened from the original tight setting. Inter-bullet
// spacing tracks line height (bulletSpacing), never the entry gap.
#set list(tight: false, indent: 0pt, body-indent: 0.5em, marker: ${styles.bulletMarker}, spacing: ${styles.bulletSpacing})

// Section heading: accent-coloured all-caps title, underlined by a thin black rule.
#let sectionhead(title) = {
  v(${styles.sectionSpacing}, weak: true)
  text(font: font-header, fill: accent, weight: "bold", size: ${styles.headingFontSize})[#upper(title)]
  v(4pt, weak: true)
  line(length: 100%, stroke: ${styles.ruleThickness} + rgb("#000000"))
  v(${styles.sectionSpacing}, weak: true)
}

// One entry head line: content left, date right (italic), on a single row.
#let entryline(lhs, rhs) = grid(
  columns: (1fr, auto),
  column-gutter: 1em,
  align: (left, right),
  lhs,
  emph(rhs),
)

#let skillblock(body) = block(above: ${styles.entrySpacing}, below: 0pt)[
  #body
]

${header}
#v(6pt, weak: true)
#text(size: 0.9em)[${contact}]
#v(4pt, weak: true)
#line(length: 100%, stroke: 0.8pt + black)
#v(4pt, weak: true)

${ordered.join(`\n\n#v(${styles.sectionSpacing}, weak: true)\n\n`)}
`;
}

// Skills renderer — honours the Skills Layout control (native: inline).
//   inline  → "Category: a, b, c" one line per category (comma-separated)
//   grouped → bold category then comma items (distinct line)
//   bulleted→ bold category then a bullet list of items
function renderSkills(skills, layout) {
  if (layout === 'bulleted') {
    return skills
      .map((s) => `#strong[${typ(s.category || 'Skills')}:]\n${(s.items || []).map((i) => `  - ${typ(i)}`).join('\n')}`)
      .join('\n\n');
  }
  return skills
    .map((s) => `#strong[${typ(s.category || 'Skills')}:] ${(s.items || []).map(typ).join(', ')}`)
    .join(' \\\n');
}
