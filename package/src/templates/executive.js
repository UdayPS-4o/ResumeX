// Executive — branded template.
// Design: large blue name, bold rule-separated sections, helvet sans-serif.
// Supports legal / a4 / letter page sizes.

import { tex, hrefTex, orderSections } from '../latex.js';

export const META = {
  name: 'Executive',
  description: 'Branded — big colored name, bold rule-separated sections.',
  author: 'resume-latex-renderer',
  license: 'MIT',
  accent: '#1a56db',
  defaultPageSize: 'legal',
};

// ── helpers ─────────────────────────────────────────────────────────────────

// tex() + convert unicode dashes to LaTeX ligatures, and render literal "|"
// deterministically (a bare "|" renders inconsistently across font encodings).
function ts(text) {
  if (!text) return '';
  return tex(text)
    .replace(/—/g, '---')
    .replace(/–/g, '--')
    .replace(/\|/g, '\\textbar{}');
}

// Convert **bold** markers to \textbf{}, pass rest through ts().
function md(text) {
  if (!text) return '';
  const parts = text.split(/\*\*([^*]+)\*\*/g);
  return parts.map((p, i) => (i % 2 === 0 ? ts(p) : `\\textbf{${ts(p)}}`)).join('');
}

// "Jan 2023" + "Feb 2025" → "Jan 2023 --- Feb 2025"
function dr(start, end) {
  if (!start && !end) return '';
  if (start && end) return `${ts(start)} --- ${ts(end)}`;
  return ts(start || end);
}

// ── renderer ────────────────────────────────────────────────────────────────

export function renderExecutive(r, opts = {}) {
  const pageSize = opts.pageSize || 'legal';
  const geom =
    pageSize === 'a4' ? 'a4paper'
    : pageSize === 'letter' ? 'letterpaper'
    : 'legalpaper';

  const c = r.contact || {};
  const contact = [
    c.location && ts(c.location),
    c.phone && ts(c.phone),
    c.email && `\\href{mailto:${c.email}}{${ts(c.email)}}`,
    c.linkedin && hrefTex(c.linkedin),
    c.github && hrefTex(c.github),
    c.website && hrefTex(c.website),
  ].filter(Boolean).join(' $|$ ');

  const blocks = {};

  // PROFILE
  if (r.summary?.trim()) {
    blocks.summary = `\\sectionhead{Profile}\n${md(r.summary)}`;
  }

  // WORK EXPERIENCE
  if (r.experience?.length) {
    const items = r.experience.map(x => {
      const parts = [];
      const titleCo = [x.title && ts(x.title), x.company && ts(x.company)].filter(Boolean).join(', ');
      parts.push(`\\entryhead{${titleCo}}{${dr(x.start, x.end)}}`);
      if (x.location) {
        // Only force a line break after the location when an intro line follows.
        // If bullets come next, a trailing \\ would insert a blank line above the
        // list (\begin{itemize} already starts its own line), leaving a big gap.
        const tail = x.description?.trim() ? '\\\\[2pt]' : '';
        parts.push(`{\\small\\color{subtext}${ts(x.location)}}${tail}`);
      }
      // Optional non-bulleted intro sentence (seed data uses this)
      if (x.description?.trim()) parts.push(`${md(x.description)}`);
      if (x.bullets?.length) {
        const topsep = x.description?.trim() ? '2pt' : '3pt';
        parts.push(`\\begin{itemize}[leftmargin=1.3em,itemsep=-2pt,topsep=${topsep},parsep=0pt]`);
        for (const b of x.bullets) parts.push(`  \\item ${md(b)}`);
        parts.push('\\end{itemize}');
      }
      return parts.join('\n');
    });
    blocks.experience = `\\sectionhead{Work Experience}\n${items.join('\n\\vspace{5pt}\n')}`;
  }

  // PROJECTS — projects rendered as paragraphs (not bullet lists)
  if (r.projects?.length) {
    const items = r.projects.map(p => {
      const parts = [];
      // Projects can have start+end range or just end (single date)
      const projDate = (p.start && p.end) ? dr(p.start, p.end)
        : (p.end || p.start) ? ts(p.end || p.start) : '';
      parts.push(`\\entryhead{${md(p.name)}}{${projDate}}`);
      if (p.description?.trim()) parts.push(md(p.description));
      if (p.bullets?.length) {
        // Render as flowing paragraph, not a list
        parts.push(p.bullets.map(md).join(' '));
      }
      return parts.join('\n');
    });
    // Blank line (\par) between entries — a bare \vspace does NOT end a paragraph,
    // so without it each entry head would flow into the previous project's text.
    blocks.projects = `\\sectionhead{Projects}\n${items.join('\n\n\\vspace{4pt}\n')}`;
  }

  // SKILLS
  if (r.skills?.length) {
    const lines = r.skills.map(s =>
      `\\textbf{${ts(s.category)}:} ${(s.items || []).map(ts).join(', ')}`
    ).join('\\\\[1pt]\n');
    blocks.skills = `\\sectionhead{Skills}\n${lines}`;
  }

  // EDUCATION
  if (r.education?.length) {
    const items = r.education.map(e => {
      const schoolLoc = [e.school && ts(e.school), e.location && ts(e.location)].filter(Boolean).join(', ');
      // \entryhead already ends with \\, so sub-lines flow directly beneath it.
      const sub = [];
      if (e.degree) sub.push(ts(e.degree));
      if (e.gpa) sub.push(`GPA: ${ts(e.gpa)}`);
      let block = `\\entryhead{${schoolLoc}}{${dr(e.start, e.end)}}${sub.join('\\\\\n')}`;
      if (e.details?.length) {
        block += '\n\\begin{itemize}[leftmargin=1.3em,itemsep=-2pt,topsep=2pt,parsep=0pt]';
        for (const d of e.details) block += `\n  \\item ${md(d)}`;
        block += '\n\\end{itemize}';
      }
      return block;
    });
    blocks.education = `\\sectionhead{Education}\n${items.join('\n\\vspace{5pt}\n')}`;
  }

  // CERTIFICATIONS
  if (r.certifications?.length) {
    const items = r.certifications.map(c2 =>
      `\\entryhead{${ts(c2.name)}}{${ts(c2.date)}}\n${ts(c2.issuer)}`
    );
    blocks.certifications = `\\sectionhead{Certifications}\n${items.join('\n\\vspace{4pt}\n')}`;
  }

  // AWARDS
  if (r.awards?.length) {
    const items = r.awards.map(a => {
      let block = `\\entryhead{${md(a.name)}}{${ts(a.date)}}`;
      if (a.issuer) block += `\n${ts(a.issuer)}`;
      if (a.description?.trim()) block += `\n${md(a.description)}`;
      return block;
    });
    blocks.awards = `\\sectionhead{Awards}\n${items.join('\n\\vspace{4pt}\n')}`;
  }

  const sections = orderSections(
    blocks,
    ['summary', 'experience', 'projects', 'skills', 'education', 'certifications', 'awards'],
    r.sectionOrder,
  );

  return `\\documentclass[10pt]{article}
\\usepackage[${geom},left=0.65in,right=0.65in,top=0.55in,bottom=0.55in]{geometry}
\\usepackage[T1]{fontenc}
\\usepackage[utf8]{inputenc}
\\usepackage{helvet}
\\renewcommand{\\familydefault}{\\sfdefault}
\\usepackage[usenames,dvipsnames]{xcolor}
\\definecolor{accent}{HTML}{1a56db}
\\definecolor{subtext}{HTML}{374151}
\\usepackage[hidelinks,colorlinks=true,urlcolor=accent]{hyperref}
\\usepackage{enumitem}
\\usepackage{microtype}
\\pagestyle{empty}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{3.5pt}

% One shared blue rule so every divider is identical.
\\newcommand{\\bluerule}{\\noindent{\\color{accent}\\rule{\\linewidth}{0.6pt}}}

% Blue section header with a blue rule underneath (even spacing above & below).
\\newcommand{\\sectionhead}[1]{%
  \\vspace{8pt}%
  \\noindent{\\color{accent}\\textbf{\\large\\MakeUppercase{#1}}}%
  \\\\[-5pt]%
  \\bluerule%
  \\vspace{6pt}%
}

% Bold title left, date right, forced newline
\\newcommand{\\entryhead}[2]{%
  \\noindent\\textbf{#1}\\hfill #2\\\\%
}

\\begin{document}

{\\fontsize{28}{32}\\selectfont\\color{accent}\\textbf{${ts(r.name || 'YOUR NAME')}}}

\\vspace{5pt}
{\\fontsize{14}{18}\\selectfont\\bfseries ${ts(r.headline || '')}}

\\vspace{4pt}
{\\small ${contact}}

\\vspace{6pt}
\\bluerule

${sections.join('\n\n')}

\\end{document}
`;
}

// ── Seeded resume data ───────────────────────────────────────────────────────
// A generic fictional sample, bundled so consumers can preview/auto-fill the
// template. Replace with your own data as needed.

export const SEED_RESUME = {
  name: 'JORDAN ELLIS',
  headline: 'FULL STACK | CLOUD | DISTRIBUTED SYSTEMS',
  contact: {
    email: 'jordan.ellis@example.com',
    phone: '+1 (555) 0142',
    location: 'San Francisco, CA',
    website: '',
    linkedin: '',
    github: '',
  },
  summary:
    'Full-stack engineer focused on shipping production features and building reliable ' +
    'backend systems. Comfortable across the stack, from API design and data modeling to ' +
    'frontend delivery and cloud deployment. I enjoy untangling complex systems and turning ' +
    'them into clean, scalable solutions.',
  experience: [
    {
      company: 'Northwind Labs',
      title: 'Senior Software Engineer',
      location: 'San Francisco, CA',
      start: 'Jan 2023',
      end: 'Present',
      description: 'Lead engineer on the core platform team building a multi-tenant analytics product.',
      bullets: [
        'Owned the end-to-end architecture of the ingestion pipeline, scaling it to **2B events/day**.',
        'Cut p95 query latency by **40%** by redesigning the aggregation layer and adding caching.',
      ],
    },
    {
      company: 'Brightwave',
      title: 'Software Engineer',
      location: 'Remote',
      start: 'Jun 2020',
      end: 'Dec 2022',
      description: 'Delivered features across a **React** web app and **Node.js** services.',
      bullets: [
        'Shipped a real-time collaboration feature used by **10k+ daily active users**.',
        'Introduced an automated test suite that reduced production regressions by **60%**.',
      ],
    },
  ],
  projects: [
    {
      name: 'OpenLedger — open-source budgeting tool',
      start: '',
      end: '2024',
      description: '',
      tech: [],
      link: '',
      bullets: [
        'Built a self-hostable personal-finance app with **double-entry accounting**, CSV import, ' +
        'and a plugin system. 1.5k+ GitHub stars and an active contributor community.',
      ],
    },
    {
      name: 'TinyQueue — minimal job queue',
      start: '',
      end: '2022',
      description: '',
      tech: [],
      link: '',
      bullets: [
        'A dependency-light job queue for Node backed by Redis, with retries, backoff, and a ' +
        'small dashboard. Published to npm with **50k+ monthly downloads**.',
      ],
    },
  ],
  skills: [
    { category: 'Frontend', items: ['React', 'Next.js', 'TypeScript', 'Tailwind'] },
    { category: 'Backend & DB', items: ['Node.js', 'Python', 'PostgreSQL', 'Redis'] },
    { category: 'Cloud & Infra', items: ['AWS', 'Docker', 'Kubernetes', 'Terraform'] },
  ],
  education: [
    {
      school: 'University of California, Berkeley',
      degree: 'B.S. in Computer Science',
      location: '',
      start: '2016',
      end: '2020',
      gpa: '',
      details: [],
    },
  ],
  certifications: [],
  awards: [],
};
