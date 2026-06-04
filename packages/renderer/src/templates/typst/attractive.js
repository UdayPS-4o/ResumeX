import { sectionTitle, orderSections } from '../../typst.js';
import { typ, typMd, typLink, typDate, typPaper, typIcon } from '../../typst.js';

export const META = {
  name: 'Attractive',
  description: 'A modern, attractive Typst resume template with a sidebar.',
  author: 'Harkunwar',
  license: 'MIT',
  accent: '#0F83C0',
  defaultPageSize: 'a4',
  format: 'typst',
};

export function renderAttractive(r, opts = {}) {
  const paper = typPaper(opts.pageSize || META.defaultPageSize);
  const accentColor = opts.accentColor || META.accent;

  const c = r.contact || {};
  const contactLines = [
    c.phone && `contact(text: ${JSON.stringify(typ(c.phone))})`,
    c.email && `contact(text: ${JSON.stringify(typ(c.email))}, link: ${JSON.stringify('mailto:' + typ(c.email))})`,
    c.github && `contact(text: ${JSON.stringify(typ(c.github.replace(/^https?:\/\//, '')))}, link: ${JSON.stringify(typ(c.github))})`,
    c.linkedin && `contact(text: ${JSON.stringify(typ(c.linkedin.replace(/^https?:\/\//, '')))}, link: ${JSON.stringify(typ(c.linkedin))})`,
    c.website && `contact(text: ${JSON.stringify(typ(c.website.replace(/^https?:\/\//, '')))}, link: ${JSON.stringify(typ(c.website))})`,
    c.location && `contact(text: ${JSON.stringify(typ(c.location))})`,
  ].filter(Boolean);

  const H = (key, fallback) => typ(sectionTitle(r, key, fallback));

  const mainBlocks = [];
  const sidebarBlocks = [];

  // SUMMARY -> main
  if (r.summary?.trim()) {
    mainBlocks.push(`section(title: ${JSON.stringify(H('summary', 'Summary'))}, content: (subSection(content: [${typMd(r.summary)}]),))`);
  }

  // EXPERIENCE -> main
  if (r.experience?.length) {
    const expContent = r.experience.map(x => {
      const contentList = [];
      if (x.description?.trim()) contentList.push(`[${typMd(x.description)}]`);
      if (x.bullets?.length) contentList.push(...x.bullets.map(b => `[${typMd(b)}]`));
      
      return `subSection(
        title: ${JSON.stringify(typ(x.company || ''))},
        titleEnd: ${JSON.stringify(typ(x.location || ''))},
        subTitle: ${JSON.stringify(typ(x.title || ''))},
        subTitleEnd: ${JSON.stringify(typDate(x.start, x.end))},
        content: ${contentList.length ? `list(${contentList.join(',\n')})` : '[]'}
      )`;
    }).join(',\n');
    mainBlocks.push(`section(title: ${JSON.stringify(H('experience', 'Experience'))}, content: (\n${expContent},\n))`);
  }

  // PROJECTS -> main
  if (r.projects?.length) {
    const projContent = r.projects.map(p => {
      const contentList = [];
      if (p.description?.trim()) contentList.push(`[${typMd(p.description)}]`);
      if (p.bullets?.length) contentList.push(...p.bullets.map(b => `[${typMd(b)}]`));
      
      return `subSection(
        title: ${JSON.stringify(typMd(p.name || ''))},
        titleEnd: ${JSON.stringify(typDate(p.start, p.end))},
        subTitle: ${JSON.stringify(typ(p.tech?.join(', ') || ''))},
        content: ${contentList.length ? `list(${contentList.join(',\n')})` : '[]'}
      )`;
    }).join(',\n');
    mainBlocks.push(`section(title: ${JSON.stringify(H('projects', 'Projects'))}, content: (\n${projContent},\n))`);
  }

  // SKILLS -> sidebar (inline dot-separated, matching original Attractive template)
  if (r.skills?.length) {
    const skillsContent = r.skills.map(s => {
      return `subSection(
        title: ${JSON.stringify(typ(s.category || ''))},
        content: ${JSON.stringify(typ((s.items || []).join(' \u2022 ')))}
      )`;
    }).join(',\n');
    sidebarBlocks.push(`section(title: ${JSON.stringify(H('skills', 'Skills'))}, content: (\n${skillsContent},\n))`);
  }

  // EDUCATION -> sidebar
  if (r.education?.length) {
    const eduContent = r.education.map(e => {
      const contentList = [];
      if (e.gpa) contentList.push(`[GPA: ${typ(e.gpa)}]`);
      if (e.details?.length) contentList.push(...e.details.map(d => `[${typMd(d)}]`));
      const dateStr = typDate(e.start, e.end);
      if (dateStr) contentList.unshift(`[${typ(dateStr)}]`);
      if (e.location) contentList.push(`[${typ(e.location)}]`);
      const contentStr = contentList.join('\\n');
      
      return `subSection(
        title: ${JSON.stringify(typ(e.school || ''))},
        subTitle: ${JSON.stringify(typ(e.degree || ''))},
        content: [${contentStr}]
      )`;
    }).join(',\n');
    sidebarBlocks.push(`section(title: ${JSON.stringify(H('education', 'Education'))}, content: (\n${eduContent},\n))`);
  }

  // CERTIFICATIONS -> sidebar
  if (r.certifications?.length) {
    const certContent = r.certifications.map(c2 => {
      const subT = [typ(c2.issuer || ''), typ(c2.date || '')].filter(Boolean).join(' • ');
      return `subSection(
        title: ${JSON.stringify(typ(c2.name || ''))},
        subTitle: ${JSON.stringify(subT)}
      )`;
    }).join(',\n');
    sidebarBlocks.push(`section(title: ${JSON.stringify(H('certifications', 'Certifications'))}, content: (\n${certContent},\n))`);
  }

  // AWARDS -> sidebar
  if (r.awards?.length) {
    const awardsContent = r.awards.map(a => {
      const subT = [typ(a.issuer || ''), typ(a.date || '')].filter(Boolean).join(' • ');
      return `subSection(
        title: ${JSON.stringify(typMd(a.name || ''))},
        subTitle: ${JSON.stringify(subT)}
      )`;
    }).join(',\n');
    sidebarBlocks.push(`section(title: ${JSON.stringify(H('awards', 'Awards'))}, content: (\n${awardsContent},\n))`);
  }

  return `#import "/packages/renderer/src/templates/typst/packages/attractive-cv/lib.typ": *

#set page(
  paper: "${paper}",
  margin: (
    left: 10mm, 
    right: 10mm, 
    top: 15mm, 
    bottom: 15mm
  ),
)

// Use a fallback font if Mulish is not available
#set text(font: ("Mulish", "Arial", "Liberation Sans", "Helvetica Neue"), size: 10pt)

#show: project.with(
  theme: rgb("${accentColor}"),
  name: ${JSON.stringify(typ(r.name || 'Your Name'))},
  title: ${JSON.stringify(typ(r.headline || ''))},
  contact: (
    ${contactLines.length > 0 ? contactLines.join(',\n    ') + ',' : ''}
  ),
  main: (
    ${mainBlocks.length > 0 ? mainBlocks.join(',\n    ') + ',' : ''}
  ),
  sidebar: (
    ${sidebarBlocks.length > 0 ? sidebarBlocks.join(',\n    ') + ',' : ''}
  )
)
`;
}
