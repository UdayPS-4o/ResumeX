// "Alta" template — AltaCV-inspired layout.
// Left-aligned header with name and subtitle, right-aligned contact block.
// Teal accent color, clean section headings with thick accent rules extending to the right.

import { sectionTitle, orderSections, generateTypstStyles, applyNameTransform } from '../../typst.js';
import { typ, typMd, typLink, typDate, typPaper, typIcon } from '../../typst.js';

// Native style profile — the values this template was hand-tuned with. The
// customization levels scale these (level 3 == native), so an untouched resume
// renders exactly like the original design. See generateTypstStyles().
const NATIVE = {
  pageSize: 'a4',
  margin: '(left: 0.6in, right: 0.6in, top: 0.6in, bottom: 0.6in)',
  marginMm: { top: 15.2, bottom: 15.2, left: 15.2, right: 15.2 },
  accent: '#0d9488',
  headerFont: 'sans-serif', bodyFont: 'sans-serif',
  baseFontPt: 10, nameFontPt: 26, headingFontPt: 11.5,
  sectionGapPt: 10, entryGapPt: 6,
  leadingEm: 0.55, paragraphGapEm: 0.65, bulletGapEm: 0.4,
  bulletStyle: 'arrow', ruleThickness: 'thick', nameTransform: 'normal',
  skillsLayout: 'inline', justify: false,
};

export const META = {
  name: 'Alta',
  description: 'AltaCV-inspired layout — asymmetric header, teal accents, and thick timeline rules.',
  author: 'Resumex',
  license: 'MIT',
  accent: NATIVE.accent,
  defaultPageSize: 'a4',
  format: 'typst',
  uiDefaults: {
    bulletStyle: 'arrow', ruleThickness: 'thick', nameTransform: 'normal',
    skillsLayout: 'inline', headerFont: 'sans-serif', bodyFont: 'sans-serif',
  },
  defaultFonts: { header: 'sans-serif', body: 'sans-serif' },
  nativeMarginsMm: NATIVE.marginMm,
  // Which customization controls this template honours (drives the panel UI).
  capabilities: {
    accent: true, margins: true, fonts: true, baseSize: true, headerScale: true,
    spacing: true, lineHeight: true, bulletStyle: true, ruleThickness: true,
    nameTransform: true, skillsLayout: true, justify: true, sidebarWidth: false,
  },
};

export function renderAlta(r, opts = {}) {
  const styles = generateTypstStyles(opts.formatting, { ...NATIVE, pageSize: opts.pageSize || NATIVE.pageSize });
  const paper = styles.paper;
  const accentColor = styles.accentHex;
  const showIcons = styles.showContactIcons;

  const c = r.contact || {};
  const contactLines = [
    c.email && `${typIcon('email', showIcons)} ${typLink('mailto:' + c.email, c.email)}`,
    c.phone && `${typIcon('phone', showIcons)} ${typ(c.phone)}`,
    c.location && `${typIcon('location', showIcons)} ${typ(c.location)}`,
    c.linkedin && `${typIcon('linkedin', showIcons)} ${typLink(c.linkedin)}`,
    c.github && `${typIcon('github', showIcons)} ${typLink(c.github)}`,
    c.website && `${typIcon('website', showIcons)} ${typLink(c.website)}`,
  ].filter(Boolean);

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
#set text(font: ${styles.bodyFont}, size: ${styles.baseFontSize}, fill: rgb("#2d3748"))
#set par(leading: ${styles.leading}, spacing: ${styles.paragraphSpacing}, justify: ${styles.justify})
${styles.linkAccent ? `#show link: set text(fill: rgb("${styles.accentHex}"))\n` : ''}
#let accent = rgb("${accentColor}")
#let icon-color = accent
#let ink = rgb("#2d3748")

// Section title left-aligned with a thick accent rule extending to the right.
#let sectionhead(title) = {
  v(${styles.sectionSpacing})
  grid(
    columns: (auto, 1fr),
    align: (left, center),
    column-gutter: 0.6em,
    text(font: ${styles.headerFont}, fill: accent, weight: "bold", size: ${styles.headingFontSize})[#upper(title)],
    line(length: 100%, stroke: ${styles.ruleThickness} + accent)
  )
  v(4pt)
}

// Bold left, plain right (used for the primary entry head line).
#let entryhead(lhs, rhs) = grid(columns: (1fr, auto), align: (left, right), [#strong[#lhs]], [#rhs])
// Italic left, italic right (used for the secondary entry line).
#let entrysub(lhs, rhs) = grid(columns: (1fr, auto), align: (left, right), [#emph[#lhs]], [#emph[#rhs]])
// Inter-bullet spacing tracks line height (bulletSpacing), never the entry gap.
#set list(indent: 0.5em, spacing: ${styles.bulletSpacing}, marker: ${styles.bulletMarker})

#grid(
  columns: (1fr, auto),
  column-gutter: 1.5em,
  align: (left, top),
  [
    #text(font: ${styles.headerFont}, size: ${styles.nameFontSize}, weight: "bold", fill: accent)[${name}]
    ${r.headline ? `\n    #v(3pt)\n    #text(size: ${styles.baseFontSize} * 1.3, weight: "medium", fill: rgb("#2d3748"))[${typ(r.headline)}]` : ''}
  ],
  [
    #set text(size: 0.85em, fill: rgb("#4a5568"))
    #set par(leading: ${styles.leading})
    ${contactLines.join(' \\\n')}
  ]
)

#v(${styles.entrySpacing})

${sections.join('\n\n')}
`;
}

// Skills renderer — honours the Skills Layout control (native: inline).
//   inline  → "Category: a, b, c" one line per category
//   grouped → bold category then comma items (same as inline here, distinct line)
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
