// Classic single-column serif resume — traditional, conservative.
import { tex, hrefTex, dateRange, orderSections } from '../latex.js';

export const META = {
  name: 'Classic',
  description: 'Traditional serif resume — conservative and timeless.',
  author: 'Resumex',
  license: 'MIT',
  accent: '#111827',
};

export function renderClassic(r) {
  const contact = [
    r.contact?.email,
    r.contact?.phone,
    r.contact?.location,
    r.contact?.linkedin,
    r.contact?.github,
    r.contact?.website,
  ].filter(Boolean).map(tex).join(' \\textbullet{} ');

  const section = (title, body) =>
    body
      ? `\\section*{\\centering ${title}}\\vspace{-10pt}\\hrule\\vspace{8pt}\n${body}`
      : '';

  const summary = r.summary ? tex(r.summary) : '';

  const experience = (r.experience || []).map(x => `\\noindent{\\bfseries ${tex(x.company || '')}}\\hfill ${tex(x.location || '')}\\\\
{\\itshape ${tex(x.title || '')}}\\hfill {\\itshape ${dateRange(x.start, x.end)}}\\\\
${x.bullets?.length ? `\\begin{itemize}[leftmargin=*,itemsep=-2pt,topsep=2pt]\n${x.bullets.map(b => `  \\item ${tex(b)}`).join('\n')}\n\\end{itemize}` : ''}\\vspace{6pt}`).join('\n');

  const education = (r.education || []).map(e => `\\noindent{\\bfseries ${tex(e.school || '')}}\\hfill ${tex(e.location || '')}\\\\
{\\itshape ${tex(e.degree || '')}}\\hfill {\\itshape ${dateRange(e.start, e.end)}}${e.gpa ? `\\\\GPA: ${tex(e.gpa)}` : ''}${
    e.details?.length ? `\\\\[2pt]\\begin{itemize}[leftmargin=*,itemsep=-2pt,topsep=2pt]\n${e.details.map(d => `  \\item ${tex(d)}`).join('\n')}\n\\end{itemize}` : ''
  }\\vspace{6pt}`).join('\n');

  const projects = (r.projects || []).map(p => `\\noindent{\\bfseries ${tex(p.name || '')}}${p.link ? ` \\hfill ${hrefTex(p.link)}` : ''}${p.tech?.length ? `\\\\{\\itshape ${p.tech.map(tex).join(', ')}}` : ''}${p.description ? `\\\\${tex(p.description)}` : ''}${
    p.bullets?.length ? `\\\\[2pt]\\begin{itemize}[leftmargin=*,itemsep=-2pt,topsep=2pt]\n${p.bullets.map(b => `  \\item ${tex(b)}`).join('\n')}\n\\end{itemize}` : ''
  }\\vspace{6pt}`).join('\n');

  const skills = (r.skills || []).map(s =>
    `\\noindent{\\bfseries ${tex(s.category || 'Skills')}:} ${(s.items || []).map(tex).join(', ')}\\\\`
  ).join('\n');

  const certifications = (r.certifications || []).map(c =>
    `\\noindent{\\bfseries ${tex(c.name)}}, ${tex(c.issuer)} \\hfill ${tex(c.date)}\\\\`
  ).join('\n');

  const awards = (r.awards || []).map(a =>
    `\\noindent{\\bfseries ${tex(a.name)}}${a.issuer ? `, ${tex(a.issuer)}` : ''} \\hfill ${tex(a.date)}${a.description ? `\\\\${tex(a.description)}` : ''}\\\\`
  ).join('\n');

  const ordered = orderSections(
    {
      summary: section('Summary', summary),
      experience: section('Experience', experience),
      education: section('Education', education),
      projects: section('Projects', projects),
      skills: section('Skills', skills),
      certifications: section('Certifications', certifications),
      awards: section('Awards', awards),
    },
    ['summary', 'experience', 'education', 'projects', 'skills', 'certifications', 'awards'],
    r.sectionOrder,
  );

  return `\\documentclass[11pt,letterpaper]{article}
\\usepackage[margin=0.85in]{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage{hyperref}
\\usepackage{parskip}

\\hypersetup{colorlinks=false,pdfborder={0 0 0}}
\\pagestyle{empty}
\\setlength{\\parindent}{0pt}

\\begin{document}

\\begin{center}
{\\Huge\\bfseries ${tex(r.name || 'Your Name')}}\\\\[2pt]
${r.headline ? `{\\itshape ${tex(r.headline)}}\\\\[4pt]` : ''}
${contact}
\\end{center}

\\vspace{6pt}

${ordered.join('\n')}

\\end{document}
`;
}
