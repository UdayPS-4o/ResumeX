// Jake Gutierrez resume — the popular GitHub template, MIT-licensed.
// https://github.com/jakegut/resume
import { tex, hrefTex, dateRange, orderSections } from '../latex.js';

export const META = {
  name: 'Jake',
  description: 'Clean single-column layout — the most popular GitHub resume template.',
  author: 'Jake Gutierrez',
  license: 'MIT',
  accent: '#1f2937',
};

export function renderJake(r) {
  const contactLine = [
    r.contact?.phone && tex(r.contact.phone),
    r.contact?.email && `\\href{mailto:${r.contact.email}}{\\underline{${tex(r.contact.email)}}}`,
    r.contact?.linkedin && hrefTexUnderlined(r.contact.linkedin),
    r.contact?.github && hrefTexUnderlined(r.contact.github),
    r.contact?.website && hrefTexUnderlined(r.contact.website),
  ].filter(Boolean).join(' $|$ ');

  const blocks = {};

  if (r.summary) {
    blocks.summary = `\\section{Summary}\n${tex(r.summary)}`;
  }

  if (r.education?.length) {
    blocks.education = `\\section{Education}
  \\resumeSubHeadingListStart
${r.education.map(eduItem).join('\n')}
  \\resumeSubHeadingListEnd`;
  }

  if (r.experience?.length) {
    blocks.experience = `\\section{Experience}
  \\resumeSubHeadingListStart
${r.experience.map(expItem).join('\n')}
  \\resumeSubHeadingListEnd`;
  }

  if (r.projects?.length) {
    blocks.projects = `\\section{Projects}
  \\resumeSubHeadingListStart
${r.projects.map(projItem).join('\n')}
  \\resumeSubHeadingListEnd`;
  }

  if (r.skills?.length) {
    blocks.skills = `\\section{Technical Skills}
\\begin{itemize}[leftmargin=0.15in, label={}]
  \\small{\\item{
${r.skills.map(s => `    \\textbf{${tex(s.category || 'Skills')}}{: ${(s.items || []).map(tex).join(', ')}} \\\\`).join('\n')}
  }}
\\end{itemize}`;
  }

  if (r.certifications?.length) {
    blocks.certifications = `\\section{Certifications}
  \\resumeSubHeadingListStart
${r.certifications.map(c => `    \\resumeProjectHeading
      {\\textbf{${tex(c.name)}} $|$ \\emph{${tex(c.issuer)}}}{${tex(c.date)}}`).join('\n')}
  \\resumeSubHeadingListEnd`;
  }

  if (r.awards?.length) {
    blocks.awards = `\\section{Awards}
  \\resumeSubHeadingListStart
${r.awards.map(a => `    \\resumeProjectHeading
      {\\textbf{${tex(a.name)}} $|$ \\emph{${tex(a.issuer)}}}{${tex(a.date)}}
${a.description ? `      \\resumeItemListStart\n        \\resumeItem{${tex(a.description)}}\n      \\resumeItemListEnd` : ''}`).join('\n')}
  \\resumeSubHeadingListEnd`;
  }

  const sections = orderSections(
    blocks,
    ['summary', 'education', 'experience', 'projects', 'skills', 'certifications', 'awards'],
    r.sectionOrder,
  );

  return `\\documentclass[letterpaper,11pt]{article}

\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage[english]{babel}
\\usepackage{tabularx}
\\input{glyphtounicode}

\\pagestyle{fancy}
\\fancyhf{}
\\fancyfoot{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

\\addtolength{\\oddsidemargin}{-0.5in}
\\addtolength{\\evensidemargin}{-0.5in}
\\addtolength{\\textwidth}{1in}
\\addtolength{\\topmargin}{-.5in}
\\addtolength{\\textheight}{1.0in}

\\urlstyle{same}
\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}

\\titleformat{\\section}{
  \\vspace{-4pt}\\scshape\\raggedright\\large
}{}{0em}{}[\\color{black}\\titlerule \\vspace{-5pt}]

\\pdfgentounicode=1

\\newcommand{\\resumeItem}[1]{%
  \\item\\small{
    {#1 \\vspace{-2pt}}
  }
}

\\newcommand{\\resumeSubheading}[4]{%
  \\vspace{-2pt}\\item
    \\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\textbf{#1} & #2 \\\\
      \\textit{\\small#3} & \\textit{\\small #4} \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeSubSubheading}[2]{%
    \\item
    \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}
      \\textit{\\small#1} & \\textit{\\small #2} \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeProjectHeading}[2]{%
    \\item
    \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}
      \\small#1 & #2 \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeSubItem}[1]{\\resumeItem{#1}\\vspace{-4pt}}

\\renewcommand\\labelitemii{$\\vcenter{\\hbox{\\tiny$\\bullet$}}$}

\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.15in, label={}]}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-5pt}}

\\begin{document}

\\begin{center}
    \\textbf{\\Huge \\scshape ${tex(r.name || 'Your Name')}} \\\\ \\vspace{1pt}
    ${r.headline ? `\\textit{${tex(r.headline)}} \\\\ \\vspace{1pt}\n    ` : ''}\\small ${contactLine || ''}${r.contact?.location ? ` $|$ ${tex(r.contact.location)}` : ''}
\\end{center}

${sections.join('\n\n')}

\\end{document}
`;
}

function eduItem(e) {
  return `    \\resumeSubheading
      {${tex(e.school || '')}}{${tex(e.location || '')}}
      {${tex(e.degree || '')}${e.gpa ? ` \\textemdash{} GPA: ${tex(e.gpa)}` : ''}}{${dateRange(e.start, e.end)}}${
    e.details?.length
      ? `\n      \\resumeItemListStart\n${e.details.map(d => `        \\resumeItem{${tex(d)}}`).join('\n')}\n      \\resumeItemListEnd`
      : ''
  }`;
}

function expItem(x) {
  return `    \\resumeSubheading
      {${tex(x.title || '')}}{${dateRange(x.start, x.end)}}
      {${tex(x.company || '')}}{${tex(x.location || '')}}${
    x.bullets?.length
      ? `\n      \\resumeItemListStart\n${x.bullets.map(b => `        \\resumeItem{${tex(b)}}`).join('\n')}\n      \\resumeItemListEnd`
      : ''
  }`;
}

function projItem(p) {
  const techLine = p.tech?.length ? ` $|$ \\emph{${p.tech.map(tex).join(', ')}}` : '';
  const linkLine = p.link ? ` $|$ ${hrefTexUnderlined(p.link)}` : '';
  return `    \\resumeProjectHeading
      {\\textbf{${tex(p.name || '')}}${techLine}${linkLine}}{}${
    p.description
      ? `\n      \\resumeItemListStart\n        \\resumeItem{${tex(p.description)}}${
          (p.bullets || []).map(b => `\n        \\resumeItem{${tex(b)}}`).join('')
        }\n      \\resumeItemListEnd`
      : p.bullets?.length
        ? `\n      \\resumeItemListStart\n${p.bullets.map(b => `        \\resumeItem{${tex(b)}}`).join('\n')}\n      \\resumeItemListEnd`
        : ''
  }`;
}

function hrefTexUnderlined(url) {
  const display = url.replace(/^https?:\/\//, '');
  return `\\href{${url}}{\\underline{${tex(display)}}}`;
}
