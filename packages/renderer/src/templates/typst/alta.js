// "Alta" template — AltaCV-inspired layout.
// Left-aligned header with name and subtitle, right-aligned contact block.
// Teal accent color, clean section headings with thick accent rules extending to the right.

import { sectionTitle, orderSections } from '../../typst.js';
import { typ, typMd, typLink, typDate, typPaper, typIcon } from '../../typst.js';

export const META = {
  name: 'Alta',
  description: 'AltaCV-inspired layout — asymmetric header, teal accents, and thick timeline rules.',
  author: 'Resumex',
  license: 'MIT',
  accent: '#0d9488',
  defaultPageSize: 'a4',
  format: 'typst',
};

export function renderAlta(r, opts = {}) {
  const paper = typPaper(opts.pageSize || META.defaultPageSize);
  const accentColor = opts.accentColor || META.accent;

  const c = r.contact || {};
  const contactLines = [
    c.email && `${typIcon('email')} ${typLink('mailto:' + c.email, c.email)}`,
    c.phone && `${typIcon('phone')} ${typ(c.phone)}`,
    c.location && `${typIcon('location')} ${typ(c.location)}`,
    c.linkedin && `${typIcon('linkedin')} ${typLink(c.linkedin)}`,
    c.github && `${typIcon('github')} ${typLink(c.github)}`,
    c.website && `${typIcon('website')} ${typLink(c.website)}`,
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
#set page(paper: "${paper}", margin: (left: 0.6in, right: 0.6in, top: 0.6in, bottom: 0.6in))
#set text(font: ("Liberation Sans", "Arial", "Roboto"), size: 10pt, fill: rgb("#2d3748"))
#set par(leading: 0.55em, spacing: 0.65em, justify: false)

#let accent = rgb("${accentColor}")
#let icon-color = accent
#let ink = rgb("#2d3748")

// Section title left-aligned with a thick accent rule extending to the right.
#let sectionhead(title) = {
  v(10pt)
  grid(
    columns: (auto, 1fr),
    align: (left, center),
    column-gutter: 0.6em,
    text(fill: accent, weight: "bold", size: 1.15em)[#upper(title)],
    line(length: 100%, stroke: 1.5pt + accent)
  )
  v(4pt)
}

// Bold left, plain right (used for the primary entry head line).
#let entryhead(lhs, rhs) = grid(columns: (1fr, auto), align: (left, right), [#strong[#lhs]], [#rhs])
// Italic left, italic right (used for the secondary entry line).
#let entrysub(lhs, rhs) = grid(columns: (1fr, auto), align: (left, right), [#emph[#lhs]], [#emph[#rhs]])
#set list(indent: 0.5em, spacing: 0.4em, marker: text(fill: accent)[#sym.triangle.filled.r])

#grid(
  columns: (1fr, auto),
  column-gutter: 1.5em,
  align: (left, top),
  [
    #text(size: 26pt, weight: "bold", fill: accent)[${typ(r.name || 'Your Name')}]
    ${r.headline ? `\n    #v(3pt)\n    #text(size: 13pt, weight: "medium", fill: ink)[${typ(r.headline)}]` : ''}
  ],
  [
    #set text(size: 8.5pt, fill: rgb("#4a5568"))
    #set par(leading: 0.4em)
    ${contactLines.join(' \\\n')}
  ]
)

#v(8pt)

${sections.join('\n\n')}
`;
}
