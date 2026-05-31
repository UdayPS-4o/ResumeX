// "Executive" template — Typst port of the LaTeX `executive` layout.
// Branded: big blue name, bold sans headline, blue uppercase sections each
// underlined by a single blue rule. Projects render as flowing paragraphs.
// Compiles via the Typst engine (format: 'typst').

import { sectionTitle, orderSections, generateTypstStyles, applyNameTransform } from '../../typst.js';
import { typ, typMd, typLink, typDate, typPaper, typIcon } from '../../typst.js';

// Native style profile — the values this template was hand-tuned with. The
// customization levels scale these (level 3 == native), so an untouched resume
// renders exactly like the original design. See generateTypstStyles().
const NATIVE = {
  pageSize: 'a4',
  margin: '(left: 0.65in, right: 0.65in, top: 0.55in, bottom: 0.55in)',
  marginMm: { top: 14.0, bottom: 14.0, left: 16.5, right: 16.5 },
  accent: '#1D4ED8', // matches the panel's "Blue" preset so it auto-selects (no redundant Template chip)
  headerFont: 'sans-serif',
  bodyFont: 'sans-serif',
  baseFontPt: 10,
  nameFontPt: 24,
  headingFontPt: 12.5,
  sectionGapPt: 12,
  entryGapPt: 10,
  leadingEm: 0.55,
  paragraphGapEm: 0.7,
  bulletGapEm: 0.4,
  bulletStyle: 'bullet',
  ruleThickness: 'medium',
  nameTransform: 'normal',
  skillsLayout: 'inline',
  justify: false,
};

export const META = {
  name: 'Executive',
  description: 'Branded — big colored name, bold rule-separated sections.',
  author: 'resume-latex-renderer',
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

export function renderExecutive(r, opts = {}) {
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

  // PROFILE
  if (r.summary?.trim()) {
    blocks.summary = `#sectionhead[${H('summary', 'Profile')}]\n${typMd(r.summary)}`;
  }

  // WORK EXPERIENCE
  if (r.experience?.length) {
    const items = r.experience.map((x) => {
      const titleCo = [x.title && typ(x.title), x.company && typ(x.company)]
        .filter(Boolean)
        .join(', ');
      const parts = [];
      parts.push(`[${titleCo}]`);
      parts.push(`[${typDate(x.start, x.end)}]`);
      if (x.location) {
        parts.push(`location: [${typ(x.location)}]`);
      }
      if (x.description?.trim()) {
        parts.push(`description: [\n${typMd(x.description)}\n]`);
      }
      if (x.bullets?.length) {
        const listItems = x.bullets.map((b) => `- ${typMd(b)}`).join('\n');
        parts.push(`bullets: [\n${listItems}\n]`);
      }
      return `#entry(${parts.join(', ')})`;
    });
    blocks.experience = `#sectionhead[${H('experience', 'Work Experience')}]\n${items.join('\n')}`;
  }

  // PROJECTS
  if (r.projects?.length) {
    const items = r.projects.map((p) => {
      const projDate =
        p.start && p.end ? typDate(p.start, p.end) : p.end || p.start ? typ(p.end || p.start) : '';

      const parts = [];
      parts.push(`[${typMd(p.name)}]`);
      parts.push(`[${projDate}]`);
      if (p.description?.trim()) {
        parts.push(`description: [\n${typMd(p.description)}\n]`);
      }
      if (p.bullets?.length) {
        const listItems = p.bullets.map((b) => `- ${typMd(b)}`).join('\n');
        parts.push(`bullets: [\n${listItems}\n]`);
      }
      return `#entry(${parts.join(', ')})`;
    });
    blocks.projects = `#sectionhead[${H('projects', 'Projects')}]\n${items.join('\n')}`;
  }

  // SKILLS
  if (r.skills?.length) {
    blocks.skills = `#sectionhead[${H('skills', 'Skills')}]\n#skillblock[\n${renderSkills(r.skills, styles.skillsLayout)}\n]`;
  }

  // EDUCATION
  if (r.education?.length) {
    const items = r.education.map((e) => {
      const schoolLoc = [e.school && typ(e.school), e.location && typ(e.location)]
        .filter(Boolean)
        .join(', ');
      const sub = [];
      if (e.degree) sub.push(typ(e.degree));
      if (e.gpa) sub.push(`GPA: ${typ(e.gpa)}`);

      const parts = [];
      parts.push(`[${schoolLoc}]`);
      parts.push(`[${typDate(e.start, e.end)}]`);
      if (sub.length) {
        parts.push(`description: [\n${sub.join(' \\\n')}\n]`);
      }
      if (e.details?.length) {
        const listItems = e.details.map((d) => `- ${typMd(d)}`).join('\n');
        parts.push(`bullets: [\n${listItems}\n]`);
      }
      return `#entry(${parts.join(', ')})`;
    });
    blocks.education = `#sectionhead[${H('education', 'Education')}]\n${items.join('\n')}`;
  }

  // CERTIFICATIONS
  if (r.certifications?.length) {
    const items = r.certifications.map((c2) => {
      const parts = [];
      parts.push(`[${typ(c2.name)}]`);
      parts.push(`[${typ(c2.date)}]`);
      if (c2.issuer) {
        parts.push(`description: [${typ(c2.issuer)}]`);
      }
      return `#entry(${parts.join(', ')})`;
    });
    blocks.certifications = `#sectionhead[${H('certifications', 'Certifications')}]\n${items.join('\n')}`;
  }

  // AWARDS
  if (r.awards?.length) {
    const items = r.awards.map((a) => {
      const sub = [a.issuer && typ(a.issuer), a.description?.trim() && typMd(a.description)]
        .filter(Boolean)
        .join(' \\\n');
      const parts = [];
      parts.push(`[${typMd(a.name)}]`);
      parts.push(`[${typ(a.date)}]`);
      if (sub) {
        parts.push(`description: [\n${sub}\n]`);
      }
      return `#entry(${parts.join(', ')})`;
    });
    blocks.awards = `#sectionhead[${H('awards', 'Awards')}]\n${items.join('\n')}`;
  }

  const sections = orderSections(
    blocks,
    ['summary', 'experience', 'projects', 'skills', 'education', 'certifications', 'awards'],
    r.sectionOrder,
  );

  const name = applyNameTransform(styles.nameTransform, typ(r.name || 'YOUR NAME'));

  return `#set document(title: ${JSON.stringify(String(r.name || 'Resume'))})
#set page(paper: "${paper}", margin: ${styles.marginStr})
#set text(font: ${styles.bodyFont}, size: ${styles.baseFontSize}, fill: rgb("#1A1F2B"))
#set par(leading: ${styles.leading}, spacing: ${styles.paragraphSpacing}, justify: ${styles.justify})
${styles.linkAccent ? `#show link: set text(fill: rgb("${styles.accentHex}"))\n` : ''}
#let accent = rgb("${styles.accentHex}")
#let icon-color = accent
#let subtext = rgb("#374151")

#set list(indent: 0.15in, body-indent: 0.5em, marker: ${styles.bulletMarker}, spacing: ${styles.bulletSpacing})

// Section header: vertically centered title underlined by a single blue rule.
#let sectionhead(title) = {
  v(${styles.sectionSpacing}, weak: true)
  text(font: ${styles.headerFont}, fill: accent, weight: "bold", size: ${styles.headingFontSize})[#upper(title)]
  v(4pt, weak: true)
  line(length: 100%, stroke: ${styles.ruleThickness} + rgb("${styles.accentHex}"))
  v(8pt, weak: true)
}

// Entry helper with vertical centering, matching jake's robust spacing.
#let entry(
  title-co,
  date,
  location: none,
  description: none,
  bullets: none,
) = block(
  above: ${styles.entrySpacing},
  below: 0pt,
  width: 100%,
)[
  #grid(columns: (1fr, auto), align: (left, right), [#strong[#title-co]], [#date])
  #if location != none [
    #v(2pt)
    #text(size: 0.9em, fill: subtext)[#location]
  ]
  #if description != none [
    #v(3pt)
    #description
  ]
  #if bullets != none [
    #v(3pt)
    #bullets
  ]
]

#let skillblock(body) = block(above: ${styles.entrySpacing}, below: 0pt)[
  #body
]

#text(font: ${styles.headerFont}, size: ${styles.nameFontSize}, weight: "bold", fill: accent)[${name}]

#v(2pt)
#text(size: ${styles.baseFontSize} * 1.6, weight: "bold")[${typ(r.headline || '')}]

#v(2pt)
#text(size: 0.9em)[${contact}]

${sections.join(`\n\n#v(${styles.sectionSpacing}, weak: true)\n\n`)}
`;
}

// Skills renderer — honours the Skills Layout control (native: inline).
//   inline  → "Category: a, b, c" comma-separated, one line per category
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
