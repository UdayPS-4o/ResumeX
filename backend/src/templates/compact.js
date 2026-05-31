// Compact technical resume — tight spacing, sans-serif, single column,
// emphasizing density without sacrificing scannability.
import { tex, hrefTex, dateRange, orderSections, mdTex, sectionTitle } from '../services/latex.js';

export const META = {
  name: 'Compact',
  description: 'Dense single column — fits more on one page. Great for senior engineers.',
  author: 'Resumex',
  license: 'MIT',
  accent: '#7c3aed',
};

export function renderCompact(r, opts = {}) {
  const paper =
    opts.pageSize === 'a4' ? 'a4paper'
    : opts.pageSize === 'legal' ? 'legalpaper'
    : 'letterpaper';
  const contactBits = [
    r.contact?.email && `\\href{mailto:${r.contact.email}}{${tex(r.contact.email)}}`,
    r.contact?.phone && tex(r.contact.phone),
    r.contact?.location && tex(r.contact.location),
    r.contact?.linkedin && hrefTex(r.contact.linkedin),
    r.contact?.github && hrefTex(r.contact.github),
    r.contact?.website && hrefTex(r.contact.website),
  ].filter(Boolean).join(' \\, $\\bullet$ \\, ');

  // Header: name and headline share one line when they fit, but if that would
  // overrun the text block the headline drops to its own second line. The width
  // is measured at compile time with \\settowidth, so it adapts to any name /
  // headline length and page size (no fixed character cutoff to guess at).
  const nameTex = tex(r.name || 'Your Name');
  const headlineTex = r.headline ? tex(r.headline) : '';
  const header = headlineTex
    ? `\\settowidth{\\rxhdrw}{{\\LARGE\\bfseries ${nameTex}} \\textemdash{} {\\large\\bfseries ${headlineTex}}}%
\\ifdim\\rxhdrw>\\dimexpr\\textwidth-1em\\relax
{\\LARGE\\bfseries\\color{accent} ${nameTex}}\\\\[5pt]{\\large\\bfseries ${headlineTex}}%
\\else
{\\LARGE\\bfseries\\color{accent} ${nameTex}} \\textemdash{} {\\large\\bfseries ${headlineTex}}%
\\fi
\\\\[5pt]
{\\small ${contactBits}}`
    : `{\\LARGE\\bfseries\\color{accent} ${nameTex}}\\\\[5pt]
{\\small ${contactBits}}`;

  const sec = (title, body) =>
    body
      ? `\\section*{\\color{accent}\\normalsize\\bfseries\\uppercase{${title}}}\\vspace{-8pt}\\hrule height 0.3pt\\vspace{4pt}\n${body}`
      : '';

  const summary = r.summary ? `{\\small ${mdTex(r.summary)}}` : '';

  // A bullet list that attaches directly to the line above it (no preceding
  // "\\", which would inject an empty line and a big gap before the list).
  const bulletList = (arr) => arr?.length
    ? `\n\\begin{itemize}[leftmargin=*,itemsep=-2pt,topsep=2pt,parsep=0pt]\n${arr.map(b => `  \\item \\small ${mdTex(b)}`).join('\n')}\n\\end{itemize}`
    : '';

  const experience = (r.experience || []).map(x => {
    const head = `{\\small\\textbf{${tex(x.title || '')}} \\textemdash{} ${tex(x.company || '')}${x.location ? `, ${tex(x.location)}` : ''} \\hfill \\textit{${dateRange(x.start, x.end)}}}`;
    return `${head}${bulletList(x.bullets)}\n\\par\\vspace{2pt}`;
  }).join('\n');

  const education = (r.education || []).map(e => {
    const lines = [`{\\small\\textbf{${tex(e.school || '')}}${e.location ? `, ${tex(e.location)}` : ''} \\hfill \\textit{${dateRange(e.start, e.end)}}}`];
    lines.push(`{\\small\\textit{${tex(e.degree || '')}}${e.gpa ? ` \\textemdash{} GPA: ${tex(e.gpa)}` : ''}}`);
    return `${lines.join('\\\\\n')}${bulletList(e.details)}\n\\par\\vspace{2pt}`;
  }).join('\n');

  const projects = (r.projects || []).map(p => {
    const date = dateRange(p.start, p.end);
    const techLine = p.tech?.length ? ` \\textemdash{} \\textit{${p.tech.map(tex).join(', ')}}` : '';
    const right = date ? ` \\hfill \\textit{${date}}` : (p.link ? ` \\hfill ${hrefTex(p.link)}` : '');
    const lines = [`{\\small\\textbf{${tex(p.name || '')}}${techLine}${right}}`];
    if (date && p.link) lines.push(`{\\small ${hrefTex(p.link)}}`);
    if (p.description) lines.push(`{\\small ${mdTex(p.description)}}`);
    return `${lines.join('\\\\\n')}${bulletList(p.bullets)}\n\\par\\vspace{2pt}`;
  }).join('\n');

  const skills = (r.skills || []).map(s =>
    `{\\small\\textbf{${tex(s.category || 'Skills')}:} ${(s.items || []).map(tex).join(' \\textbullet{} ')}}\\\\`
  ).join('\n');

  const certifications = (r.certifications || []).map(c =>
    `{\\small\\textbf{${tex(c.name)}}, ${tex(c.issuer)} \\hfill \\textit{${tex(c.date)}}}\\\\`
  ).join('\n');

  const awards = (r.awards || []).map(a =>
    `{\\small\\textbf{${tex(a.name)}}${a.issuer ? `, ${tex(a.issuer)}` : ''} \\hfill \\textit{${tex(a.date)}}}${a.description ? `\\\\{\\small ${mdTex(a.description)}}` : ''}\\\\`
  ).join('\n');

  // Section heading helper: user override → generic default. Escaped for LaTeX.
  const H = (key, fallback) => tex(sectionTitle(r, key, fallback));
  const ordered = orderSections(
    {
      summary: sec(H('summary', 'Summary'), summary),
      experience: sec(H('experience', 'Experience'), experience),
      projects: sec(H('projects', 'Projects'), projects),
      education: sec(H('education', 'Education'), education),
      skills: sec(H('skills', 'Skills'), skills),
      certifications: sec(H('certifications', 'Certifications'), certifications),
      awards: sec(H('awards', 'Awards'), awards),
    },
    ['summary', 'experience', 'projects', 'education', 'skills', 'certifications', 'awards'],
    r.sectionOrder,
  );

  return `\\documentclass[10pt]{article}
\\usepackage[${paper},margin=0.5in]{geometry}
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
\\newlength{\\rxhdrw}

\\begin{document}

\\begin{flushleft}
${header}
\\end{flushleft}

\\vspace{6pt}\\hrule height 0.8pt\\vspace{8pt}

${ordered.join('\n')}

\\end{document}
`;
}
