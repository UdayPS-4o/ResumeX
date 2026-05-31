// Compact technical resume — tight spacing, sans-serif, single column,
// emphasizing density without sacrificing scannability.
import { tex, hrefTex, dateRange, orderSections } from '../latex.js';

export const META = {
  name: 'Compact',
  description: 'Dense single column — fits more on one page. Great for senior engineers.',
  author: 'Resumex',
  license: 'MIT',
  accent: '#7c3aed',
};

export function renderCompact(r) {
  const contactBits = [
    r.contact?.email && `\\href{mailto:${r.contact.email}}{${tex(r.contact.email)}}`,
    r.contact?.phone && tex(r.contact.phone),
    r.contact?.location && tex(r.contact.location),
    r.contact?.linkedin && hrefTex(r.contact.linkedin),
    r.contact?.github && hrefTex(r.contact.github),
    r.contact?.website && hrefTex(r.contact.website),
  ].filter(Boolean).join(' \\, $\\bullet$ \\, ');

  const sec = (title, body) =>
    body
      ? `\\section*{\\color{accent}\\normalsize\\bfseries\\uppercase{${title}}}\\vspace{-8pt}\\hrule height 0.3pt\\vspace{4pt}\n${body}`
      : '';

  const summary = r.summary ? `{\\small ${tex(r.summary)}}` : '';

  const experience = (r.experience || []).map(x => `{\\small\\textbf{${tex(x.title || '')}} \\textemdash{} ${tex(x.company || '')}${x.location ? `, ${tex(x.location)}` : ''} \\hfill \\textit{${dateRange(x.start, x.end)}}}\\\\
${x.bullets?.length ? `\\begin{itemize}[leftmargin=*,itemsep=-2pt,topsep=0pt,parsep=0pt]\n${x.bullets.map(b => `  \\item \\small ${tex(b)}`).join('\n')}\n\\end{itemize}` : ''}\\vspace{2pt}`).join('\n');

  const education = (r.education || []).map(e => `{\\small\\textbf{${tex(e.school || '')}}${e.location ? `, ${tex(e.location)}` : ''} \\hfill \\textit{${dateRange(e.start, e.end)}}}\\\\
{\\small\\textit{${tex(e.degree || '')}}${e.gpa ? ` \\textemdash{} GPA: ${tex(e.gpa)}` : ''}}${
    e.details?.length ? `\\\\\\begin{itemize}[leftmargin=*,itemsep=-2pt,topsep=0pt,parsep=0pt]\n${e.details.map(d => `  \\item \\small ${tex(d)}`).join('\n')}\n\\end{itemize}` : ''
  }\\vspace{2pt}`).join('\n');

  const projects = (r.projects || []).map(p => {
    const techLine = p.tech?.length ? ` \\textemdash{} \\textit{${p.tech.map(tex).join(', ')}}` : '';
    const linkLine = p.link ? ` \\hfill ${hrefTex(p.link)}` : '';
    return `{\\small\\textbf{${tex(p.name || '')}}${techLine}${linkLine}}\\\\${p.description ? `{\\small ${tex(p.description)}}` : ''}${
      p.bullets?.length ? `\\\\\\begin{itemize}[leftmargin=*,itemsep=-2pt,topsep=0pt,parsep=0pt]\n${p.bullets.map(b => `  \\item \\small ${tex(b)}`).join('\n')}\n\\end{itemize}` : ''
    }\\vspace{2pt}`;
  }).join('\n');

  const skills = (r.skills || []).map(s =>
    `{\\small\\textbf{${tex(s.category || 'Skills')}:} ${(s.items || []).map(tex).join(' \\textbullet{} ')}}\\\\`
  ).join('\n');

  const certifications = (r.certifications || []).map(c =>
    `{\\small\\textbf{${tex(c.name)}}, ${tex(c.issuer)} \\hfill \\textit{${tex(c.date)}}}\\\\`
  ).join('\n');

  const awards = (r.awards || []).map(a =>
    `{\\small\\textbf{${tex(a.name)}}${a.issuer ? `, ${tex(a.issuer)}` : ''} \\hfill \\textit{${tex(a.date)}}}${a.description ? `\\\\{\\small ${tex(a.description)}}` : ''}\\\\`
  ).join('\n');

  const ordered = orderSections(
    {
      summary: sec('Summary', summary),
      experience: sec('Experience', experience),
      projects: sec('Projects', projects),
      education: sec('Education', education),
      skills: sec('Skills', skills),
      certifications: sec('Certifications', certifications),
      awards: sec('Awards', awards),
    },
    ['summary', 'experience', 'projects', 'education', 'skills', 'certifications', 'awards'],
    r.sectionOrder,
  );

  return `\\documentclass[10pt,letterpaper]{article}
\\usepackage[margin=0.5in]{geometry}
\\usepackage[T1]{fontenc}
\\usepackage{lmodern}
\\usepackage{xcolor}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage{hyperref}
\\usepackage{parskip}

\\definecolor{accent}{HTML}{7C3AED}
\\hypersetup{colorlinks=true,urlcolor=accent}
\\pagestyle{empty}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{2pt}

\\begin{document}

\\begin{flushleft}
{\\LARGE\\bfseries\\color{accent} ${tex(r.name || 'Your Name')}}${r.headline ? ` \\textemdash{} {\\normalsize\\itshape ${tex(r.headline)}}` : ''}\\\\[2pt]
{\\small ${contactBits}}
\\end{flushleft}

\\vspace{4pt}\\hrule height 0.8pt\\vspace{6pt}

${ordered.join('\n')}

\\end{document}
`;
}
