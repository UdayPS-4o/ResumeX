// "Deedy" template — Two-column/sidebar layout.
// Left column (sidebar) for Education, Skills, and Awards.
// Right column (main) for Summary, Experience, Projects, and Certifications.
// Ink-colored name, accent-colored #upper() section headings with NO rule,
// accent bullets. Compiles via the Typst engine.

import { sectionTitle, orderSections, generateTypstStyles, applyNameTransform } from '../../typst.js';
import { typ, typMd, typLink, typDate, typPaper, typIcon } from '../../typst.js';

// Native style profile — the values this template was hand-tuned with. The
// customization levels scale these (level 3 == native), so an untouched resume
// renders exactly like the original design. See generateTypstStyles().
const NATIVE = {
  pageSize: 'a4',
  margin: '(left: 0.5in, right: 0.5in, top: 0.5in, bottom: 0.5in)',
  marginMm: { top: 12.7, bottom: 12.7, left: 12.7, right: 12.7 },
  accent: '#2b6cb0',
  headerFont: 'sans-serif',
  bodyFont: 'sans-serif',
  baseFontPt: 9.5,
  nameFontPt: 26,
  headingFontPt: 10.5,
  sectionGapPt: 10,
  entryGapPt: 6,
  leadingEm: 0.5,
  paragraphGapEm: 0.6,
  bulletGapEm: 0.35,
  bulletStyle: 'bullet',
  bulletAccent: true, // tint bullets with the accent — deedy's native look; lets '•' be the pre-selected option
  ruleThickness: 'medium',
  nameTransform: 'normal',
  skillsLayout: 'inline',
  justify: false,
  columnRatio: [1, 2.2],
};

export const META = {
  name: 'Deedy',
  description: 'Two-column sidebar layout — modern, clean, and highly organized.',
  author: 'Resumex',
  license: 'MIT',
  accent: NATIVE.accent,
  defaultPageSize: 'a4',
  format: 'typst',
  uiDefaults: {
    bulletStyle: 'bullet', ruleThickness: null, nameTransform: 'normal',
    skillsLayout: 'inline', headerFont: 'sans-serif', bodyFont: 'sans-serif',
  },
  defaultFonts: { header: 'sans-serif', body: 'sans-serif' },
  nativeMarginsMm: NATIVE.marginMm,
  // Which customization controls this template honours (drives the panel UI).
  capabilities: {
    accent: true, margins: true, fonts: true, baseSize: true, headerScale: true,
    spacing: true, lineHeight: true, bulletStyle: true, ruleThickness: false,
    nameTransform: true, skillsLayout: true, justify: true, sidebarWidth: true,
  },
};

export function renderDeedy(r, opts = {}) {
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
    .join('  |  ');

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

  // CERTIFICATIONS
  if (r.certifications?.length) {
    const lines = r.certifications
      .map((c2) => `#entryhead[#strong[${typ(c2.name)}]][${typ(c2.date)}]\n${typ(c2.issuer)}`)
      .join('\n\n');
    blocks.certifications = `#sectionhead[${H('certifications', 'Certifications')}]\n${lines}`;
  }

  // EDUCATION (Left sidebar)
  if (r.education?.length) {
    const items = r.education.map((e) => {
      const lines = [
        `#strong[${typ(e.school || '')}]`,
        e.degree && `#emph[${typ(e.degree)}]`,
        e.gpa && `GPA: ${typ(e.gpa)}`,
        typDate(e.start, e.end),
      ].filter(Boolean);
      return lines.join(' \\\n');
    });
    blocks.education = `#sectionhead[${H('education', 'Education')}]\n${items.join(`\n\n#v(${styles.entrySpacing})\n\n`)}`;
  }

  // SKILLS (Left sidebar)
  if (r.skills?.length) {
    blocks.skills = `#sectionhead[${H('skills', 'Skills')}]\n${renderSkills(r.skills, styles.skillsLayout)}`;
  }

  // AWARDS (Left sidebar)
  if (r.awards?.length) {
    const items = r.awards.map((a) => {
      const lines = [
        `#strong[${typMd(a.name)}]`,
        a.issuer && typ(a.issuer),
        typ(a.date),
      ].filter(Boolean);
      return lines.join(' \\\n');
    });
    blocks.awards = `#sectionhead[${H('awards', 'Awards')}]\n${items.join(`\n\n#v(${styles.entrySpacing})\n\n`)}`;
  }

  // Separate sections into left and right columns
  const leftSecKeys = ['education', 'skills', 'awards'];
  const rightSecKeys = ['summary', 'experience', 'projects', 'certifications'];

  let leftSorted = leftSecKeys.filter((k) => blocks[k]);
  let rightSorted = rightSecKeys.filter((k) => blocks[k]);

  // Respect user's sectionOrder if provided
  if (r.sectionOrder?.length) {
    leftSorted.sort((a, b) => r.sectionOrder.indexOf(a) - r.sectionOrder.indexOf(b));
    rightSorted.sort((a, b) => r.sectionOrder.indexOf(a) - r.sectionOrder.indexOf(b));
  }

  const leftColumnContent = leftSorted.map((k) => blocks[k]).join(`\n\n#v(${styles.sectionSpacing})\n\n`);
  const rightColumnContent = rightSorted.map((k) => blocks[k]).join(`\n\n#v(${styles.sectionSpacing})\n\n`);

  const name = applyNameTransform(styles.nameTransform, typ(r.name || 'Your Name'));

  return `#set document(title: ${JSON.stringify(String(r.name || 'Resume'))})
#set page(paper: "${paper}", margin: ${styles.marginStr})
#set text(font: ${styles.bodyFont}, size: ${styles.baseFontSize}, fill: rgb("#111827"))
#set par(leading: ${styles.leading}, spacing: ${styles.paragraphSpacing}, justify: ${styles.justify})
${styles.linkAccent ? `#show link: set text(fill: rgb("${styles.accentHex}"))\n` : ''}
#let accent = rgb("${styles.accentHex}")
#let icon-color = accent
#let ink = rgb("#111827")

// Section heading: accent-colored, bold, all-caps — NO rule beneath (deedy's
// identity). The section gap lives in the leading v() so the Section Gap control
// widens it; the below-v stays fixed at 3pt.
#let sectionhead(title) = {
  v(${styles.sectionSpacing}, weak: true)
  text(font: ${styles.headerFont}, fill: accent, weight: "bold", size: ${styles.headingFontSize})[#upper(title)]
  v(3pt)
}

// Bold left, plain right (used for the primary entry head line).
#let entryhead(lhs, rhs) = grid(columns: (1fr, auto), align: (left, right), [#strong[#lhs]], [#rhs])
// Italic left, italic right (used for the secondary entry line).
#let entrysub(lhs, rhs) = grid(columns: (1fr, auto), align: (left, right), [#emph[#lhs]], [#emph[#rhs]])
// Inter-bullet spacing tracks line height (bulletSpacing), never the entry gap.
#set list(indent: 0.5em, spacing: ${styles.bulletSpacing}, marker: ${styles.bulletMarker})

#align(center)[
  #text(font: ${styles.headerFont}, size: ${styles.nameFontSize}, weight: "bold", fill: ink)[${name}]
  ${r.headline ? `\n  #v(3pt)\n  #text(font: ${styles.headerFont}, style: "italic", size: ${styles.baseFontSize} * 1.16, fill: accent)[${typ(r.headline)}]` : ''}
  #v(3pt)
  #text(size: 0.95em, fill: rgb("#4b5563"))[${contact}]
]

#v(${styles.sectionSpacing})

#grid(
  columns: (${styles.columnRatioLeft}, ${styles.columnRatioRight}),
  column-gutter: 2.2em,
  [
    ${leftColumnContent}
  ],
  [
    ${rightColumnContent}
  ]
)
`;
}

// Skills renderer — honours the Skills Layout control (native: inline).
//   inline  → "Category: a, b, c" (comma-separated, one block per category)
//   grouped → bold category then comma items (distinct line)
//   bulleted→ bold category then a bullet list of items
function renderSkills(skills, layout) {
  if (layout === 'bulleted') {
    return skills
      .map((s) => `#strong[${typ(s.category || 'Skills')}] \\\n${(s.items || []).map((i) => `- ${typ(i)}`).join('\n')}`)
      .join('\n\n');
  }
  if (layout === 'grouped') {
    return skills
      .map((s) => `#strong[${typ(s.category || 'Skills')}] \\\n${(s.items || []).map(typ).join(', ')}`)
      .join('\n\n');
  }
  return skills
    .map((s) => `#strong[${typ(s.category || 'Skills')}:] ${(s.items || []).map(typ).join(', ')}`)
    .join(' \\\n');
}
