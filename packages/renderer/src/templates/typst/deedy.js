// "Deedy" template — Two-column/sidebar layout.
// Left column (30% width) for Education, Skills, and Awards.
// Right column (70% width) for Summary, Experience, Projects, and Certifications.

import { sectionTitle, orderSections } from '../../typst.js';
import { typ, typMd, typLink, typDate, typPaper, typIcon } from '../../typst.js';

export const META = {
  name: 'Deedy',
  description: 'Two-column sidebar layout — modern, clean, and highly organized.',
  author: 'Resumex',
  license: 'MIT',
  accent: '#2b6cb0',
  defaultPageSize: 'a4',
  format: 'typst',
};

export function renderDeedy(r, opts = {}) {
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
    blocks.experience = `#sectionhead[${H('experience', 'Experience')}]\n${items.join('\n\n#v(6pt)\n\n')}`;
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
    blocks.education = `#sectionhead[${H('education', 'Education')}]\n${items.join('\n\n#v(4pt)\n\n')}`;
  }

  // SKILLS (Left sidebar)
  if (r.skills?.length) {
    const lines = r.skills
      .map((s) => {
        if (r.settings?.skillsAsBullets ?? false) {
          return `#strong[${typ(s.category || 'Skills')}] \\\n${(s.items || []).map(item => `- ${typ(item)}`).join('\n')}`;
        } else {
          return `#strong[${typ(s.category || 'Skills')}] \\\n${(s.items || []).map(typ).join(', ')}`;
        }
      })
      .join('\n\n');
    blocks.skills = `#sectionhead[${H('skills', 'Skills')}]\n${lines}`;
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
    blocks.awards = `#sectionhead[${H('awards', 'Awards')}]\n${items.join('\n\n#v(4pt)\n\n')}`;
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

  const leftColumnContent = leftSorted.map((k) => blocks[k]).join('\n\n#v(10pt)\n\n');
  const rightColumnContent = rightSorted.map((k) => blocks[k]).join('\n\n#v(10pt)\n\n');

  return `#set document(title: ${JSON.stringify(String(r.name || 'Resume'))})
#set page(paper: "${paper}", margin: (left: 0.5in, right: 0.5in, top: 0.5in, bottom: 0.5in))
#set text(font: ("Liberation Sans", "Arial", "Roboto"), size: 9.5pt, fill: rgb("#111827"))
#set par(leading: 0.5em, spacing: 0.6em, justify: false)

#let accent = rgb("${accentColor}")
#let icon-color = accent
#let ink = rgb("#111827")

#let sectionhead(title) = {
  v(8pt)
  text(fill: accent, weight: "bold", size: 1.1em)[#upper(title)]
  v(3pt)
}

// Bold left, plain right (used for the primary entry head line).
#let entryhead(lhs, rhs) = grid(columns: (1fr, auto), align: (left, right), [#strong[#lhs]], [#rhs])
// Italic left, italic right (used for the secondary entry line).
#let entrysub(lhs, rhs) = grid(columns: (1fr, auto), align: (left, right), [#emph[#lhs]], [#emph[#rhs]])
#set list(indent: 0.5em, spacing: 0.35em, marker: text(fill: accent)[•])

#align(center)[
  #text(size: 26pt, weight: "bold", fill: ink)[${typ(r.name || 'Your Name')}]
  ${r.headline ? `\n  #v(2pt)\n  #text(style: "italic", size: 11pt, fill: accent)[${typ(r.headline)}]` : ''}
  #v(4pt)
  #text(size: 0.95em, fill: rgb("#4b5563"))[${contact}]
]

#v(10pt)

#grid(
  columns: (1fr, 2.2fr),
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
