// Compact technical resume — Typst port of the LaTeX `compact` layout.
// Dense single column, tight spacing, purple accent, thin rule-under headings.
// The goal is to fit a lot cleanly on one page (great for senior engineers).
// Compiles via the Typst engine (format: 'typst').

import { sectionTitle, orderSections } from '../../typst.js';
import { typ, typMd, typLink, typDate, typPaper, typIcon } from '../../typst.js';

export const META = {
  name: 'Compact',
  description: 'Dense single column — fits more on one page. Great for senior engineers.',
  author: 'Resumex',
  license: 'MIT',
  accent: '#7c3aed',
  defaultPageSize: 'a4',
  format: 'typst',
};

export function renderCompact(r, opts = {}) {
  const paper = typPaper(opts.pageSize || META.defaultPageSize);

  const c = r.contact || {};
  const contact = [
    c.email && `${typIcon('email')} ${typLink('mailto:' + c.email, c.email)}`,
    c.phone && `${typIcon('phone')} ${typ(c.phone)}`,
    c.location && `${typIcon('location')} ${typ(c.location)}`,
    c.linkedin && `${typIcon('linkedin')} ${typLink(c.linkedin)}`,
    c.github && `${typIcon('github')} ${typLink(c.github)}`,
    c.website && `${typIcon('website')} ${typLink(c.website)}`,
  ]
    .filter(Boolean)
    .join('  #sym.bullet  ');

  // Section heading helper: user override → generic default. Escaped for Typst.
  const H = (key, fallback) => typ(sectionTitle(r, key, fallback));

  // A tight bullet list that hugs the line above it. `tight: true` removes the
  // extra inter-item leading so it stays dense like the LaTeX itemsep=-2pt.
  const bulletList = (arr) =>
    arr?.length ? '\n' + arr.map((b) => `- ${typMd(b)}`).join('\n') : '';

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
      return `#block(above: 8pt, below: 0pt, width: 100%)[\n${lines.join('\n')}\n]`;
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
      return `#block(above: 8pt, below: 0pt, width: 100%)[\n${lines.join('\n')}\n]`;
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
      return `#block(above: 8pt, below: 0pt, width: 100%)[\n${lines.join('\n')}\n]`;
    });
    blocks.education = `#sectionhead[${H('education', 'Education')}]\n${items.join('\n')}`;
  }

  if (r.skills?.length) {
    const isBullets = r.settings?.skillsAsBullets ?? false;
    let lines = '';
    if (isBullets) {
      lines = r.skills
        .map(s => `#strong[${typ(s.category || 'Skills')}:]\n${(s.items || []).map(i => `  - ${typ(i)}`).join('\n')}`)
        .join('\n\n');
    } else {
      lines = r.skills
        .map(s => `#strong[${typ(s.category || 'Skills')}:] ${(s.items || []).map(typ).join(' #sym.bullet ')}`)
        .join(' \\\n');
    }
    blocks.skills = `#sectionhead[${H('skills', 'Skills')}]\n#skillblock[\n${lines}\n]`;
  }

  if (r.certifications?.length) {
    const items = r.certifications.map((c2) => {
      const lhs = `#strong[${typ(c2.name)}], ${typ(c2.issuer)}`;
      return `#block(above: 8pt, below: 0pt, width: 100%)[\n#entryline[${lhs}][${typ(c2.date)}]\n]`;
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
      return `#block(above: 8pt, below: 0pt, width: 100%)[\n${lines.join('\n')}\n]`;
    });
    blocks.awards = `#sectionhead[${H('awards', 'Awards')}]\n${items.join('\n')}`;
  }

  const ordered = orderSections(
    blocks,
    ['summary', 'experience', 'projects', 'education', 'skills', 'certifications', 'awards'],
    r.sectionOrder,
  );

  const nameTyp = typ(r.name || 'Your Name');
  const headlineTyp = r.headline ? typ(r.headline) : '';
  // Name and headline share a line; Typst wraps to a second line automatically
  // when they don't fit, mirroring the LaTeX \settowidth measurement.
  const header = headlineTyp
    ? `#text(size: 17pt, weight: "bold", fill: accent)[${nameTyp}] #h(0.25em) #sym.dash.em #h(0.25em) #text(size: 13pt, weight: "bold")[${headlineTyp}]`
    : `#text(size: 17pt, weight: "bold", fill: accent)[${nameTyp}]`;

  return `#set document(title: ${JSON.stringify(String(r.name || 'Resume'))})
#set page(paper: "${paper}", margin: 0.5in)
#set text(font: ("New Computer Modern", "Latin Modern Roman", "Times New Roman", "Liberation Serif"), size: 9.5pt, fill: rgb("#1A1A1A"))
#set par(leading: 0.55em, spacing: 0.65em, justify: false)

#let accent = rgb("#7C3AED")
#let icon-color = accent
#show link: set text(fill: accent)

// Bullet lists — slightly loosened from the original tight setting.
#set list(tight: false, indent: 0pt, body-indent: 0.5em, marker: [#sym.bullet], spacing: 0.55em)

// Section heading: vertically centered title underlined by a thin accent rule.
#let sectionhead(title) = {
  v(4pt, weak: true)
  text(fill: accent, weight: "bold", size: 10.5pt)[#upper(title)]
  v(4pt, weak: true)
  line(length: 100%, stroke: 0.3pt + black)
  v(6pt, weak: true)
}

// One entry head line: content left, date right (italic), on a single row.
#let entryline(lhs, rhs) = grid(
  columns: (1fr, auto),
  column-gutter: 1em,
  align: (left, right),
  lhs,
  emph(rhs),
)

#let skillblock(body) = block(above: 8pt, below: 0pt)[
  #body
]

${header}
#v(4pt, weak: true)
#text(size: 8.5pt)[${contact}]
#v(4pt, weak: true)
#line(length: 100%, stroke: 0.8pt + black)
#v(4pt, weak: true)

${ordered.join('\n\n#v(10pt, weak: true)\n\n')}
`;
}
