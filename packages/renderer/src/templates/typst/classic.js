// "Classic" template — Typst port of the LaTeX `classic` layout.
// Traditional single-column serif resume: centered name, centered bold section
// headings sitting above a thin full-width rule, near-black ink. ATS-friendly.
// Compiles via the Typst engine (format: 'typst').

import { sectionTitle, orderSections } from '../../typst.js';
import { typ, typMd, typLink, typDate, typPaper, typIcon } from '../../typst.js';

export const META = {
  name: 'Classic',
  description: 'Traditional serif resume — conservative and timeless.',
  author: 'Resumex',
  license: 'MIT',
  accent: '#111827',
  defaultPageSize: 'a4',
  format: 'typst',
};

export function renderClassic(r, opts = {}) {
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
    blocks.experience = `#sectionhead[${H('experience', 'Experience')}]\n${items.join('\n\n#v(6pt)\n\n')}`;
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
    blocks.education = `#sectionhead[${H('education', 'Education')}]\n${items.join('\n\n#v(6pt)\n\n')}`;
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
    blocks.projects = `#sectionhead[${H('projects', 'Projects')}]\n${items.join('\n\n#v(6pt)\n\n')}`;
  }

  // SKILLS — one line per category, bold label then comma-joined items.
  if (r.skills?.length) {
    const isBullets = r.settings?.skillsAsBullets ?? false;
    let lines = '';
    if (isBullets) {
      lines = r.skills
        .map(s => `#strong[${typ(s.category || 'Skills')}:]\n${(s.items || []).map(i => `  - ${typ(i)}`).join('\n')}`)
        .join('\n\n');
    } else {
      lines = r.skills
        .map(s => `#strong[${typ(s.category || 'Skills')}:] ${(s.items || []).map(typ).join(', ')}`)
        .join(' \\\n');
    }
    blocks.skills = `#sectionhead[${H('skills', 'Skills')}]\n${lines}`;
  }

  // CERTIFICATIONS — bold name, issuer, right-aligned date.
  if (r.certifications?.length) {
    const lines = r.certifications
      .map((c2) => `#entryhead[#strong[${typ(c2.name)}], ${typ(c2.issuer)}][${typ(c2.date)}]`)
      .join('\n\n');
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
    blocks.awards = `#sectionhead[${H('awards', 'Awards')}]\n${items.join('\n\n#v(4pt)\n\n')}`;
  }

  const sections = orderSections(
    blocks,
    ['summary', 'experience', 'education', 'projects', 'skills', 'certifications', 'awards'],
    r.sectionOrder,
  );

  return `#set document(title: ${JSON.stringify(String(r.name || 'Resume'))})
#set page(paper: "${paper}", margin: 0.85in)
#set text(font: ("Georgia", "Times New Roman", "Linux Libertine"), size: 11pt, fill: rgb("#111827"))
#set par(leading: 0.55em, spacing: 0.65em, justify: false)

#let ink = rgb("#111827")
#let icon-color = ink
// Centered bold section title sitting cleanly above a thin full-width rule.
#let sectionhead(title) = {
  v(12pt)
  align(center)[#text(weight: "bold", size: 1.2em)[#title]]
  v(4pt)
  line(length: 100%, stroke: 0.5pt + ink)
  v(8pt)
}
// Bold left, plain right (used for the primary entry head line).
#let entryhead(lhs, rhs) = grid(columns: (1fr, auto), align: (left, right), [#strong[#lhs]], [#rhs])
// Italic left, italic right (used for the secondary entry line).
#let entrysub(lhs, rhs) = grid(columns: (1fr, auto), align: (left, right), [#emph[#lhs]], [#emph[#rhs]])
#set list(indent: 0.6em, spacing: 0.5em, marker: [•])

#align(center)[
  #text(size: 2.2em, weight: "bold")[${typ(r.name || 'Your Name')}]
  ${r.headline ? `\n  #v(2pt)\n  #text(style: "italic")[${typ(r.headline)}]` : ''}
  #v(4pt)
  #text(size: 0.95em)[${contact}]
]

#v(6pt)

${sections.join('\n\n')}
`;
}
