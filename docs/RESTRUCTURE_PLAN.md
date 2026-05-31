# Resumex — Enterprise Restructure Plan (HLD + LLD)

> Status: Proposed · Owner: Platform · Audience: engineering + AI agents
> Companion doc: [`PARALLEL_EXECUTION_PLAN.md`](./PARALLEL_EXECUTION_PLAN.md) (how to build this with multiple agents in parallel)

This document defines the target architecture and a concrete, incremental migration path to take Resumex from a working prototype to an enterprise-grade system. It is written to be executed by humans **or** autonomous agents: every phase has explicit scope, interfaces, and acceptance criteria.

---

## 0. Current state (as mapped)

```
Resumex/                      non-workspaces monorepo (3 sibling installs)
├── package.json              root: only `concurrently`; orchestrates via npm scripts
├── scripts/install-engine.mjs  vendors Tectonic LaTeX engine
├── backend/                  Express (ESM), routes/services/providers/prompts/templates
├── frontend/                 React 19 + Vite 6 + Tailwind 4 (no TS, no tests, no router)
└── package/                  `resume-latex-renderer` lib — the ONLY tests live here
```

### Critical problems

| # | Problem | Evidence | Impact |
|---|---------|----------|--------|
| C1 | **Templates triplicated & diverged** | `package/src/templates/*`, `backend/src/templates/*` (evolved: `mdTex`, `pageSize`, `sectionTitle`), and a 3rd **HTML** reimplementation in `frontend/ResumePreview.jsx` | Fixes must be made 3× and drift (e.g. the projects-bullets bug fixed only in `backend/uday.js`) |
| C2 | **Resume schema duplicated** | `backend/src/schema.js` ⟂ `package/src/schema.js` ⟂ implicit shape in frontend | No single source of truth; client/server can disagree |
| C3 | **ATS logic duplicated** | `backend/src/services/atsChecks.js` ⟂ `frontend/src/lib/ats.js` | Two scorers that silently drift |
| C4 | **`parseJsonLoose` copied 3×** | `chat.js`, `jobMatch.js`, `ats.js` | Inconsistent LLM-output parsing |
| C5 | **No validation / typed contracts** | routes trust client JSON; no Zod/Joi | Garbage-in to LLM/compiler; runtime errors |
| C6 | **No tests outside `package/`** | backend & frontend untested; only `node:test` in `package/` | No regression safety on a fast-moving codebase |
| C7 | **No CI/CD, lint, format, types, Docker** | no `.github/workflows`, no eslint/prettier/tsconfig | Quality is manual; onboarding is hard |
| C8 | **Oversized components** | `Editor.jsx` 607, `FormEditor.jsx` 574, `ChatPanel.jsx` 494, `ResumePreview.jsx` 371; `lib/resume.js` 375 | Hard to test, review, and change safely |
| C9 | **Security gaps** | API keys in request **body**; `cors()` wide-open; no rate limit; no helmet; errors leak internals | Not production-safe |
| C10 | **No structured logging / observability** | `console.*` only | Undebuggable in prod; no audit trail |

### What is already good (keep & build on)
- Clean LLM **provider abstraction** (`providers/index.js` dispatch + per-provider adapters).
- Centralized **LaTeX escaping** (`services/latex.js`).
- Robust **offline→online compile fallback** and portable Tectonic vendoring.
- Deterministic, well-factored **diff/patch/merge** (`frontend/lib/resume.js`) — promote to shared.
- Sensible **error status codes** and async/await throughout.

---

## 1. Design principles

These govern every decision below.

- **Single Source of Truth (SSOT).** One schema, one renderer registry, one ATS engine, one API contract. Everything else imports them.
- **Contract-first.** Types and the HTTP contract are defined before implementations so producers/consumers (and parallel agents) can work independently.
- **Hexagonal / Ports & Adapters.** Core domain logic depends on interfaces; LLM providers, the LaTeX compiler, and persistence are swappable adapters.
- **SOLID + DRY + separation of concerns.** Especially SRP: split the 600-line components; one reason to change per module.
- **12-Factor.** Config from env, validated at boot; stateless API; logs as event streams; dev/prod parity.
- **Type safety end-to-end.** TypeScript everywhere; `zod` schema → inferred TS types → JSON Schema for LLM structured output (one definition, three uses).
- **Progressive hardening, never a big-bang rewrite.** Each phase ships independently and keeps `npm run dev` working.
- **Observability & testability are features**, not afterthoughts.

---

## 2. HLD — Target architecture

### 2.1 Repository topology (pnpm workspaces + Turborepo)

```
resumex/
├── pnpm-workspace.yaml
├── turbo.json                      # task graph + remote/local caching
├── package.json                    # root scripts only (turbo run …)
├── .github/workflows/ci.yml        # lint, typecheck, test, build, docker
├── docker/                         # Dockerfile(s) + compose for local stack
├── tooling/                        # shared dev config (no app code)
│   ├── eslint-config/
│   ├── tsconfig/                   # base.json, react.json, node.json
│   └── prettier-config/
├── packages/                       # versioned, dependency-free-ish libraries
│   ├── core/        @resumex/core      # Zod schema, TS types, diff/patch/merge, JSON-schema export
│   ├── renderer/    @resumex/renderer  # LaTeX template registry — SSOT (was package/ + backend/templates)
│   ├── preview/     @resumex/preview   # HTML/React preview renderer driven by the SAME registry metadata
│   ├── ats/         @resumex/ats       # deterministic ATS scoring — SSOT (was atsChecks.js + lib/ats.js)
│   ├── contracts/   @resumex/contracts # API request/response Zod DTOs + typed fetch client
│   └── llm/         @resumex/llm        # provider port + anthropic/openai/gemini adapters + prompts
└── apps/
    ├── api/         backend Express (hardened) — controllers→services→adapters
    └── web/         frontend React app (router + state + design system)
```

Rationale: the existing 3-folder split maps cleanly onto `apps/*`; the `package/` library generalizes into focused `packages/*`. Turborepo gives task caching and a dependency-aware build graph that the parallel-agent plan relies on.

### 2.2 Component view (C4 container level)

```
┌────────────────────────────────────────────────────────────────┐
│ apps/web (React)                                                 │
│  Router → Feature modules → Design system                        │
│  State: Zustand (UI/editor) + TanStack Query (server cache)      │
│  Persistence: StoragePort (localStorage adapter today)           │
│  Imports: @resumex/{core,preview,ats,contracts}                  │
└───────────────▲──────────────────────────────────────────────────┘
                │ typed client (@resumex/contracts) over HTTPS
┌───────────────┴──────────────────────────────────────────────────┐
│ apps/api (Express, hardened)                                      │
│  Edge: helmet, cors(allowlist), rate-limit, requestId, pino,      │
│        zod validation, central error mapper                       │
│  Layers: Controller → Service (domain) → Adapter (port impls)     │
│  Adapters: LLM (@resumex/llm), Compiler (local→online), Storage   │
│  Imports: @resumex/{core,renderer,ats,contracts,llm}              │
└───────────────▲───────────────────────▲──────────────────────────┘
                │                        │
        ┌───────┴──────┐         ┌───────┴───────────┐
        │ LLM providers│         │ LaTeX compiler    │
        │ (Anthropic/  │         │ Tectonic (vendored)│
        │  OpenAI/Gemini)        │ → online fallback │
        └──────────────┘         └───────────────────┘
```

### 2.3 Cross-cutting concerns (HLD-level decisions)

| Concern | Decision | Rationale |
|---------|----------|-----------|
| Language | **TypeScript** everywhere, incremental migration | End-to-end type safety; kills C2/C5 |
| Schema/validation | **Zod** in `@resumex/core` → infer types → `zod-to-json-schema` for LLM structured output | One definition, three consumers (server, client, LLM) |
| API contract | **`@resumex/contracts`** = Zod DTOs + generated OpenAPI + typed client | Contract-first enables parallel FE/BE work |
| Monorepo tooling | **pnpm workspaces + Turborepo** | Caching, task graph, parallel-safe |
| Backend framework | **Keep Express, harden** (controllers/services/adapters + middleware). *Alt:* Fastify/NestJS if team prefers batteries-included | Lowest-risk path; preserves working compile pipeline |
| Frontend state | **Zustand** (client) + **TanStack Query** (server state) | Removes prop-drilling (C8); cache/retry for free |
| Routing | **React Router v6** (or TanStack Router) | Real URLs, back button, deep links |
| Auth | **Boundary designed now, optional impl.** API keys move to `Authorization` header; pluggable auth middleware (BYO-key today → org SSO later) | Fix C9 without forcing accounts yet |
| Logging | **pino** structured logs + request IDs; redact secrets | C10 |
| Observability | **OpenTelemetry** traces + **Sentry** error reporting (web + api) | Prod debuggability |
| Persistence | **StoragePort**: localStorage adapter now; HTTP/DB adapter later | Future cloud sync without rewrite |
| Testing | **Vitest** (unit) across packages/apps; **Supertest** (api integration); **Playwright** (e2e); **contract tests** against Zod DTOs | C6 |
| Packaging | **Docker** images for api + web; compose for local | Deploy parity |
| Secrets | Server-side keys in env (validated); client BYO-key never logged | Security |

---

## 3. LLD — Low-level design

### 3.1 `@resumex/core` (domain SSOT)
- `schema.ts` — Zod schemas: `Resume`, `Contact`, `Experience`, `Education`, `Project`, `SkillGroup`, `Certification`, `Award`, `SectionKey`. Export inferred types (`export type Resume = z.infer<typeof ResumeSchema>`).
- `json-schema.ts` — `resumeJsonSchema = zodToJsonSchema(ResumeSchema)` for LLM structured output (replaces hand-written `resumeJsonSchema`).
- `merge.ts` — `mergeResume(current, patch)` (port the existing partial-merge contract; add tests).
- `diff.ts` — `diffResume`, `splitChangesIntoCards`, `applyCardPatch`, `invertCardPatch`, `undoCardPatch` (lifted verbatim from `frontend/lib/resume.js`, typed + unit-tested).
- `empty.ts` — `emptyResume()`.
- **Acceptance:** `package/src/schema.js` and `backend/src/schema.js` deleted; both apps import `@resumex/core`. 100% unit coverage on merge/diff.

### 3.2 `@resumex/renderer` (LaTeX SSOT) — resolves C1
- `registry.ts` — `TEMPLATES: Record<TemplateId, TemplateModule>` where `TemplateModule = { meta: TemplateMeta; render(resume: Resume, opts: RenderOptions): string; seed?: Resume }`.
- `templates/{jake,modern,classic,compact,executive}.ts` — **converged** versions. Convergence rule: start from the **backend** copies (they have `mdTex`, `pageSize`, `sectionTitle`, and bug fixes), re-add `executive` from `package/`. Drop the legacy `modern.js`/`uday.js` ambiguity: canonical id is `modern`, keep `uday` as a deprecated alias in the registry only.
- `latex.ts` — escaping/formatting helpers (`tex`, `mdTex`, `hrefTex`, `dateRange`, `joinTex`, `sectionTitle`, `orderSections`) — single copy.
- `index.ts` — `renderTemplate(id, resume, opts)`, `listTemplates()`.
- **Acceptance:** `package/src/templates/*`, `package/src/latex.js`, `backend/src/templates/*`, `backend/src/services/latex.js` all deleted; api imports `@resumex/renderer`. Golden-file tests: every template renders sample + seed to LaTeX and **compiles** to a PDF in CI.

### 3.3 `@resumex/preview` (HTML preview) — resolves the C1 third copy
- React components that render a `Resume` to styled HTML for fast thumbnails, **driven by `TemplateMeta`** (accent, section order, labels) from the registry so layout intent is shared even though LaTeX≠HTML.
- `ResumePreview` and per-template presenters extracted from `frontend/ResumePreview.jsx`, typed.
- **Acceptance:** frontend imports `@resumex/preview`; no template styling literals remain in app code.

### 3.4 `@resumex/ats` (scoring SSOT) — resolves C3
- `score.ts` — `runAtsChecks(resume): AtsResult` (one implementation; port the backend weights as canonical).
- **Acceptance:** `frontend/lib/ats.js` and `backend/services/atsChecks.js` deleted; both import `@resumex/ats`. Table-driven unit tests for each scoring dimension.

### 3.5 `@resumex/llm` (provider port + prompts)
- `port.ts` — `interface LlmProvider { complete(req): Promise<{text}>; stream(req): AsyncIterable<string>; }` + `ChatRequest`, `Message`, `ImagePart` types.
- `providers/{anthropic,openai,gemini}.ts` — adapters implementing the port (lifted from `backend/providers/*`).
- `registry.ts` — `PROVIDERS` metadata + `resolveProvider(name)`; key resolution (header/env), missing-key → typed `LlmAuthError`.
- `prompts/{builder,ats,jobMatch,import}.ts` — prompt builders; keep the **coach vs import** split (see `verbatim-import`). Add `parseModelJson` (the single canonical `parseJsonLoose`) — resolves C4.
- **Acceptance:** `backend/providers/*`, `backend/prompts/*`, the 3 `parseJsonLoose` copies removed.

### 3.6 `@resumex/contracts` (API contract) — enables parallelism
- `dto/*.ts` — Zod request/response schemas per endpoint (`ChatRequest`, `ChatResponse`, `CompileRequest`, `RenderRequest`, `ExtractResponse`, `AtsRequest/Response`, `JobMatchRequest/Response`, `TemplatesResponse`).
- `client.ts` — typed fetch client (`createApiClient(baseUrl)`) consumed by the web app (replaces hand-rolled `frontend/lib/api.js`).
- `openapi.ts` — OpenAPI generated from the Zod DTOs.
- **Acceptance:** server validates with the same DTOs the client is typed against; one breaking change ⇒ one place.

### 3.7 `apps/api` (hardened Express)
- **Edge middleware (order):** `requestId` → `pino-http` → `helmet` → `cors(allowlist)` → `express.json(limit)` → route → `validate(dto)` → controller → **central error mapper**.
- **Layering:** `routes/` (thin controllers, parse+respond) → `services/` (domain orchestration) → `adapters/` (LLM via `@resumex/llm`, compiler, storage). Controllers never call SDKs directly.
- **Compiler service:** keep `compiler.ts` (local→online), `localCompiler.ts`, `pdfTrim.ts`, `extract.ts` as adapters; inject config.
- **Config:** `config.ts` validates `process.env` with Zod at boot (`PORT`, `COMPILE_MODE`, `TECTONIC_PATH`, `*_API_KEY`, `CORS_ORIGINS`, `RATE_LIMIT_*`) — fail fast.
- **Error model:** `AppError{ code, status, publicMessage, cause }`; mapper logs `cause` (with `requestId`) but returns only `{ error: { code, message } }` — no internal paths/engine names leaked (fixes C9).
- **Security:** API key via `Authorization: Bearer` (body still accepted during transition, deprecated); `express-rate-limit` per-IP + per-key; request timeout middleware; SSE client-disconnect handling for `/chat/stream`.
- **Acceptance:** every route has a Zod validator; Supertest integration suite green; no secret appears in logs (redaction test).

### 3.8 `apps/web` (React)
- **Structure:** `app/` (router, providers, error boundary), `features/{dashboard,editor,chat,templates,ats,settings}/`, `components/ui/` (design system), `lib/`, `stores/`.
- **Routing:** routes for `/`, `/r/:id`, `/r/:id/edit` — back button + deep links work.
- **State:** `editorStore` (Zustand) holds resume/messages/template; **TanStack Query** wraps the typed client (`useChat`, `useCompile`, `useTemplates`) with caching/retry; replaces ad-hoc `usePdfCompiler` cache.
- **Component decomposition (C8):**
  - `Editor.jsx` (607) → `EditorLayout` + `EditorProvider` (store) + `ChatTab`/`FormTab`/`PreviewTab` + `useEditorPersistence` hook.
  - `FormEditor.jsx` (574) → `FormEditor` + `SectionEditor` + `ItemEditor` + field primitives + `useDragReorder`.
  - `ChatPanel.jsx` (494) → `ChatPanel` + `MessageList`/`Message` + `SuggestionCard` + `Composer`.
  - `ResumePreview.jsx` (371) → moved to `@resumex/preview`.
- **Design system:** `ui/{Button,Modal,Input,Badge,Icon}`; adopt an icon set (Lucide) to kill inline-SVG duplication.
- **Resilience:** top-level + per-feature **error boundaries**; Sentry; storage quota guard + versioned migrations in the StoragePort adapter.
- **Acceptance:** no component > ~250 lines; no prop-drilling deeper than 2 levels; Vitest + Testing Library on stores/hooks; Playwright happy-path e2e (create → chat → compile → download).

### 3.9 Testing strategy
| Layer | Tool | Target |
|-------|------|--------|
| Packages (core/ats/renderer/llm) | Vitest | ≥90% on pure logic; golden LaTeX + compile-in-CI |
| API | Vitest + Supertest | every route: validation, happy path, error mapping, redaction |
| Web | Vitest + Testing Library | stores, hooks, diff-card apply/undo |
| Contract | shared Zod DTOs asserted both sides | drift caught at build |
| E2E | Playwright | create→chat→compile→export; import→verbatim→optimize |

### 3.10 CI/CD & containerization
- **GitHub Actions:** `install (pnpm) → turbo run lint typecheck test build` with Turbo cache; a `compile-smoke` job that installs Tectonic and renders+compiles all templates; Playwright job; Docker build on tag.
- **Docker:** multi-stage images for `apps/api` (node + vendored Tectonic) and `apps/web` (static build → nginx); `docker-compose.yml` for the full local stack.
- **Pre-commit:** Husky + lint-staged (eslint --fix, prettier, typecheck on staged).

---

## 4. Migration phases (incremental, each ships green)

> Ordering is driven by the dependency DAG in the companion doc. Contracts/core come first because everything imports them.

| Phase | Theme | Key deliverables | Acceptance gate |
|-------|-------|------------------|-----------------|
| **P0** | Tooling foundation | pnpm workspaces, Turborepo, `tooling/*` (eslint/prettier/tsconfig), Husky, baseline GitHub Actions, Docker skeleton | `turbo run lint build` green; `npm run dev` still works |
| **P1** | Extract shared packages + **converge templates** | `@resumex/core`, `@resumex/renderer` (C1), `@resumex/ats` (C3), `@resumex/llm` (incl. single `parseModelJson`, C4); delete all duplicates | Golden render+compile tests pass; apps consume packages; dup files deleted |
| **P2** | Contracts + TS migration | `@resumex/contracts` (DTOs + typed client + OpenAPI); migrate `apps/api` and `apps/web` to TS; Zod validation wired | Typecheck green; client/server share DTOs; C2/C5 closed |
| **P3** | API hardening | layering, config validation, pino logging, helmet, cors allowlist, rate-limit, central error model, header-based keys, SSE disconnect handling | Supertest suite + redaction test green; C9/C10 closed |
| **P4** | Web restructure | router, Zustand+TanStack Query, component split (C8), `@resumex/preview`, design system, error boundaries, storage migrations | No component > ~250 lines; Testing Library suite green |
| **P5** | Test depth + CI/CD + Docker | Vitest coverage gates, Playwright e2e, Docker images, release workflow | Coverage thresholds enforced in CI; images build & run |
| **P6** | Observability + docs | OpenTelemetry, Sentry, `/docs` ADRs, CONTRIBUTING, API docs from OpenAPI | Traces visible locally; ADRs merged |

**Optional P7 (product/enterprise):** accounts + cloud resume sync (HTTP StoragePort adapter + DB), org API-key vaulting, audit log. Designed-for in P3/P4 boundaries; not required for "enterprise-grade engineering."

---

## 5. Risks & mitigations
- **Template convergence regressions** → golden-file + compile-in-CI before deleting any copy; convergence from the *evolved backend* versions.
- **Big-bang temptation** → enforce "each phase ships green" gates; never delete a duplicate before its replacement passes tests.
- **TS migration churn** → migrate `packages/*` first (small, pure), then apps; allow `allowJs` during P2.
- **LaTeX/HTML preview can't truly share render code** → share *metadata/registry*, accept two renderers (documented in §3.3).
- **Agent parallelism merge conflicts** → contract-first (P0–P2 serialize the shared surface), worktree isolation, ownership boundaries (see companion doc).

---

## 6. Definition of done (enterprise-grade)
- One schema, one renderer, one ATS engine, one API contract — zero duplication for C1–C4.
- TypeScript + Zod end-to-end; every endpoint validated; no secrets in logs.
- ≥ target coverage with unit + integration + e2e + compile smoke in CI.
- Structured logs, traces, error reporting; Docker images; ADRs and contributing docs.
- `pnpm i && pnpm dev` (or `npm run dev`) still launches the full stack locally with the offline compiler.
