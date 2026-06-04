// Classic single-column serif resume — traditional, conservative.
import { tex, hrefTex, dateRange, orderSections, mdTex, sectionTitle } from '../latex.js';

export const META = {
  name: 'Classic',
  description: 'Traditional serif resume — conservative and timeless.',
  author: 'Resumex',
  license: 'MIT',
  accent: '#111827',
};

export function renderClassic(r, opts = {}) {
  const paper =
    opts.pageSize === 'a4' ? 'a4paper'
    : opts.pageSize === 'legal' ? 'legalpaper'
    : 'letterpaper';
  const contact = [
    r.contact?.email,
    r.contact?.phone,
    r.contact?.location,
    r.contact?.linkedin,
    r.contact?.github,
    r.contact?.website,
  ].filter(Boolean).map(tex).join('~\\textbullet{} ');

  // Centered title sitting cleanly ABOVE a full-width rule. (The old version
  // pulled the \hrule up by -10pt, which slammed it through the title text.)
  const section = (title, body) =>
    body
      ? `\\vspace{12pt}{\\centering\\large\\bfseries ${title}\\par}\\vspace{4pt}\\hrule\\vspace{8pt}\n${body}`
      : '';

  // A bullet list that attaches directly to the line above it (no preceding
  // "\\", which would inject an empty line and a big gap before the list).
  const bulletList = (arr) => arr?.length
    ? `\n\\begin{itemize}[leftmargin=*,itemsep=-2pt,topsep=3pt]\n${arr.map(b => `  \\item ${mdTex(b)}`).join('\n')}\n\\end{itemize}`
    : '';

  const summary = r.summary ? mdTex(r.summary) : '';

  const experience = (r.experience || []).map(x => {
    const head = `\\noindent{\\bfseries ${tex(x.company || '')}}\\hfill ${tex(x.location || '')}\\\\
{\\itshape ${tex(x.title || '')}}\\hfill {\\itshape ${dateRange(x.start, x.end)}}`;
    return `${head}${bulletList(x.bullets)}\n\\par\\vspace{6pt}`;
  }).join('\n');

  const education = (r.education || []).map(e => {
    const lines = [`\\noindent{\\bfseries ${tex(e.school || '')}}\\hfill ${tex(e.location || '')}`];
    lines.push(`{\\itshape ${tex(e.degree || '')}}\\hfill {\\itshape ${dateRange(e.start, e.end)}}${e.gpa ? `\\\\GPA: ${tex(e.gpa)}` : ''}`);
    return `${lines.join('\\\\\n')}${bulletList(e.details)}\n\\par\\vspace{6pt}`;
  }).join('\n');

  const projects = (r.projects || []).map(p => {
    const date = dateRange(p.start, p.end);
    const lines = [`\\noindent{\\bfseries ${tex(p.name || '')}}${date ? ` \\hfill {\\itshape ${date}}` : ''}`];
    const techStr = p.tech?.length ? `{\\itshape ${p.tech.map(tex).join(', ')}}` : '';
    const linkStr = p.link ? hrefTex(p.link) : '';
    if (techStr || linkStr) lines.push(`${techStr}${techStr && linkStr ? ' \\hfill ' : ''}${linkStr}`);
    if (p.description) lines.push(mdTex(p.description));
    return `${lines.join('\\\\\n')}${bulletList(p.bullets)}\n\\par\\vspace{6pt}`;
  }).join('\n');

  const skills = (r.skills || []).map(s =>
    `\\noindent{\\bfseries ${tex(s.category || 'Skills')}:} ${(s.items || []).map(tex).join(', ')}\\\\`
  ).join('\n');

  const certifications = (r.certifications || []).map(c =>
    `\\noindent{\\bfseries ${tex(c.name)}}, ${tex(c.issuer)} \\hfill ${tex(c.date)}\\\\`
  ).join('\n');

  const awards = (r.awards || []).map(a =>
    `\\noindent{\\bfseries ${tex(a.name)}}${a.issuer ? `, ${tex(a.issuer)}` : ''} \\hfill ${tex(a.date)}${a.description ? `\\\\${mdTex(a.description)}` : ''}\\\\`
  ).join('\n');

  // Section heading helper: user override → generic default. Escaped for LaTeX.
  const H = (key, fallback) => tex(sectionTitle(r, key, fallback));
  const ordered = orderSections(
    {
      summary: section(H('summary', 'Summary'), summary),
      experience: section(H('experience', 'Experience'), experience),
      education: section(H('education', 'Education'), education),
      projects: section(H('projects', 'Projects'), projects),
      skills: section(H('skills', 'Skills'), skills),
      certifications: section(H('certifications', 'Certifications'), certifications),
      awards: section(H('awards', 'Awards'), awards),
    },
    ['summary', 'experience', 'education', 'projects', 'skills', 'certifications', 'awards'],
    r.sectionOrder,
  );

  return `\\documentclass[11pt]{article}
\\usepackage[${paper},margin=0.85in]{geometry}
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
