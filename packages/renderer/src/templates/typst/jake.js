// "Jake" template — Typst port of the LaTeX `jake` layout (Jake Gutierrez resume).
// https://github.com/jakegut/resume — MIT-licensed.
// Centered name + single contact line, small-caps sections with a full-width
// rule beneath, two-line entry heads. Compiles via the Typst engine.

import { sectionTitle, orderSections } from '../../typst.js';
import { typ, typMd, typLink, typDate, typPaper, typIcon } from '../../typst.js';

export const META = {
  name: 'Jake',
  description: 'Clean single-column layout — the most popular GitHub resume template.',
  author: 'Jake Gutierrez',
  license: 'MIT',
  accent: '#1f2937',
  format: 'typst',
};

export function renderJake(r, opts = {}) {
  const paper = typPaper(opts.pageSize || 'letter');

  const c = r.contact || {};
  // Centered contact line, separated by " | " (matches the LaTeX $|$ separator).
  // Location is appended last, mirroring jake.js's ordering.
  const contact = [
    c.phone && `${typIcon('phone')} ${typ(c.phone)}`,
    c.email && `${typIcon('email')} ${typLink('mailto:' + c.email, c.email)}`,
    c.linkedin && `${typIcon('linkedin')} ${typLink(c.linkedin)}`,
    c.github && `${typIcon('github')} ${typLink(c.github)}`,
    c.website && `${typIcon('website')} ${typLink(c.website)}`,
    c.location && `${typIcon('location')} ${typ(c.location)}`,
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
    const isBullets = r.settings?.skillsAsBullets ?? false;
    let lines = '';
    if (isBullets) {
      lines = r.skills
        .map(s => `#strong[${typ(s.category || 'Skills')}:]\n#bullets[\n${(s.items || []).map(i => `  - ${typ(i)}`).join('\n')}\n]`)
        .join('\n\n');
    } else {
      lines = r.skills
        .map(s => `  #strong[${typ(s.category || 'Skills')}:] ${(s.items || []).map(typ).join(', ')}`)
        .join(' \\\n');
    }
    blocks.skills = `#sectionhead[${H('skills', 'Technical Skills')}]\n#skillblock[\n${lines}\n]`;
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

  return `#set document(title: ${JSON.stringify(String(r.name || 'Resume'))})
#set page(paper: "${paper}", margin: (left: 0.5in, right: 0.5in, top: 0.5in, bottom: 0.5in))
#set text(font: ("Arial", "Helvetica Neue", "Liberation Sans"), size: 11pt, fill: rgb("#1F2937"))
#set par(leading: 0.6em, spacing: 0.85em, justify: false)
#let icon-color = rgb("#1F2937")

// Section heading: small-caps, large, full-width rule directly beneath.
#let sectionhead(title) = {
  v(4pt, weak: true)
  text(size: 13pt)[#smallcaps(title)]
  v(4pt, weak: true)
  line(length: 100%, stroke: 0.5pt + rgb("#1F2937"))
  v(8pt, weak: true)
}

// Two-line entry head (resumeSubheading): bold org + right date, italic role + right location.
#let subheading(lhs, rhs, sub, subr) = {
  block(above: 10pt, below: 0pt, width: 100%)[
    #grid(
      columns: (1fr, auto),
      row-gutter: 3pt,
      align: (left, right),
      [#strong[#lhs]], [#rhs],
      [#text(size: 10pt)[#emph[#sub]]], [#text(size: 10pt)[#emph[#subr]]]
    )
  ]
}

// Single-line project/cert head (resumeProjectHeading): content left + date right.
#let projheading(lhs, rhs) = block(above: 10pt, below: 0pt, width: 100%)[
  #grid(columns: (1fr, auto), align: (left, right), [#text(size: 10.5pt)[#lhs]], [#rhs])
]

// Tight bullet list, slightly indented, small text.
#let bullets(body) = block(above: 3pt, below: 2pt)[
  #set list(indent: 0.15in, marker: text(size: 0.7em)[#sym.bullet], spacing: 5pt)
  #set text(size: 10pt)
  #set par(leading: 0.58em, spacing: 0.58em)
  #body
]

// Skills block — small text, slight indent.
#let skillblock(body) = block(above: 8pt, below: 0pt, inset: (left: 0.15in))[
  #set text(size: 10pt)
  #body
]

#align(center)[
  #text(size: 24pt, weight: "bold")[#smallcaps[${typ(r.name || 'Your Name')}]]${
    r.headline?.trim()
      ? `\n  #linebreak()\n  #v(1pt)\n  #text(size: 11pt)[#emph[${typ(r.headline)}]]`
      : ''
  }
  #linebreak()
  #v(1pt)
  #text(size: 10pt)[${contact}]
]

#v(8pt, weak: true)

${sections.join('\n\n#v(12pt, weak: true)\n\n')}
`;
}
