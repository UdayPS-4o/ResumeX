// Uday Pratap Singh Parihar — personal branded template.
// Design: large blue name, bold rule-separated sections, helvet sans-serif.
// Supports legal / a4 / letter page sizes.

import { tex, hrefTex, orderSections, sectionTitle } from '../latex.js';

export const META = {
  name: 'Uday',
  description: 'Personal branded — big blue name, bold rule-separated sections.',
  author: 'Uday PS',
  license: 'Personal',
  accent: '#2062c9',
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

export function renderUday(r, opts = {}) {
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
  // Section heading helper: user override → this template's label → generic default.
  const H = (key, fallback) => ts(sectionTitle(r, key, fallback));

  // PROFILE
  if (r.summary?.trim()) {
    blocks.summary = `\\sectionhead{${H('summary', 'Profile')}}\n${md(r.summary)}`;
  }

  // WORK EXPERIENCE
  if (r.experience?.length) {
    const items = r.experience.map(x => {
      const parts = [];
      const titleCo = [x.title && ts(x.title), x.company && ts(x.company)].filter(Boolean).join(', ');
      const hasLoc = !!x.location;
      const hasDesc = !!x.description?.trim();
      // Build the head line directly (not via \entryhead) so we can control the
      // trailing break. Force a newline ONLY when a sub-line (location or intro)
      // follows; if bullets come next, \begin{itemize} starts its own line and a
      // trailing \\ would leave a blank gap above the list.
      const headBreak = (hasLoc || hasDesc) ? '\\\\' : '';
      parts.push(`\\noindent\\textbf{${titleCo}}\\hfill ${dr(x.start, x.end)}${headBreak}`);
      if (hasLoc) {
        const tail = hasDesc ? '\\\\[2pt]' : '';
        parts.push(`{\\small\\color{subtext}${ts(x.location)}}${tail}`);
      }
      // Optional non-bulleted intro sentence (seed data uses this)
      if (hasDesc) parts.push(`${md(x.description)}`);
      if (x.bullets?.length) {
        const topsep = hasDesc ? '3pt' : '4pt';
        parts.push(`\\begin{itemize}[leftmargin=1.3em,itemsep=2.5pt,topsep=${topsep},parsep=0pt]`);
        for (const b of x.bullets) parts.push(`  \\item ${md(b)}`);
        parts.push('\\end{itemize}');
      }
      return parts.join('\n');
    });
    blocks.experience = `\\sectionhead{${H('experience', 'Work Experience')}}\n${items.join('\n\\vspace{8pt}\n')}`;
  }

  // PROJECTS — a prose `description` renders as a paragraph; `bullets` render as
  // a bulleted list, preserving the original structure (an imported résumé's
  // project bullets stay bullets rather than being flattened into a paragraph).
  if (r.projects?.length) {
    const items = r.projects.map(p => {
      const parts = [];
      // Projects can have start+end range or just end (single date)
      const projDate = (p.start && p.end) ? dr(p.start, p.end)
        : (p.end || p.start) ? ts(p.end || p.start) : '';
      const hasDesc = !!p.description?.trim();
      const hasBullets = !!p.bullets?.length;
      // Force a newline after the title ONLY before a prose intro. If bullets
      // come next, the itemize starts its own line and a trailing \\ would leave
      // a blank gap (same reasoning as the experience block). The break carries
      // the breath (\\[2.5pt]) so the body stays a continuation line.
      const headBreak = hasDesc ? '\\\\[2.5pt]' : '';
      parts.push(`\\noindent\\textbf{${md(p.name)}}\\hfill ${projDate}${headBreak}`);
      if (hasDesc) parts.push(md(p.description));
      if (hasBullets) {
        const topsep = hasDesc ? '3pt' : '4pt';
        parts.push(`\\begin{itemize}[leftmargin=1.3em,itemsep=2.5pt,topsep=${topsep},parsep=0pt]`);
        for (const b of p.bullets) parts.push(`  \\item ${md(b)}`);
        parts.push('\\end{itemize}');
      }
      return parts.join('\n');
    });
    // Blank line (\par) between entries — a bare \vspace does NOT end a paragraph,
    // so without it each entry head would flow into the previous project's text.
    blocks.projects = `\\sectionhead{${H('projects', 'Projects')}}\n${items.join('\n\n\\vspace{9pt}\n')}`;
  }

  // SKILLS
  if (r.skills?.length) {
    const lines = r.skills.map(s =>
      `\\textbf{${ts(s.category)}:} ${(s.items || []).map(ts).join(', ')}`
    ).join('\\\\[3pt]\n');
    blocks.skills = `\\sectionhead{${H('skills', 'Skills')}}\n${lines}`;
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
        block += '\n\\begin{itemize}[leftmargin=1.3em,itemsep=2.5pt,topsep=3pt,parsep=0pt]';
        for (const d of e.details) block += `\n  \\item ${md(d)}`;
        block += '\n\\end{itemize}';
      }
      return block;
    });
    blocks.education = `\\sectionhead{${H('education', 'Education')}}\n${items.join('\n\\vspace{8pt}\n')}`;
  }

  // CERTIFICATIONS
  if (r.certifications?.length) {
    const items = r.certifications.map(c2 =>
      `\\entryhead{${ts(c2.name)}}{${ts(c2.date)}}\n${ts(c2.issuer)}`
    );
    blocks.certifications = `\\sectionhead{${H('certifications', 'Certifications')}}\n${items.join('\n\\vspace{4pt}\n')}`;
  }

  // AWARDS
  if (r.awards?.length) {
    const items = r.awards.map(a => {
      let block = `\\entryhead{${md(a.name)}}{${ts(a.date)}}`;
      if (a.issuer) block += `\n${ts(a.issuer)}`;
      if (a.description?.trim()) block += `\n${md(a.description)}`;
      return block;
    });
    blocks.awards = `\\sectionhead{${H('awards', 'Awards')}}\n${items.join('\n\\vspace{4pt}\n')}`;
  }

  const sections = orderSections(
    blocks,
    ['summary', 'experience', 'projects', 'skills', 'education', 'certifications', 'awards'],
    r.sectionOrder,
  );

  return `\\documentclass[10pt]{article}
\\usepackage[${geom},left=0.39in,right=0.49in,top=0.30in,bottom=0.30in]{geometry}
\\usepackage[T1]{fontenc}
\\usepackage[utf8]{inputenc}
\\usepackage{helvet}
\\renewcommand{\\familydefault}{\\sfdefault}
\\usepackage[usenames,dvipsnames]{xcolor}
% Colors sampled from the source Word document.
\\definecolor{namecol}{HTML}{2062C9}   % name (Title)
\\definecolor{sectioncol}{HTML}{1F61C8} % section headings + rules
\\definecolor{bodytext}{HTML}{1E2330}   % all body / dark text
\\definecolor{subtext}{HTML}{1E2330}    % location lines (same as body in the doc)
\\usepackage[hidelinks,colorlinks=true,urlcolor=sectioncol]{hyperref}
\\usepackage{enumitem}
\\usepackage{microtype}
\\pagestyle{empty}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{0pt}

% Full-width blue rule drawn in vertical mode (no phantom line-height, so
% spacing is controlled purely by the surrounding \\vspace).
\\newcommand{\\srule}{{\\color{sectioncol}\\hrule height 0.6pt}}

% Section header: blue rule ABOVE + 12pt bold blue text + blue rule BELOW,
% with equal spacing on both sides of the text (matches the source doc).
\\newcommand{\\sectionhead}[1]{%
  \\par\\addvspace{12pt}%
  \\srule
  \\vspace{4pt}%
  \\noindent{\\color{sectioncol}\\textbf{\\large\\MakeUppercase{#1}}}\\par
  \\vspace{4pt}%
  \\srule
  \\vspace{7pt}%
}

% Bold title left, date right, forced newline
\\newcommand{\\entryhead}[2]{%
  \\noindent\\textbf{#1}\\hfill #2\\\\%
}

\\begin{document}
\\color{bodytext}

{\\fontsize{24}{28}\\selectfont\\color{namecol}\\textbf{${ts(r.name || 'YOUR NAME')}}}

\\vspace{9pt}
{\\fontsize{16}{20}\\selectfont\\bfseries ${ts(r.headline || '')}}

\\vspace{2pt}
{\\small ${contact}}

${sections.join('\n\n')}

\\end{document}
`;
}

// ── Seeded resume data ───────────────────────────────────────────────────────
// This is Uday's actual resume, stored here so the frontend can auto-seed it
// into localStorage and the template can rebuild it exactly.

export const SEED_RESUME = {
  name: 'UDAY PRATAP SINGH PARIHAR',
  headline: 'FULL STACK | AUTOMATION | REVERSE ENGINEERING',
  contact: {
    email: 'work@udayps.com',
    phone: '8819923334',
    location: 'Indore, Madhya Pradesh, India',
    website: '',
    linkedin: '',
    github: '',
  },
  summary:
    'Full-stack developer focused on shipping production features and building efficient ' +
    'automation systems. Hands-on experience building LLM-powered products, developing agentic ' +
    'workflows, and reverse-engineering complex APIs to solve integration challenges. Comfortable ' +
    'with high-throughput systems and building reliable tools where documentation is limited. ' +
    'I enjoy digging into how systems work to deliver scalable, impactful solutions.',
  experience: [
    {
      company: 'Delivo',
      title: 'Founding Engineer',
      location: 'Mumbai, Maharashtra, India',
      start: 'Jan 2023',
      end: 'Feb 2025',
      description:
        'Built a cutting-edge logistics web platform to streamline the management of ' +
        'international shipping operation,',
      bullets: [
        'Owned the end-to-end tech stack, from platform architecture and core workflows to ' +
        'client/warehouse dashboards and system integrations.',
        'Collaborated with cross-functional teams to ensure seamless integration with existing ' +
        'systems and compliance with international shipping regulations.',
      ],
    },
    {
      company: 'Tradyon',
      title: 'Software Engineer Intern',
      location: 'Bengaluru, Karnataka, India',
      start: 'May 2025',
      end: 'Jul 2025',
      description:
        "Delivered end-to-end product features for Tradyon's cross platform AI chatbot " +
        '(**Next.js** web + **React Native** app).',
      bullets: [
        'Shipped production features and bug fixes across web and mobile to improve chatbot ' +
        'UX and reliability.',
        '**Built agentic workflows using Dify** and n8n to orchestrate LLM interactions with ' +
        'global trade-data retrieval (BigQuery backed) and downstream response generation.',
        "Enabled rich responses (text + charts/graphs) by wiring workflows into the app's " +
        'existing data/services layer.',
        'Worked in a fast iteration cycle, prioritizing delivery speed while maintaining code quality.',
      ],
    },
  ],
  projects: [
    {
      name: 'EHR Automation — eClinicalWorks',
      start: '',
      end: 'Aug 2025',
      description: '',
      tech: [],
      link: '',
      bullets: [
        "**Reverse engineered the platform's payload encryption** of request endpoints to enable " +
        'reliable automation. Built a custom API wrapper by analyzing network traffic and ' +
        'request/response patterns, enabling programmatic patient creation and appointment ' +
        'scheduling (UI-free integration layer).',
      ],
    },
    {
      name: 'E-commerce Automation — Myntra, Flipkart',
      start: '',
      end: 'Dec 2023',
      description: '',
      tech: [],
      link: '',
      bullets: [
        'Built an automation suite with high volume account generation (500+), restock/price ' +
        'monitors, and a low-latency **request-driven bulk checkout executor** (~2s COD) at 500+ ' +
        'concurrency. Implemented a **centralized web dashboard** to manage accounts, orders, and ' +
        'delivery codes; deployed on GCP Cloud Run for scale. Integrated automated card payment ' +
        'flows with **3DS OTP capture/autofill** via companion app integration to reduce manual intervention.',
      ],
    },
    {
      name: 'High-Concurrency Ticketing — BookMyShow / District',
      start: 'Oct 2024',
      end: 'Nov 2025',
      description: '',
      tech: [],
      link: '',
      bullets: [
        'Engineered an end-to-end RPA ticketing suite controlling **50 concurrent accounts on Firefox** ' +
        'with an IMAP-based auto-login pipeline for high-demand drops (Coldplay, Travis Scott, ' +
        'Diljit Dosanjh, 2023 World Cup). Engineered custom Queue-IT bypass logic by optimizing ' +
        'request timing to consistently achieve **sub 500 queue positions**, and deployed a centralized ' +
        'monitor to track live queue progression and seat availability across all active sessions.',
      ],
    },
    {
      name: 'Real-Time Copy Trading Bot (Solana + EVM)',
      start: '',
      end: 'Jul 2024',
      description: '',
      tech: [],
      link: '',
      bullets: [
        'Built a real time copy trading system across Solana and EVM chains (Ethereum, Base), ' +
        'supporting multiple copier + copying wallets. Monitored on-chain transactions via RPC nodes, ' +
        'detected and decoded swap input data, and mirrored trades with configurable allocation ' +
        'executing within the next block.',
      ],
    },
  ],
  skills: [
    {
      category: 'Automation',
      items: ['API/Android Reverse Engineering', 'Puppeteer', 'Appium', 'SSL Proxying', 'Burp', 'Frida', 'Dify'],
    },
    { category: 'Frontend', items: ['React', 'Next.js', 'TypeScript', 'Tailwind', 'React Native'] },
    { category: 'Backend & DB', items: ['Node.js', 'Python', 'PHP', 'MySQL', 'Mongo'] },
    { category: 'Cloud & Infra', items: ['GCP (Cloud Run)', 'AWS', 'Serverless', 'Nginx', 'Linux'] },
  ],
  education: [
    {
      school: 'IPS Academy, Rajendra Nagar, Indore',
      degree: 'Bachelor of Technology - BTech in Computer Science',
      location: '',
      start: 'Jun 2023',
      end: 'Jun 2027',
      gpa: '',
      details: [],
    },
  ],
  certifications: [],
  awards: [],
};
