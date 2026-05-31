// Modern accent-color resume — single column, sans-serif, with a colored bar header.
import { tex, mdTex, hrefTex, dateRange, orderSections } from '../services/latex.js';

export const META = {
  name: 'Modern',
  description: 'Sans-serif with a colored accent bar — friendly and contemporary.',
  author: 'Resumex',
  license: 'MIT',
  accent: '#2563eb',
};

export function renderModern(r, opts = {}) {
  const paper =
    opts.pageSize === 'a4' ? 'a4paper'
    : opts.pageSize === 'legal' ? 'legalpaper'
    : 'letterpaper';
  const contactBits = [
    r.contact?.email && `\\href{mailto:${r.contact.email}}{${tex(r.contact.email)}}`,
    r.contact?.phone && tex(r.contact.phone),
    r.contact?.location && tex(r.contact.location),
    r.contact?.website && hrefTex(r.contact.website),
    r.contact?.linkedin && hrefTex(r.contact.linkedin),
    r.contact?.github && hrefTex(r.contact.github),
  ].filter(Boolean).join('\\nobreak\\hspace{0.8em}\\textcolor{accent}{\\textbullet}\\hspace{0.8em}');

  const sec = (title, body) => body
    ? `\\section*{\\color{accent}\\large ${title}}\\vspace{-6pt}\\hrule height 0.4pt\\vspace{6pt}\n${body}`
    : '';

  const summary = r.summary ? `\\noindent ${mdTex(r.summary)}` : '';

  // A bullet list that attaches cleanly to the line directly above it. It is
  // never preceded by a manual "\\" — a "\\" right before \begin{itemize} injects
  // an empty line, leaving a big gap above the list (the misalignment bug). The
  // gap is controlled by the list's topsep instead.
  const bulletList = (arr) => arr?.length
    ? `\n\\begin{itemize}[leftmargin=*,itemsep=-1pt,topsep=3pt]\n${arr.map(b => `  \\item ${mdTex(b)}`).join('\n')}\n\\end{itemize}`
    : '';

  const experience = (r.experience || []).map(x => {
    const head = `\\noindent\\textbf{${tex(x.title || '')}} \\hfill \\textcolor{gray}{${dateRange(x.start, x.end)}}\\\\
\\noindent\\textit{${tex(x.company || '')}}${x.location ? ` \\hfill \\textit{${tex(x.location)}}` : ''}`;
    return `${head}${bulletList(x.bullets)}\n\\par\\vspace{6pt}`;
  }).join('\n');

  const education = (r.education || []).map(e => {
    const lines = [`\\noindent\\textbf{${tex(e.school || '')}} \\hfill \\textcolor{gray}{${dateRange(e.start, e.end)}}`];
    lines.push(`\\noindent\\textit{${tex(e.degree || '')}}${e.gpa ? ` \\hfill \\textit{GPA: ${tex(e.gpa)}}` : ''}`);
    if (e.location) lines.push(`\\noindent ${tex(e.location)}`);
    return `${lines.join('\\\\\n')}${bulletList(e.details)}\n\\par\\vspace{6pt}`;
  }).join('\n');

  const projects = (r.projects || []).map(p => {
    const date = dateRange(p.start, p.end);
    const lines = [`\\noindent\\textbf{${tex(p.name || '')}}${date ? ` \\hfill \\textcolor{gray}{${date}}` : ''}`];
    const techStr = p.tech?.length ? `\\textit{${p.tech.map(tex).join(' \\textbullet{} ')}}` : '';
    const linkStr = p.link ? hrefTex(p.link) : '';
    if (techStr || linkStr) lines.push(`\\noindent ${techStr}${techStr && linkStr ? ' \\hfill ' : ''}${linkStr}`);
    if (p.description) lines.push(`\\noindent ${mdTex(p.description)}`);
    return `${lines.join('\\\\\n')}${bulletList(p.bullets)}\n\\par\\vspace{6pt}`;
  }).join('\n');

  const skills = (r.skills || []).map(s =>
    `\\noindent\\textbf{${tex(s.category || 'Skills')}:} ${(s.items || []).map(tex).join(', ')}\\\\`
  ).join('\n');

  const certifications = (r.certifications || []).map(c =>
    `\\noindent\\textbf{${tex(c.name)}} \\textemdash{} ${tex(c.issuer)} \\hfill \\textcolor{gray}{${tex(c.date)}}\\\\`
  ).join('\n');

  const awards = (r.awards || []).map(a =>
    `\\noindent\\textbf{${tex(a.name)}}${a.issuer ? ` \\textemdash{} ${tex(a.issuer)}` : ''} \\hfill \\textcolor{gray}{${tex(a.date)}}${a.description ? `\\\\\n\\noindent ${mdTex(a.description)}` : ''}\\\\`
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

  return `\\documentclass[11pt]{article}
\\usepackage[${paper},margin=0.7in]{geometry}
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
