// Modern accent-color resume — single column, sans-serif, with a colored bar header.
import { tex, hrefTex, dateRange, orderSections } from '../latex.js';

export const META = {
  name: 'Modern',
  description: 'Sans-serif with a colored accent bar — friendly and contemporary.',
  author: 'Resumex',
  license: 'MIT',
  accent: '#2563eb',
};

export function renderModern(r) {
  const contactBits = [
    r.contact?.email && `\\href{mailto:${r.contact.email}}{${tex(r.contact.email)}}`,
    r.contact?.phone && tex(r.contact.phone),
    r.contact?.location && tex(r.contact.location),
    r.contact?.website && hrefTex(r.contact.website),
    r.contact?.linkedin && hrefTex(r.contact.linkedin),
    r.contact?.github && hrefTex(r.contact.github),
  ].filter(Boolean).join(' \\quad\\textcolor{accent}{\\textbullet}\\quad ');

  const sec = (title, body) => body
    ? `\\section*{\\color{accent}\\large ${title}}\\vspace{-6pt}\\hrule height 0.4pt\\vspace{6pt}\n${body}`
    : '';

  const summary = r.summary ? `\\noindent ${tex(r.summary)}` : '';

  const experience = (r.experience || []).map(x => `\\noindent\\textbf{${tex(x.title || '')}} \\hfill \\textcolor{gray}{${dateRange(x.start, x.end)}}\\\\
\\noindent\\textit{${tex(x.company || '')}}${x.location ? ` \\hfill \\textit{${tex(x.location)}}` : ''}\\\\[2pt]
${x.bullets?.length ? `\\begin{itemize}[leftmargin=*,itemsep=-1pt,topsep=0pt]\n${x.bullets.map(b => `  \\item ${tex(b)}`).join('\n')}\n\\end{itemize}` : ''}\\vspace{6pt}`).join('\n');

  const education = (r.education || []).map(e => `\\noindent\\textbf{${tex(e.school || '')}} \\hfill \\textcolor{gray}{${dateRange(e.start, e.end)}}\\\\
\\noindent\\textit{${tex(e.degree || '')}}${e.gpa ? ` \\hfill \\textit{GPA: ${tex(e.gpa)}}` : ''}${e.location ? `\\\\\n\\noindent ${tex(e.location)}` : ''}${
    e.details?.length ? `\\\\[2pt]\\begin{itemize}[leftmargin=*,itemsep=-1pt,topsep=0pt]\n${e.details.map(d => `  \\item ${tex(d)}`).join('\n')}\n\\end{itemize}` : ''
  }\\vspace{6pt}`).join('\n');

  const projects = (r.projects || []).map(p => {
    const head = `\\noindent\\textbf{${tex(p.name || '')}}${p.link ? ` \\hfill ${hrefTex(p.link)}` : ''}\\\\`;
    const tech = p.tech?.length ? `\\noindent\\textit{${p.tech.map(tex).join(' \\textbullet{} ')}}\\\\[2pt]` : '';
    const desc = p.description ? `\\noindent ${tex(p.description)}\\\\[2pt]` : '';
    const bullets = p.bullets?.length
      ? `\\begin{itemize}[leftmargin=*,itemsep=-1pt,topsep=0pt]\n${p.bullets.map(b => `  \\item ${tex(b)}`).join('\n')}\n\\end{itemize}`
      : '';
    return `${head}\n${tech}\n${desc}\n${bullets}\\vspace{6pt}`;
  }).join('\n');

  const skills = (r.skills || []).map(s =>
    `\\noindent\\textbf{${tex(s.category || 'Skills')}:} ${(s.items || []).map(tex).join(', ')}\\\\`
  ).join('\n');

  const certifications = (r.certifications || []).map(c =>
    `\\noindent\\textbf{${tex(c.name)}} \\textemdash{} ${tex(c.issuer)} \\hfill \\textcolor{gray}{${tex(c.date)}}\\\\`
  ).join('\n');

  const awards = (r.awards || []).map(a =>
    `\\noindent\\textbf{${tex(a.name)}}${a.issuer ? ` \\textemdash{} ${tex(a.issuer)}` : ''} \\hfill \\textcolor{gray}{${tex(a.date)}}${a.description ? `\\\\\n\\noindent ${tex(a.description)}` : ''}\\\\`
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

  return `\\documentclass[11pt,letterpaper]{article}
\\usepackage[margin=0.7in]{geometry}
\\usepackage[T1]{fontenc}
\\usepackage{lmodern}
\\usepackage{xcolor}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage{hyperref}
\\usepackage{parskip}

\\definecolor{accent}{HTML}{2563EB}
\\definecolor{gray}{HTML}{6B7280}

\\hypersetup{colorlinks=true,urlcolor=accent}
\\pagestyle{empty}
\\setlength{\\parindent}{0pt}

\\begin{document}

\\begin{flushleft}
{\\Huge\\bfseries\\color{accent} ${tex(r.name || 'Your Name')}}\\\\[2pt]
${r.headline ? `{\\large\\itshape ${tex(r.headline)}}\\\\[4pt]` : ''}
${contactBits}
\\end{flushleft}

\\vspace{6pt}
\\hrule height 1.2pt
\\vspace{10pt}

${ordered.join('\n')}

\\end{document}
`;
}
