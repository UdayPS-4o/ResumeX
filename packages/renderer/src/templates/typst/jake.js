// "Jake" template — Typst port of the LaTeX `jake` layout (Jake Gutierrez resume).
// https://github.com/jakegut/resume — MIT-licensed.
// Centered name + single contact line, small-caps sections with a full-width
// rule beneath, two-line entry heads. Compiles via the Typst engine.

import { sectionTitle, orderSections, generateTypstStyles, applyNameTransform } from '../../typst.js';
import { typ, typMd, typLink, typDate, typPaper, typIcon } from '../../typst.js';

// Native style profile — the values this template was hand-tuned with. The
// customization levels scale these (level 3 == native), so an untouched resume
// renders exactly like the original design. See generateTypstStyles().
const NATIVE = {
  pageSize: 'letter',
  margin: '(left: 0.5in, right: 0.5in, top: 0.5in, bottom: 0.5in)',
  marginMm: { top: 12.7, bottom: 12.7, left: 12.7, right: 12.7 },
  accent: '#1f2937',
  headerFont: 'sans-serif',
  bodyFont: 'sans-serif',
  baseFontPt: 11,
  nameFontPt: 24,
  headingFontPt: 13,
  sectionGapPt: 12,
  entryGapPt: 10,
  leadingEm: 0.6,
  paragraphGapEm: 0.85,
  bulletGapEm: 0.45,
  bulletStyle: 'bullet',
  ruleThickness: 'medium',
  nameTransform: 'small-caps',
  skillsLayout: 'inline',
  justify: false,
};

export const META = {
  name: 'Jake',
  description: 'Clean single-column layout — the most popular GitHub resume template.',
  author: 'Jake Gutierrez',
  license: 'MIT',
  accent: NATIVE.accent,
  format: 'typst',
  uiDefaults: {
    bulletStyle: 'bullet', ruleThickness: 'medium', nameTransform: 'small-caps',
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

export function renderJake(r, opts = {}) {
  const styles = generateTypstStyles(opts.formatting, { ...NATIVE, pageSize: opts.pageSize || NATIVE.pageSize });
  const paper = styles.paper;
  const showIcons = styles.showContactIcons;

  const c = r.contact || {};
  // Centered contact line, separated by " | " (matches the LaTeX $|$ separator).
  // Location is appended last, mirroring jake.js's ordering.
  const contact = [
    c.phone && `${typIcon('phone', showIcons)} ${typ(c.phone)}`,
    c.email && `${typIcon('email', showIcons)} ${typLink('mailto:' + c.email, c.email)}`,
    c.linkedin && `${typIcon('linkedin', showIcons)} ${typLink(c.linkedin)}`,
    c.github && `${typIcon('github', showIcons)} ${typLink(c.github)}`,
    c.website && `${typIcon('website', showIcons)} ${typLink(c.website)}`,
    c.location && `${typIcon('location', showIcons)} ${typ(c.location)}`,
  ]
    .filter(Boolean)
    .join(' #h(0.35em) | #h(0.35em) ');

  const H = (key, fallback) => typ(sectionTitle(r, key, fallback));
  const blocks = {};

  if (r.summary?.trim()) {
    blocks.summary = `#sectionhead[${H('summary', 'Summary')}]\n${typMd(r.summary)}`;
  }

  if (r.education?.length) {
    const items = r.education.map((e) => {
      const degree = [
        e.degree && typ(e.degree),
        e.gpa && `GPA: ${typ(e.gpa)}`,
      ]
        .filter(Boolean)
        .join(' #sym.dash.em ');
      const lines = [`#subheading[${typ(e.school)}][${typ(e.location)}][${degree}][${typDate(e.start, e.end)}]`];
      if (e.details?.length) {
        lines.push(`#bullets[\n${e.details.map((d) => `  - ${typMd(d)}`).join('\n')}\n]`);
      }
      return lines.join('\n');
    });
    blocks.education = `#sectionhead[${H('education', 'Education')}]\n${items.join('\n')}`;
  }

  if (r.experience?.length) {
    const items = r.experience.map((x) => {
      const lines = [`#subheading[${typ(x.title)}][${typDate(x.start, x.end)}][${typ(x.company)}][${typ(x.location)}]`];
      const bullets = [];
      if (x.description?.trim()) bullets.push(`  - ${typMd(x.description)}`);
      if (x.bullets?.length) for (const b of x.bullets) bullets.push(`  - ${typMd(b)}`);
      if (bullets.length) lines.push(`#bullets[\n${bullets.join('\n')}\n]`);
      return lines.join('\n');
    });
    blocks.experience = `#sectionhead[${H('experience', 'Experience')}]\n${items.join('\n')}`;
  }

  if (r.projects?.length) {
    const items = r.projects.map((p) => {
      const head = [
        `#strong[${typMd(p.name)}]`,
        p.tech?.length && `#emph[${p.tech.map(typ).join(', ')}]`,
        p.link && typLink(p.link),
      ]
        .filter(Boolean)
        .join(' #h(0.35em) | #h(0.35em) ');
      const lines = [`#projheading[${head}][${typDate(p.start, p.end)}]`];
      const bullets = [];
      if (p.description?.trim()) bullets.push(`  - ${typMd(p.description)}`);
      if (p.bullets?.length) for (const b of p.bullets) bullets.push(`  - ${typMd(b)}`);
      if (bullets.length) lines.push(`#bullets[\n${bullets.join('\n')}\n]`);
      return lines.join('\n');
    });
    blocks.projects = `#sectionhead[${H('projects', 'Projects')}]\n${items.join('\n')}`;
  }

  if (r.skills?.length) {
    blocks.skills = `#sectionhead[${H('skills', 'Technical Skills')}]\n#skillblock[\n${renderSkills(r.skills, styles.skillsLayout)}\n]`;
  }

  if (r.certifications?.length) {
    const items = r.certifications.map((c2) => {
      const head = [`#strong[${typ(c2.name)}]`, c2.issuer && `#emph[${typ(c2.issuer)}]`]
        .filter(Boolean)
        .join(' #h(0.35em) | #h(0.35em) ');
      return `#projheading[${head}][${typ(c2.date)}]`;
    });
    blocks.certifications = `#sectionhead[${H('certifications', 'Certifications')}]\n${items.join('\n')}`;
  }

  if (r.awards?.length) {
    const items = r.awards.map((a) => {
      const head = [`#strong[${typMd(a.name)}]`, a.issuer && `#emph[${typ(a.issuer)}]`]
        .filter(Boolean)
        .join(' #h(0.35em) | #h(0.35em) ');
      const lines = [`#projheading[${head}][${typ(a.date)}]`];
      if (a.description?.trim()) lines.push(`#bullets[\n  - ${typMd(a.description)}\n]`);
      return lines.join('\n');
    });
    blocks.awards = `#sectionhead[${H('awards', 'Awards')}]\n${items.join('\n')}`;
  }

  const sections = orderSections(
    blocks,
    ['summary', 'education', 'experience', 'projects', 'skills', 'certifications', 'awards'],
    r.sectionOrder,
  );

  const name = applyNameTransform(styles.nameTransform, typ(r.name || 'Your Name'));

  return `#set document(title: ${JSON.stringify(String(r.name || 'Resume'))})
#set page(paper: "${paper}", margin: ${styles.marginStr})
#set text(font: ${styles.bodyFont}, size: ${styles.baseFontSize}, fill: rgb("#1f2937"))
#set par(leading: ${styles.leading}, spacing: ${styles.paragraphSpacing}, justify: ${styles.justify})
#let icon-color = rgb("${styles.accentHex}")
${styles.linkAccent ? `#show link: set text(fill: rgb("${styles.accentHex}"))\n` : ''}
// Section heading: small-caps, large, full-width rule directly beneath. The
// section gap lives in the leading v() so the Section Gap control widens it.
#let sectionhead(title) = {
  v(${styles.sectionSpacing}, weak: true)
  text(font: ${styles.headerFont}, size: ${styles.headingFontSize})[#smallcaps(title)]
  v(4pt, weak: true)
  line(length: 100%, stroke: ${styles.ruleThickness} + rgb("${styles.accentHex}"))
  v(8pt, weak: true)
}

// Two-line entry head (resumeSubheading): bold org + right date, italic role + right location.
#let subheading(lhs, rhs, sub, subr) = {
  block(above: ${styles.entrySpacing}, below: 0pt, width: 100%)[
    #grid(
      columns: (1fr, auto),
      row-gutter: 3pt,
      align: (left, right),
      [#strong[#lhs]], [#rhs],
      [#text(size: 0.9em)[#emph[#sub]]], [#text(size: 0.9em)[#emph[#subr]]]
    )
  ]
}

// Single-line project/cert head (resumeProjectHeading): content left + date right.
#let projheading(lhs, rhs) = block(above: ${styles.entrySpacing}, below: 0pt, width: 100%)[
  #grid(columns: (1fr, auto), align: (left, right), [#text(size: 0.95em)[#lhs]], [#rhs])
]

// Tight bullet list, slightly indented, small text. Inter-bullet spacing tracks
// line height (bulletSpacing), never the entry gap.
#let bullets(body) = block(above: 3pt, below: 2pt)[
  #set list(indent: 0.15in, marker: ${styles.bulletMarker}, spacing: ${styles.bulletSpacing})
  #set text(size: 0.9em)
  #set par(leading: ${styles.leading}, spacing: ${styles.bulletSpacing})
  #body
]

// Skills block — small text, slight indent.
#let skillblock(body) = block(above: ${styles.entrySpacing}, below: 0pt, inset: (left: 0.15in))[
  #set text(size: 0.9em)
  #body
]

#align(center)[
  #text(font: ${styles.headerFont}, size: ${styles.nameFontSize})[#strong[${name}]]${
    r.headline?.trim()
      ? `\n  #linebreak()\n  #v(1pt)\n  #text(size: 1.0em)[#emph[${typ(r.headline)}]]`
      : ''
  }
  #linebreak()
  #v(1pt)
  #text(size: 0.9em)[${contact}]
]

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
      .map((s) => `#strong[${typ(s.category || 'Skills')}:]\n#bullets[\n${(s.items || []).map((i) => `  - ${typ(i)}`).join('\n')}\n]`)
      .join('\n\n');
  }
  return skills
    .map((s) => `  #strong[${typ(s.category || 'Skills')}:] ${(s.items || []).map(typ).join(', ')}`)
    .join(' \\\n');
}
