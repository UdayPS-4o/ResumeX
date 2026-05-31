// "Classic" template — Typst port of the LaTeX `classic` layout.
// Traditional single-column serif resume: centered name, centered bold section
// headings sitting above a thin full-width rule, near-black ink. ATS-friendly.
// Compiles via the Typst engine (format: 'typst').

import { sectionTitle, orderSections, generateTypstStyles, applyNameTransform } from '../../typst.js';
import { typ, typMd, typLink, typDate, typPaper, typIcon } from '../../typst.js';

// Native style profile — the values this template was hand-tuned with. The
// customization levels scale these (level 3 == native), so an untouched resume
// renders exactly like the original design. See generateTypstStyles().
const NATIVE = {
  pageSize: 'a4',
  margin: '(left: 0.85in, right: 0.85in, top: 0.85in, bottom: 0.85in)',
  marginMm: { top: 21.6, bottom: 21.6, left: 21.6, right: 21.6 },
  accent: '#111827',
  headerFont: 'serif', bodyFont: 'serif',
  baseFontPt: 11, nameFontPt: 24, headingFontPt: 13,
  sectionGapPt: 12, entryGapPt: 6,
  leadingEm: 0.55, paragraphGapEm: 0.65, bulletGapEm: 0.5,
  bulletStyle: 'bullet', ruleThickness: 'medium', nameTransform: 'normal',
  skillsLayout: 'inline', justify: false,
};

export const META = {
  name: 'Classic',
  description: 'Traditional serif resume — conservative and timeless.',
  author: 'Resumex',
  license: 'MIT',
  accent: NATIVE.accent,
  defaultPageSize: 'a4',
  format: 'typst',
  uiDefaults: {
    bulletStyle: 'bullet', ruleThickness: 'medium', nameTransform: 'normal',
    skillsLayout: 'inline', headerFont: 'serif', bodyFont: 'serif',
  },
  defaultFonts: { header: 'serif', body: 'serif' },
  nativeMarginsMm: NATIVE.marginMm,
  // Which customization controls this template honours (drives the panel UI).
  capabilities: {
    accent: true, margins: true, fonts: true, baseSize: true, headerScale: true,
    spacing: true, lineHeight: true, bulletStyle: true, ruleThickness: true,
    nameTransform: true, skillsLayout: true, justify: true, sidebarWidth: false,
  },
};

export function renderClassic(r, opts = {}) {
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
    .join(' #sym.bullet ');

  const H = (key, fallback) => typ(sectionTitle(r, key, fallback));
  const blocks = {};

  // SUMMARY — a single prose paragraph.
  if (r.summary?.trim()) {
    blocks.summary = `#sectionhead[${H('summary', 'Summary')}]\n${typMd(r.summary)}`;
  }

  // EXPERIENCE — bold company / location, then italic title / italic date,
  // followed by an optional intro line and a bullet list.
  if (r.experience?.length) {
    const items = r.experience.map((x) => {
      const lines = [`#entryhead[${typ(x.company || '')}][${typ(x.location || '')}]`];
      lines.push(`#entrysub[${typ(x.title || '')}][${typDate(x.start, x.end)}]`);
      if (x.description?.trim()) lines.push(typMd(x.description));
      if (x.bullets?.length) lines.push(x.bullets.map((b) => `- ${typMd(b)}`).join('\n'));
      return lines.join('\n');
    });
    blocks.experience = `#sectionhead[${H('experience', 'Experience')}]\n${items.join(`\n\n#v(${styles.entrySpacing})\n\n`)}`;
  }

  // EDUCATION — bold school / location, then italic degree / italic date,
  // an optional GPA line, and optional detail bullets.
  if (r.education?.length) {
    const items = r.education.map((e) => {
      const lines = [`#entryhead[${typ(e.school || '')}][${typ(e.location || '')}]`];
      lines.push(`#entrysub[${typ(e.degree || '')}][${typDate(e.start, e.end)}]`);
      if (e.gpa) lines.push(`GPA: ${typ(e.gpa)}`);
      if (e.details?.length) lines.push(e.details.map((d) => `- ${typMd(d)}`).join('\n'));
      return lines.join('\n\n');
    });
    blocks.education = `#sectionhead[${H('education', 'Education')}]\n${items.join(`\n\n#v(${styles.entrySpacing})\n\n`)}`;
  }

  // PROJECTS — bold name / optional italic date, then an italic tech list and/or
  // link line, an optional prose description, and bullets.
  if (r.projects?.length) {
    const items = r.projects.map((p) => {
      const date = typDate(p.start, p.end);
      const lines = [`#entryhead[${typMd(p.name)}][${date ? `#emph[${date}]` : ''}]`];
      const techStr = p.tech?.length ? `#emph[${p.tech.map(typ).join(', ')}]` : '';
      const linkStr = p.link ? typLink(p.link) : '';
      if (techStr || linkStr) {
        lines.push(`#entrysub[${techStr}][${linkStr}]`);
      }
      if (p.description?.trim()) lines.push(typMd(p.description));
      if (p.bullets?.length) lines.push(p.bullets.map((b) => `- ${typMd(b)}`).join('\n'));
      return lines.join('\n\n');
    });
    blocks.projects = `#sectionhead[${H('projects', 'Projects')}]\n${items.join(`\n\n#v(${styles.entrySpacing})\n\n`)}`;
  }

  // SKILLS — routed through the Skills Layout control (native: inline).
  if (r.skills?.length) {
    blocks.skills = `#sectionhead[${H('skills', 'Skills')}]\n${renderSkills(r.skills, styles.skillsLayout)}`;
  }

  // CERTIFICATIONS — bold name, issuer, right-aligned date.
  if (r.certifications?.length) {
    const lines = r.certifications
      .map((c2) => `#entryhead[#strong[${typ(c2.name)}], ${typ(c2.issuer)}][${typ(c2.date)}]`)
      .join(`\n\n#v(${styles.entrySpacing})\n\n`);
    blocks.certifications = `#sectionhead[${H('certifications', 'Certifications')}]\n${lines}`;
  }

  // AWARDS — bold name, optional issuer, right-aligned date, optional description.
  if (r.awards?.length) {
    const items = r.awards.map((a) => {
      const lhs = `#strong[${typMd(a.name)}]${a.issuer ? `, ${typ(a.issuer)}` : ''}`;
      const lines = [`#entryhead[${lhs}][${typ(a.date)}]`];
      if (a.description?.trim()) lines.push(typMd(a.description));
      return lines.join('\n\n');
    });
    blocks.awards = `#sectionhead[${H('awards', 'Awards')}]\n${items.join(`\n\n#v(${styles.entrySpacing})\n\n`)}`;
  }

  const sections = orderSections(
    blocks,
    ['summary', 'experience', 'education', 'projects', 'skills', 'certifications', 'awards'],
    r.sectionOrder,
  );

  const name = applyNameTransform(styles.nameTransform, typ(r.name || 'Your Name'));

  return `#set document(title: ${JSON.stringify(String(r.name || 'Resume'))})
#set page(paper: "${paper}", margin: ${styles.marginStr})
#set text(font: ${styles.bodyFont}, size: ${styles.baseFontSize}, fill: rgb("#111827"))
#set par(leading: ${styles.leading}, spacing: ${styles.paragraphSpacing}, justify: ${styles.justify})
${styles.linkAccent ? `#show link: set text(fill: rgb("${styles.accentHex}"))\n` : ''}
#let ink = rgb("${styles.accentHex}")
#let icon-color = ink
// Centered bold section title sitting cleanly above a thin full-width rule. The
// section gap lives in the leading v() so the Section Gap control widens it.
#let sectionhead(title) = {
  v(${styles.sectionSpacing})
  align(center)[#text(font: ${styles.headerFont}, weight: "bold", size: ${styles.headingFontSize})[#title]]
  v(4pt)
  line(length: 100%, stroke: ${styles.ruleThickness} + ink)
  v(8pt)
}
// Bold left, plain right (used for the primary entry head line).
#let entryhead(lhs, rhs) = grid(columns: (1fr, auto), align: (left, right), [#strong[#lhs]], [#rhs])
// Italic left, italic right (used for the secondary entry line).
#let entrysub(lhs, rhs) = grid(columns: (1fr, auto), align: (left, right), [#emph[#lhs]], [#emph[#rhs]])
// Inter-bullet spacing tracks line height (bulletSpacing), never the entry gap.
#set list(indent: 0.6em, spacing: ${styles.bulletSpacing}, marker: ${styles.bulletMarker})

#align(center)[
  #text(font: ${styles.headerFont}, size: ${styles.nameFontSize}, weight: "bold")[${name}]
  ${r.headline ? `\n  #v(3pt)\n  #text(style: "italic")[${typ(r.headline)}]` : ''}
  #v(3pt)
  #text(size: 0.95em)[${contact}]
]

#v(${styles.entrySpacing})

${sections.join('\n\n')}
`;
}

// Skills renderer — honours the Skills Layout control (native: inline).
//   inline  → "Category: a, b, c" one line per category (comma-separated)
//   grouped → bold category then comma items on its own line
//   bulleted→ bold category then a bullet list of items
function renderSkills(skills, layout) {
  if (layout === 'bulleted') {
    return skills
      .map((s) => `#strong[${typ(s.category || 'Skills')}:]\n${(s.items || []).map((i) => `- ${typ(i)}`).join('\n')}`)
      .join('\n\n');
  }
  if (layout === 'grouped') {
    return skills
      .map((s) => `#strong[${typ(s.category || 'Skills')}:] ${(s.items || []).map(typ).join(', ')}`)
      .join('\n\n');
  }
  return skills
    .map((s) => `#strong[${typ(s.category || 'Skills')}:] ${(s.items || []).map(typ).join(', ')}`)
    .join(' \\\n');
}
