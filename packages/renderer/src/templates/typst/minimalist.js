// "Minimalist" template — clean, high-density, ATS-friendly serif layout.
// Centered name and subtitle, thin horizontal rules framing centered section headers, and traditional serif typography.

import { sectionTitle, orderSections } from '../../typst.js';
import { typ, typMd, typLink, typDate, typPaper, typIcon } from '../../typst.js';

export const META = {
  name: 'Minimalist',
  description: 'ATS-friendly serif layout — high-density typography framed by thin lines.',
  author: 'Resumex',
  license: 'MIT',
  accent: '#000000',
  defaultPageSize: 'a4',
  format: 'typst',
};

export function renderMinimalist(r, opts = {}) {
  const paper = typPaper(opts.pageSize || META.defaultPageSize);
  const accentColor = opts.accentColor || META.accent;

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
    blocks.experience = `#sectionhead[${H('experience', 'Experience')}]\n${items.join('\n\n#v(6pt)\n\n')}`;
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
    blocks.education = `#sectionhead[${H('education', 'Education')}]\n${items.join('\n\n#v(6pt)\n\n')}`;
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
    blocks.projects = `#sectionhead[${H('projects', 'Projects')}]\n${items.join('\n\n#v(6pt)\n\n')}`;
  }

  // SKILLS
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
    blocks.awards = `#sectionhead[${H('awards', 'Awards')}]\n${items.join('\n\n#v(4pt)\n\n')}`;
  }

  const sections = orderSections(
    blocks,
    ['summary', 'experience', 'education', 'projects', 'skills', 'certifications', 'awards'],
    r.sectionOrder,
  );

  return `#set document(title: ${JSON.stringify(String(r.name || 'Resume'))})
#set page(paper: "${paper}", margin: (left: 0.65in, right: 0.65in, top: 0.65in, bottom: 0.65in))
#set text(font: ("Times New Roman", "New Computer Modern", "Liberation Serif", "Georgia"), size: 10pt, fill: rgb("#1a202c"))
#set par(leading: 0.5em, spacing: 0.6em, justify: false)

#let accent = rgb("${accentColor}")
#let icon-color = accent
#let ink = rgb("#1a202c")

// Minimalist section heading framed by thin lines.
#let sectionhead(title) = {
  v(8pt)
  line(length: 100%, stroke: 0.3pt + rgb("#a0aec0"))
  v(2pt)
  align(center)[#text(size: 10.5pt, weight: "bold", tracking: 1.5pt, fill: ink)[#upper(title)]]
  v(2pt)
  line(length: 100%, stroke: 0.3pt + rgb("#a0aec0"))
  v(4pt)
}

// Bold left, plain right (used for the primary entry head line).
#let entryhead(lhs, rhs) = grid(columns: (1fr, auto), align: (left, right), [#strong[#lhs]], [#rhs])
// Italic left, italic right (used for the secondary entry line).
#let entrysub(lhs, rhs) = grid(columns: (1fr, auto), align: (left, right), [#emph[#lhs]], [#emph[#rhs]])
#set list(indent: 0.5em, spacing: 0.35em, marker: [#sym.dash.en])

#align(center)[
  #text(size: 24pt, weight: "bold", fill: ink)[${typ(r.name || 'Your Name')}]
  ${r.headline ? `\n  #v(-2pt)\n  #text(style: "italic", size: 11.5pt, fill: rgb("#4a5568"))[${typ(r.headline)}]` : ''}
  #v(4pt)
  #text(size: 8.5pt, fill: rgb("#4a5568"))[${contact}]
]

#v(8pt)

${sections.join('\n\n')}
`;
}
