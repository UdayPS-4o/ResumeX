# resume-latex-renderer

Turn a plain **resume JSON** object into a complete, compilable **LaTeX** document
using one of several built-in templates. Pure functions — **no network, no
filesystem, no LaTeX engine** required. Pipe the output to any compiler
(`tectonic`, `pdflatex`, latexonline.cc, …) to get a PDF.

```bash
npm install resume-latex-renderer
```

## Quick start

```js
import { renderResume, emptyResume, listTemplates } from 'resume-latex-renderer';

const resume = {
  ...emptyResume(),
  name: 'Ada Lovelace',
  headline: 'Computing Pioneer',
  contact: { email: 'ada@example.com', location: 'London, UK', github: 'https://github.com/ada' },
  summary: 'Mathematician focused on analytical computing and symbolic logic.',
  experience: [{
    company: 'Analytical Engine Co.', title: 'Lead Algorithm Designer',
    start: 'Jan 1843', end: 'Present',
    bullets: ['Designed the first published algorithm for machine execution.'],
  }],
  skills: [{ category: 'Math', items: ['Calculus', 'Logic'] }],
};

const tex = renderResume('jake', resume);          // → full LaTeX source string
// renderResume('executive', resume, { pageSize: 'a4' }) // per-render options
```

Then compile however you like:

```js
import { writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
await writeFile('resume.tex', tex);
execFile('tectonic', ['resume.tex']);              // → resume.pdf
```

## Templates

```js
import { listTemplates } from 'resume-latex-renderer';
console.log(listTemplates());
```

| id        | look                                                            |
|-----------|-----------------------------------------------------------------|
| `jake`    | Clean single column — the popular Jake Gutierrez GitHub style    |
| `modern`  | Sans-serif with a colored accent bar                            |
| `classic` | Traditional serif, conservative                                 |
| `compact` | Dense single column — fits more on one page                     |
| `executive` | Branded — big colored name, rule-separated sections (ships with seed data) |

Each entry exposes `{ id, name, description, author, license, accent, hasSeed, defaultPageSize? }`.

## API

### `renderResume(templateId, resume, opts?) → string`
Render a resume to a LaTeX document. `opts.pageSize` is `'letter' | 'a4' | 'legal'`.

### `listTemplates() → TemplateInfo[]`
Metadata for every template.

### `getTemplate(id) → TemplateInfo & { render }` | `undefined`
A single template, including its `render` function.

### `getSeed(id) → Resume | null`
Sample resume bundled with a template (e.g. `executive`), handy for demos/defaults.

### `emptyResume() → Resume`
A blank resume with every field present.

### `mergeResume(current, update) → Resume`
Merge a partial update into a resume (arrays replaced wholesale, `contact` shallow-merged).
Useful when an LLM returns incremental section updates.

### `resumeJsonSchema`
JSON schema describing the resume shape — pass to an LLM for structured output.

### `latex`
Low-level escaping helpers (`tex`, `joinTex`, `hrefTex`, `dateRange`, `orderSections`)
exported so you can author your own template.

## Resume shape

```ts
{
  name, headline,
  contact: { email, phone, location, website, linkedin, github },
  summary,
  experience:     [{ company, title, location, start, end, bullets[] }],
  education:      [{ school, degree, location, start, end, gpa, details[] }],
  projects:       [{ name, description, tech[], link, bullets[] }],
  skills:         [{ category, items[] }],
  certifications: [{ name, issuer, date }],
  awards:         [{ name, issuer, date, description }],
  sectionOrder:   []   // optional explicit ordering; empty = template default
}
```

All fields are optional — omit what you don't have. User text is LaTeX-escaped
automatically, so `&`, `%`, `$`, `_`, `#`, etc. are safe to pass as-is.

## Writing a custom template

A template is `{ meta, render(resume, opts) → string }`. Reuse the escaping helpers:

```js
import { latex } from 'resume-latex-renderer';
const { tex, hrefTex, dateRange, orderSections } = latex;

export const META = { name: 'Mini', description: '…', author: 'you', license: 'MIT', accent: '#000' };
export function render(r) {
  return `\\documentclass{article}\\begin{document}${tex(r.name)}\\end{document}`;
}
```

## License

MIT © resume-latex-renderer contributors
