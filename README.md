# Resumex

A chat-driven Typst résumé builder. Talk to it like a coach, and it lays out
your résumé in a polished template — live preview on the right, downloadable
PDF or `.typ` source any time.

![architecture](https://img.shields.io/badge/stack-React%2019%20%2B%20Node-2563eb)
![providers](https://img.shields.io/badge/AI-Gemini%20%7C%20Claude%20%7C%20OpenAI-1f2937)

## Features

- **Dashboard of saved resumes**. Create, open, rename, duplicate, and delete
  multiple resumes — each keeps its own chat history, template, and content
  (stored in your browser's localStorage).
- **Chat → resume**. Conversational extraction of name, contact, summary,
  experience, education, projects, skills, certifications, awards. The model
  returns a structured update each turn; the renderer pours it into the
  selected Typst template.
- **Import an existing resume**. Upload a PDF or Word (`.docx`) file when
  creating a new resume — the text is extracted and structured into the builder
  automatically.
- **Image input in chat**. Attach, drag-drop, or paste (Ctrl+V) screenshots —
  e.g. a photo of an old resume or a job posting — and the vision-capable model
  reads them.
- **ATS compatibility scorer**. One click gives a 0–100 readiness score with a
  category breakdown (contact, sections, quantified impact, action verbs,
  dates, keywords, conciseness), concrete fixes, and — with a key — LLM keyword
  suggestions tailored to a pasted job description.
- **Bring your own provider**. Pick Google Gemini, Anthropic Claude, or OpenAI
  from the in-app Settings panel. API keys stay in your browser's localStorage
  and are sent straight to the provider — the backend never persists them.
- **Ten hand-built templates**: *Jake*, *Modern*, *Classic*, *Compact*, *Executive*, *Neat*, *Deedy*, *Alta*, *Minimalist*, and *Attractive*. Switch templates any time from the editor; your content reflows.
- **Live PDF preview**. `npm run setup` installs a local **Typst** engine so
  compiles run fast and **fully offline** — no resume data leaves your machine.
- **Job-match mode**. Paste a job description and get a fit score, missing
  keywords, suggested edits, and a tailored summary you can apply with one
  click.
- **Download** the polished PDF or the raw `.typ` source.

## Quick start

```powershell
npm run setup    # installs deps (root/backend/frontend) + a local Typst engine
npm run dev      # backend → http://localhost:8000, frontend → http://localhost:5173
```

`npm run setup` works on Windows, macOS, and Linux — it downloads the Typst
build for your OS/arch, vendors it into `backend/vendor/`, so compiles are **fully offline** afterward. Then open
http://localhost:5173, click **Settings**, paste an API key for whichever
provider you'd like, and start chatting.

## Offline Typst compilation

The backend compiles resumes with **Typst** locally — no resume data ever
leaves your machine. `npm run setup` handles this automatically; the engine is
auto-detected from `backend/vendor/`, so there's nothing to configure.

Re-run just the engine step any time:

```powershell
npm run install-engine              # reinstall/repair the vendored engine
npm run install-engine -- --force   # force re-download
npm run install-engine -- --skip-warm   # install only, skip template check
```

Prefer a system-wide install? Any `typst` on your `PATH` is detected too.
You can also point at one explicitly via `TYPST_PATH` in `backend/.env`.

`GET /api/health` reports the active engine
(`"compile": { "typst": true }`).

## Architecture

```
┌─────────────────────────┐         ┌─────────────────────────────┐
│  React + Vite + Tailwind │ <─────> │  Node + Express             │
│  - ChatPanel             │  /api   │  - /chat  (LLM, JSON mode)  │
│  - PreviewPanel (iframe) │ <─────> │  - /render (resume → Typst) │
│  - SettingsModal         │         │  - /compile (Typst → PDF)   │
│  - JobMatchModal         │         │  - /job-match               │
│  - localStorage state    │         │  Provider adapters:         │
│  └───────────────────────┘         │   gemini | anthropic | openai│
│                                    └─────────────────────────────┘
```

The canonical resume is a JSON document. Templates are JS render
functions that take the JSON and return a complete `.typ` source string —
nothing in the runtime knows or cares about which provider produced the JSON.

## Adding a template

1. Create a template file under `packages/renderer/src/templates/typst/<id>.js` exporting a `META` object and a `render<Id>(resume)` function that returns a Typst document string.
2. Register it in `packages/renderer/src/templates/index.js`.
