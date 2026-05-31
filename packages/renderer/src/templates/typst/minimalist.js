// "Minimalist" template — clean, high-density, ATS-friendly serif layout.
// Centered name and subtitle, thin horizontal rules framing centered section
// headers, and traditional serif typography. Compiles via the Typst engine.

import { sectionTitle, orderSections, generateTypstStyles, applyNameTransform } from '../../typst.js';
import { typ, typMd, typLink, typDate, typPaper, typIcon } from '../../typst.js';

// Native style profile — the values this template was hand-tuned with. The
// customization levels scale these (level 3 == native), so an untouched resume
// renders exactly like the original design. See generateTypstStyles().
const NATIVE = {
  pageSize: 'a4',
  margin: '(left: 0.65in, right: 0.65in, top: 0.65in, bottom: 0.65in)',
  marginMm: { top: 16.5, bottom: 16.5, left: 16.5, right: 16.5 },
  accent: '#000000',
  headerFont: 'serif', bodyFont: 'serif',
  baseFontPt: 10, nameFontPt: 24, headingFontPt: 10.5,
  sectionGapPt: 8, entryGapPt: 6,
  leadingEm: 0.5, paragraphGapEm: 0.6, bulletGapEm: 0.35,
  bulletStyle: 'dash', ruleThickness: 'thin', nameTransform: 'normal',
  skillsLayout: 'inline', justify: false,
};

export const META = {
  name: 'Minimalist',
  description: 'ATS-friendly serif layout — high-density typography framed by thin lines.',
  author: 'Resumex',
  license: 'MIT',
  accent: NATIVE.accent,
  format: 'typst',
  uiDefaults: {
    bulletStyle: 'dash', ruleThickness: 'thin', nameTransform: 'normal',
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

export function renderMinimalist(r, opts = {}) {
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
    .join('  •  ');

  const H = (key, fallback) => typ(sectionTitle(r, key, fallback));
  const blocks = {};

  // SUMMARY
  if (r.summary?.trim()) {
    blocks.summary = `#sectionhead[${H('summary', 'Summary')}]\n${typMd(r.summary)}`;
  }

  // EXPERIENCE
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

  // EDUCATION
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

  // PROJECTS
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

  // SKILLS
  if (r.skills?.length) {
    blocks.skills = `#sectionhead[${H('skills', 'Skills')}]\n${renderSkills(r.skills, styles.skillsLayout)}`;
  }

  // CERTIFICATIONS
  if (r.certifications?.length) {
    const lines = r.certifications
      .map((c2) => `#entryhead[#strong[${typ(c2.name)}], ${typ(c2.issuer)}][${typ(c2.date)}]`)
      .join('\n\n');
    blocks.certifications = `#sectionhead[${H('certifications', 'Certifications')}]\n${lines}`;
  }

  // AWARDS
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
#set text(font: ${styles.bodyFont}, size: ${styles.baseFontSize}, fill: rgb("#1a202c"))
#set par(leading: ${styles.leading}, spacing: ${styles.paragraphSpacing}, justify: ${styles.justify})
${styles.linkAccent ? `#show link: set text(fill: rgb("${styles.accentHex}"))\n` : ''}
#let accent = rgb("${styles.accentHex}")
#let icon-color = accent
#let ink = rgb("#1a202c")

// Minimalist section heading framed by two thin gray lines. The section gap
// lives in the leading v() so the Section Gap control widens it.
#let sectionhead(title) = {
  v(${styles.sectionSpacing})
  line(length: 100%, stroke: ${styles.ruleThickness} + rgb("#a0aec0"))
  v(2pt)
  align(center)[#text(font: ${styles.headerFont}, size: ${styles.headingFontSize}, weight: "bold", tracking: 1.5pt, fill: ink)[#upper(title)]]
  v(2pt)
  line(length: 100%, stroke: ${styles.ruleThickness} + rgb("#a0aec0"))
  v(4pt)
}

// Bold left, plain right (used for the primary entry head line).
#let entryhead(lhs, rhs) = grid(columns: (1fr, auto), align: (left, right), [#strong[#lhs]], [#rhs])
// Italic left, italic right (used for the secondary entry line).
#let entrysub(lhs, rhs) = grid(columns: (1fr, auto), align: (left, right), [#emph[#lhs]], [#emph[#rhs]])
// Inter-bullet spacing tracks line height (bulletSpacing), never the entry gap.
#set list(indent: 0.5em, spacing: ${styles.bulletSpacing}, marker: ${styles.bulletMarker})

#align(center)[
  #text(font: ${styles.headerFont}, size: ${styles.nameFontSize}, weight: "bold", fill: ink)[${name}]
  ${r.headline ? `\n  #v(2pt)\n  #text(style: "italic", size: 1.15em, fill: rgb("#4a5568"))[${typ(r.headline)}]` : ''}
  #v(2pt)
  #text(size: 0.9em, fill: rgb("#4a5568"))[${contact}]
]

#v(${styles.entrySpacing})

${sections.join('\n\n')}
`;
}

// Skills renderer — honours the Skills Layout control (native: inline).
//   inline   → "Category: a, b, c" one line per category (backslash line breaks)
//   grouped  → bold category then comma items, distinct line per category
//   bulleted → bold category then a bullet list of items
function renderSkills(skills, layout) {
  if (layout === 'bulleted') {
    return skills
      .map((s) => `#strong[${typ(s.category || 'Skills')}:]\n${(s.items || []).map((i) => `  - ${typ(i)}`).join('\n')}`)
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
