// "Modern" template — Typst port of the LaTeX `modern` layout.
// Big blue name, bold rule-separated uppercase sections, sans-serif body.
// Compiles via the Typst engine (format: 'typst').

import { sectionTitle, orderSections, generateTypstStyles, applyNameTransform } from '../../typst.js';
import { typ, typMd, typLink, typDate, typPaper, typIcon } from '../../typst.js';

// Native style profile — the values this template was hand-tuned with. The
// customization levels scale these (level 3 == native), so an untouched resume
// renders exactly like the original design. See generateTypstStyles().
const NATIVE = {
  pageSize: 'a4',
  margin: '(left: 0.39in, right: 0.39in, top: 0.30in, bottom: 0.30in)',
  marginMm: { top: 7.6, bottom: 7.6, left: 9.9, right: 9.9 },
  accent: '#2062c9',
  headerFont: 'sans-serif', bodyFont: 'sans-serif',
  baseFontPt: 10, nameFontPt: 24, headingFontPt: 12,
  sectionGapPt: 12, entryGapPt: 10,
  leadingEm: 0.55, paragraphGapEm: 0.45, bulletGapEm: 0.2,
  bulletStyle: 'bullet', ruleThickness: 'medium', nameTransform: 'normal',
  skillsLayout: 'inline', justify: false,
};

export const META = {
  name: 'Modern',
  description: 'Bold colored name with rule-separated sections — clean and contemporary.',
  author: 'Resumex',
  license: 'MIT',
  accent: NATIVE.accent,
  defaultPageSize: 'a4',
  format: 'typst',
  uiDefaults: {
    bulletStyle: 'bullet', ruleThickness: 'medium', nameTransform: 'normal',
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

export function renderModern(r, opts = {}) {
  const styles = generateTypstStyles(opts.formatting, { ...NATIVE, pageSize: opts.pageSize || NATIVE.pageSize });
  const paper = styles.paper;
  const showIcons = styles.showContactIcons;

  const c = r.contact || {};
  const contact = [
    c.location && `${typIcon('location', showIcons)} ${typ(c.location)}`,
    c.phone && `${typIcon('phone', showIcons)} ${typ(c.phone)}`,
    c.email && `${typIcon('email', showIcons)} ${typLink('mailto:' + c.email, c.email)}`,
    c.linkedin && `${typIcon('linkedin', showIcons)} ${typLink(c.linkedin)}`,
    c.github && `${typIcon('github', showIcons)} ${typLink(c.github)}`,
    c.website && `${typIcon('website', showIcons)} ${typLink(c.website)}`,
  ]
    .filter(Boolean)
    .join(' | ');

  const H = (key, fallback) => typ(sectionTitle(r, key, fallback));
  const blocks = {};

  if (r.summary?.trim()) {
    blocks.summary = `#sectionhead[${H('summary', 'Profile')}]\n${typMd(r.summary)}`;
  }

  if (r.experience?.length) {
    const items = r.experience.map((x) => {
      const titleCo = [x.title && typ(x.title), x.company && typ(x.company)]
        .filter(Boolean)
        .join(', ');
      const lines = [`#entryhead[${titleCo}][${typDate(x.start, x.end)}]`];
      if (x.location) lines.push(`#text(size: 0.9em, fill: subtext)[${typ(x.location)}]`);
      if (x.description?.trim()) lines.push(typMd(x.description));
      if (x.bullets?.length) lines.push(`#v(2pt)\n` + x.bullets.map((b) => `- ${typMd(b)}`).join('\n'));
      // Join with blank lines so the inline location and description become
      // separate paragraphs (a single \n keeps them on one run-together line).
      return lines.join('\n\n');
    });
    blocks.experience = `#sectionhead[${H('experience', 'Work Experience')}]\n${items.join(`\n#v(${styles.entrySpacing})\n`)}`;
  }

  if (r.projects?.length) {
    const items = r.projects.map((p) => {
      const projDate =
        p.start && p.end ? typDate(p.start, p.end) : p.end || p.start ? typ(p.end || p.start) : '';
      const lines = [`#entryhead[${typMd(p.name)}][${projDate}]`];
      if (p.description?.trim()) lines.push(typMd(p.description));
      if (p.bullets?.length) lines.push(`#v(2pt)\n` + p.bullets.map((b) => `- ${typMd(b)}`).join('\n'));
      return lines.join('\n\n');
    });
    blocks.projects = `#sectionhead[${H('projects', 'Projects')}]\n${items.join(`\n#v(${styles.entrySpacing})\n`)}`;
  }

  if (r.skills?.length) {
    blocks.skills = `#sectionhead[${H('skills', 'Skills')}]\n${renderSkills(r.skills, styles.skillsLayout)}`;
  }

  if (r.education?.length) {
    const items = r.education.map((e) => {
      const schoolLoc = [e.school && typ(e.school), e.location && typ(e.location)]
        .filter(Boolean)
        .join(', ');
      const lines = [`#entryhead[${schoolLoc}][${typDate(e.start, e.end)}]`];
      const sub = [];
      if (e.degree) sub.push(typ(e.degree));
      if (e.gpa) sub.push(`GPA: ${typ(e.gpa)}`);
      if (sub.length) lines.push(sub.join(' \\\n'));
      if (e.details?.length) lines.push(`#v(2pt)\n` + e.details.map((d) => `- ${typMd(d)}`).join('\n'));
      return lines.join('\n\n');
    });
    blocks.education = `#sectionhead[${H('education', 'Education')}]\n${items.join(`\n#v(${styles.entrySpacing})\n`)}`;
  }

  if (r.certifications?.length) {
    const items = r.certifications.map(
      (c2) => `#entryhead[${typ(c2.name)}][${typ(c2.date)}]\n\n${typ(c2.issuer)}`,
    );
    blocks.certifications = `#sectionhead[${H('certifications', 'Certifications')}]\n${items.join('\n#v(4pt)\n')}`;
  }

  if (r.awards?.length) {
    const items = r.awards.map((a) => {
      const lines = [`#entryhead[${typMd(a.name)}][${typ(a.date)}]`];
      if (a.issuer) lines.push(typ(a.issuer));
      if (a.description?.trim()) lines.push(typMd(a.description));
      return lines.join('\n\n');
    });
    blocks.awards = `#sectionhead[${H('awards', 'Awards')}]\n${items.join('\n#v(4pt)\n')}`;
  }

  const sections = orderSections(
    blocks,
    ['summary', 'experience', 'projects', 'skills', 'education', 'certifications', 'awards'],
    r.sectionOrder,
  );

  const name = applyNameTransform(styles.nameTransform, typ(r.name || 'YOUR NAME'));

  return `#set document(title: ${JSON.stringify(String(r.name || 'Resume'))})
#set page(paper: "${paper}", margin: ${styles.marginStr})
#set text(font: ${styles.bodyFont}, size: ${styles.baseFontSize}, fill: rgb("#1E2330"))
#set par(leading: ${styles.leading}, spacing: ${styles.paragraphSpacing}, justify: ${styles.justify})
#set list(indent: 1.1em, body-indent: 0.4em, tight: false, marker: ${styles.bulletMarker}, spacing: ${styles.bulletSpacing})
#show list: it => { set par(leading: ${styles.leading}, spacing: ${styles.bulletSpacing}); it }
${styles.linkAccent ? `#show link: set text(fill: rgb("${styles.accentHex}"))\n` : ''}
#let namecol = rgb("${styles.accentHex}")
#let sectioncol = namecol
#let icon-color = sectioncol
#let subtext = rgb("#3A3F4B")
// Section heading: uppercase, accent-colored, bracketed by TWO accent rules
// (above and below the title) — modern's signature look. Rule weight tracks the
// Rule Thickness control; the leading v() carries the Section Gap.
#let sectionhead(title) = {
  v(${styles.sectionSpacing})
  line(length: 100%, stroke: ${styles.ruleThickness} + sectioncol)
  v(2pt)
  text(font: ${styles.headerFont}, fill: sectioncol, weight: "bold", size: ${styles.headingFontSize})[#upper(title)]
  v(2pt)
  line(length: 100%, stroke: ${styles.ruleThickness} + sectioncol)
  v(5pt)
}
#let entryhead(lhs, rhs) = grid(columns: (1fr, auto), align: (left, right), [#strong[#lhs]], [#rhs])

#text(font: ${styles.headerFont}, size: ${styles.nameFontSize}, weight: "bold", fill: namecol)[${name}]

#v(2pt)
#text(font: ${styles.headerFont}, size: ${styles.baseFontSize} * 1.6, weight: "bold")[${typ(r.headline || '')}]

#v(2pt)
#text(size: 0.9em)[${contact}]

${sections.join('\n\n')}
`;
}

// Skills renderer — honours the Skills Layout control (native: inline).
//   inline  → "Category: a, b, c" one line per category (comma-separated)
//   grouped → bold category then comma items (distinct line per category)
//   bulleted→ bold category then a bullet list of items
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
