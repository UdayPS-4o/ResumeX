// "Executive" template — Typst port of the LaTeX `executive` layout.
// Branded: big blue name, bold sans headline, blue uppercase sections each
// underlined by a single blue rule. Projects render as flowing paragraphs.
// Compiles via the Typst engine (format: 'typst').

import { sectionTitle, orderSections } from '../../typst.js';
import { typ, typMd, typLink, typDate, typPaper, typIcon } from '../../typst.js';

export const META = {
  name: 'Executive',
  description: 'Branded — big colored name, bold rule-separated sections.',
  author: 'resume-latex-renderer',
  license: 'MIT',
  accent: '#1a56db',
  defaultPageSize: 'a4',
  format: 'typst',
};

// Seeded resume data
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
    'Jordan Ellis is a full-stack engineer focused on shipping production features and building reliable ' +
    'backend systems. Comfortable across the stack, from API design and data modeling to ' +
    'frontend delivery and cloud deployment. jordan enjoys untangling complex systems and turning ' +
    'them into clean, scalable solutions.',
  experience: [
    {
      company: 'Northwind Labs',
      title: 'Senior Software Engineer',
      location: 'San Francisco, CA',
      start: 'Jan 2023',
      end: 'Present',
      description: 'Jordan is a lead engineer on the core platform team building a multi-tenant analytics product.',
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

export function renderExecutive(r, opts = {}) {
  const paper = typPaper(opts.pageSize || META.defaultPageSize);

  const c = r.contact || {};
  const contact = [
    c.location && `${typIcon('location')} ${typ(c.location)}`,
    c.phone && `${typIcon('phone')} ${typ(c.phone)}`,
    c.email && `${typIcon('email')} ${typLink('mailto:' + c.email, c.email)}`,
    c.linkedin && `${typIcon('linkedin')} ${typLink(c.linkedin)}`,
    c.github && `${typIcon('github')} ${typLink(c.github)}`,
    c.website && `${typIcon('website')} ${typLink(c.website)}`,
  ]
    .filter(Boolean)
    .join(' | ');

  const H = (key, fallback) => typ(sectionTitle(r, key, fallback));
  const blocks = {};

  // PROFILE
  if (r.summary?.trim()) {
    blocks.summary = `#sectionhead[${H('summary', 'Profile')}]\n${typMd(r.summary)}`;
  }

  // WORK EXPERIENCE
  if (r.experience?.length) {
    const items = r.experience.map((x) => {
      const titleCo = [x.title && typ(x.title), x.company && typ(x.company)]
        .filter(Boolean)
        .join(', ');
      const parts = [];
      parts.push(`[${titleCo}]`);
      parts.push(`[${typDate(x.start, x.end)}]`);
      if (x.location) {
        parts.push(`location: [${typ(x.location)}]`);
      }
      if (x.description?.trim()) {
        parts.push(`description: [\n${typMd(x.description)}\n]`);
      }
      if (x.bullets?.length) {
        const listItems = x.bullets.map((b) => `- ${typMd(b)}`).join('\n');
        parts.push(`bullets: [\n${listItems}\n]`);
      }
      return `#entry(${parts.join(', ')})`;
    });
    blocks.experience = `#sectionhead[${H('experience', 'Work Experience')}]\n${items.join('\n')}`;
  }

  // PROJECTS — rendered as flowing paragraphs (not bullet lists), matching LaTeX.
  if (r.projects?.length) {
    const items = r.projects.map((p) => {
      const projDate =
        p.start && p.end ? typDate(p.start, p.end) : p.end || p.start ? typ(p.end || p.start) : '';
      
      const contentParts = [];
      if (p.description?.trim()) contentParts.push(typMd(p.description));
      if (p.bullets?.length) contentParts.push(p.bullets.map((b) => typMd(b)).join(' '));
      const description = contentParts.join(' ');

      const parts = [];
      parts.push(`[${typMd(p.name)}]`);
      parts.push(`[${projDate}]`);
      if (description) {
        parts.push(`description: [\n${description}\n]`);
      }
      return `#entry(${parts.join(', ')})`;
    });
    blocks.projects = `#sectionhead[${H('projects', 'Projects')}]\n${items.join('\n')}`;
  }

  // SKILLS
  if (r.skills?.length) {
    const isBullets = r.settings?.skillsAsBullets ?? false;
    let lines = '';
    if (isBullets) {
      lines = r.skills
        .map(s => `#strong[${typ(s.category || 'Skills')}:]\n${(s.items || []).map(i => `  - ${typ(i)}`).join('\n')}`)
        .join('\n\n');
    } else {
      lines = r.skills
        .map(s => `#strong[${typ(s.category || 'Skills')}:] ${(s.items || []).map(typ).join(', ')}`)
        .join(' \\\n');
    }
    blocks.skills = `#sectionhead[${H('skills', 'Skills')}]\n#skillblock[\n${lines}\n]`;
  }

  // EDUCATION
  if (r.education?.length) {
    const items = r.education.map((e) => {
      const schoolLoc = [e.school && typ(e.school), e.location && typ(e.location)]
        .filter(Boolean)
        .join(', ');
      const sub = [];
      if (e.degree) sub.push(typ(e.degree));
      if (e.gpa) sub.push(`GPA: ${typ(e.gpa)}`);

      const parts = [];
      parts.push(`[${schoolLoc}]`);
      parts.push(`[${typDate(e.start, e.end)}]`);
      if (sub.length) {
        parts.push(`description: [\n${sub.join(' \\\n')}\n]`);
      }
      if (e.details?.length) {
        const listItems = e.details.map((d) => `- ${typMd(d)}`).join('\n');
        parts.push(`bullets: [\n${listItems}\n]`);
      }
      return `#entry(${parts.join(', ')})`;
    });
    blocks.education = `#sectionhead[${H('education', 'Education')}]\n${items.join('\n')}`;
  }

  // CERTIFICATIONS
  if (r.certifications?.length) {
    const items = r.certifications.map((c2) => {
      const parts = [];
      parts.push(`[${typ(c2.name)}]`);
      parts.push(`[${typ(c2.date)}]`);
      if (c2.issuer) {
        parts.push(`description: [${typ(c2.issuer)}]`);
      }
      return `#entry(${parts.join(', ')})`;
    });
    blocks.certifications = `#sectionhead[${H('certifications', 'Certifications')}]\n${items.join('\n')}`;
  }

  // AWARDS
  if (r.awards?.length) {
    const items = r.awards.map((a) => {
      const sub = [a.issuer && typ(a.issuer), a.description?.trim() && typMd(a.description)]
        .filter(Boolean)
        .join(' \\\n');
      const parts = [];
      parts.push(`[${typMd(a.name)}]`);
      parts.push(`[${typ(a.date)}]`);
      if (sub) {
        parts.push(`description: [\n${sub}\n]`);
      }
      return `#entry(${parts.join(', ')})`;
    });
    blocks.awards = `#sectionhead[${H('awards', 'Awards')}]\n${items.join('\n')}`;
  }

  const sections = orderSections(
    blocks,
    ['summary', 'experience', 'projects', 'skills', 'education', 'certifications', 'awards'],
    r.sectionOrder,
  );

  return `#set document(title: ${JSON.stringify(String(r.name || 'Resume'))})
#set page(paper: "${paper}", margin: (left: 0.65in, right: 0.65in, top: 0.55in, bottom: 0.55in))
#set text(font: ("Arial", "Helvetica Neue", "Liberation Sans"), size: 10pt, fill: rgb("#1A1F2B"))
#set par(leading: 0.55em, spacing: 0.7em, justify: false)

#let accent = rgb("#1A56DB")
#let icon-color = accent
#let subtext = rgb("#374151")

#set list(indent: 0.15in, body-indent: 0.5em, marker: [#sym.bullet], spacing: 4pt)

// Section header: vertically centered title underlined by a single blue rule.
#let sectionhead(title) = {
  v(4pt, weak: true)
  text(fill: accent, weight: "bold", size: 12.5pt)[#upper(title)]
  v(4pt, weak: true)
  line(length: 100%, stroke: 0.6pt + accent)
  v(8pt, weak: true)
}

// Entry helper with vertical centering, matching jake's robust spacing.
#let entry(
  title-co,
  date,
  location: none,
  description: none,
  bullets: none,
) = block(
  above: 10pt,
  below: 0pt,
  width: 100%,
)[
  #grid(columns: (1fr, auto), align: (left, right), [#strong[#title-co]], [#date])
  #if location != none [
    #v(2pt)
    #text(size: 9pt, fill: subtext)[#location]
  ]
  #if description != none [
    #v(3pt)
    #description
  ]
  #if bullets != none [
    #v(3pt)
    #bullets
  ]
]

#let skillblock(body) = block(above: 8pt, below: 0pt)[
  #body
]

#text(size: 24pt, weight: "bold", fill: accent)[${typ(r.name || 'YOUR NAME')}]

#v(2pt)
#text(size: 16pt, weight: "bold")[${typ(r.headline || '')}]

#v(1pt)
#text(size: 9pt)[${contact}]

${sections.join('\n\n#v(12pt, weak: true)\n\n')}
`;
}
