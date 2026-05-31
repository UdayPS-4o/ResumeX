# Resumex — Parallel Subagent Execution Plan

> Companion to [`RESTRUCTURE_PLAN.md`](./RESTRUCTURE_PLAN.md). This doc explains **how to build the restructure with many agents working in parallel** without stepping on each other.

The core idea: **contract-first serialization, then fan-out.** A small set of shared surfaces (schema, contracts, package skeletons) must exist before anything else, because every other workstream imports them. Once those land, most work parallelizes cleanly along package/app boundaries.

---

## 1. Dependency DAG

```
                        ┌──────────────────────────┐
   WAVE 0 (serial)      │ WS-0 Foundation          │  pnpm+turbo, tooling/, CI skeleton,
                        │  (one agent, blocking)   │  empty package/app stubs + tsconfigs
                        └────────────┬─────────────┘
                                     │ (everything depends on this)
                        ┌────────────┴─────────────┐
   WAVE 1 (serial-ish)  │ WS-1 @resumex/core       │  Zod schema + types + diff/merge
                        │  + @resumex/contracts    │  + API DTOs + typed client stub
                        └────────────┬─────────────┘
                                     │ (the shared contract; unblocks fan-out)
        ┌──────────────┬────────────┼────────────┬──────────────┬─────────────┐
 WAVE 2 │ WS-2         │ WS-3       │ WS-4        │ WS-5         │ WS-6        │  (PARALLEL)
 (fan-  │ renderer     │ ats        │ llm         │ api harden   │ web shell   │
  out)  │ (templates   │ (scoring   │ (providers  │ (middleware, │ (router,    │
        │  converge)   │  SSOT)     │  +prompts)  │  config,err) │  stores,Query)│
        └──────┬───────┴─────┬──────┴──────┬──────┴──────┬───────┴──────┬──────┘
               │             │             │             │              │
 WAVE 3        └─────────────┴───────┬─────┴─────────────┴──────────────┘
 (integration)                       │ WS-7 Wire-up: apps import packages, delete dup files
                                     │ WS-8 preview package + component split
                                     ▼
 WAVE 4              WS-9 Test depth + CI/CD + Docker + observability + docs
 (hardening)         (parallel sub-tasks, low conflict)
```

**Why these gates:** WS-0 creates the workspace so packages resolve. WS-1 defines the **types and DTOs every other stream imports** — building it first means WS-2…WS-6 compile against a stable surface and rarely touch the same files.

---

## 2. Workstreams (agent roster)

Each workstream = one agent (some run in their own **git worktree** for isolation). Ownership boundaries are file-path-exclusive to minimize merge conflicts.

| WS | Name | Owns (writes) | Depends on | Parallel? | Isolation |
|----|------|---------------|------------|-----------|-----------|
| **WS-0** | Foundation | root config, `tooling/*`, `turbo.json`, `pnpm-workspace.yaml`, CI skeleton, empty `packages/*` + `apps/*` stubs | — | no (blocking) | main |
| **WS-1** | Core & Contracts | `packages/core/*`, `packages/contracts/*` | WS-0 | no (blocking) | main |
| **WS-2** | Renderer convergence | `packages/renderer/*` | WS-1 | ✅ | worktree |
| **WS-3** | ATS engine | `packages/ats/*` | WS-1 | ✅ | worktree |
| **WS-4** | LLM port + prompts | `packages/llm/*` | WS-1 | ✅ | worktree |
| **WS-5** | API hardening | `apps/api/*` (middleware/config/error/layering) | WS-1 (+ WS-4 iface) | ✅ | worktree |
| **WS-6** | Web shell | `apps/web/app`, `apps/web/stores`, router, Query setup | WS-1 | ✅ | worktree |
| **WS-7** | Integration & dedup | cross-cutting: apps import packages, **delete** all duplicate files (C1–C4) | WS-2..WS-6 | no (barrier) | main |
| **WS-8** | Preview + component split | `packages/preview/*`, `apps/web/features/*`, `components/ui/*` | WS-1, WS-7 | partial | worktree |
| **WS-9** | Test/CI/Docker/Obs/Docs | `**/*.test.ts`, `.github/`, `docker/`, OTel/Sentry wiring, `docs/adr/*` | WS-7, WS-8 | ✅ (sub-tasks) | mixed |

### Conflict-avoidance rules
1. **One owner per path.** No two parallel agents write the same file. Shared edits (e.g. deleting dup files in apps) are deferred to the **WS-7 barrier**.
2. **Append, don't reformat.** Parallel agents don't run repo-wide formatters (that's WS-0's job once).
3. **Contracts are frozen during fan-out.** Changes to `@resumex/core`/`contracts` after WAVE 1 require a short re-sync, not a free-for-all.
4. **Worktrees** for WAVE 2 so each agent has an isolated checkout; WS-7 merges and resolves.

---

## 3. Per-agent briefs (copy-paste scope)

Give each agent the relevant section of `RESTRUCTURE_PLAN.md` plus its acceptance gate.

- **WS-0:** "Set up pnpm workspaces + Turborepo. Create `tooling/{eslint-config,prettier-config,tsconfig}`. Add `pnpm-workspace.yaml`, `turbo.json`, root scripts, Husky+lint-staged, a CI skeleton (`lint/typecheck/test/build`), and **empty buildable stubs** for every `packages/*` and `apps/*` with correct `package.json`/`tsconfig`. Keep `npm run dev` working via the existing apps. DoD: `turbo run build` passes on stubs."
- **WS-1:** "Implement `@resumex/core` (Zod `ResumeSchema` + inferred types, `mergeResume`, diff/patch/card functions ported from `frontend/lib/resume.js`, `zodToJsonSchema` export) and `@resumex/contracts` (Zod DTOs for every endpoint in §3.6, typed fetch client, OpenAPI). Unit-test merge/diff to ≥90%. DoD: packages build & test; types exported."
- **WS-2:** "Build `@resumex/renderer` as the LaTeX SSOT. Converge templates **from the backend copies** (`backend/src/templates/*`, they have `mdTex`/`pageSize`/`sectionTitle` and bug fixes); re-add `executive` from `package/src/templates`. Single `latex.ts`. Golden-file tests + compile-in-CI for every template×{sample,seed}. Do NOT yet delete the old files (WS-7 does). DoD: `renderTemplate(id,resume,opts)` matches current backend output."
- **WS-3:** "Build `@resumex/ats` from `backend/src/services/atsChecks.js` (canonical weights). Table-driven tests per dimension. DoD: parity with current backend scores on fixtures."
- **WS-4:** "Build `@resumex/llm`: `LlmProvider` port, adapters from `backend/providers/*`, `PROVIDERS` registry + key resolution (header/env), prompts from `backend/prompts/*` (keep coach vs import split), and ONE `parseModelJson` (replacing the 3 `parseJsonLoose`). DoD: adapters satisfy the port; prompt outputs unchanged."
- **WS-5:** "Harden `apps/api`: middleware order (requestId→pino→helmet→cors allowlist→json→validate→controller→error mapper), Zod config at boot, `AppError` model + redacting mapper, rate-limit, header-based API keys (body deprecated), SSE disconnect handling. Layer controllers→services→adapters. Use interfaces from WS-1/WS-4 (stub if not merged). DoD: Supertest suite + log-redaction test green."
- **WS-6:** "Stand up `apps/web` shell: React Router routes, `EditorStore` (Zustand), TanStack Query provider + hooks over the WS-1 typed client, top-level error boundary, StoragePort with localStorage adapter + versioned migration. DoD: app boots, navigates, persists; no behavior regressions on the happy path."
- **WS-7 (barrier):** "Integrate: make `apps/*` import `@resumex/*`; **delete** `package/src/{schema,latex,templates/*}`, `backend/src/{schema.js,services/latex.js,services/atsChecks.js,templates/*,providers/*,prompts/*}`, `frontend/lib/{ats.js,api.js}`, and the 3 `parseJsonLoose` copies. Fix all imports. DoD: no duplicate logic remains; full build+test green."
- **WS-8:** "Create `@resumex/preview` (HTML renderer from `frontend/ResumePreview.jsx`, driven by registry meta) and split oversized components per §3.8 into `features/*` + `components/ui/*` (Lucide icons). DoD: no component > ~250 lines; Testing Library suite green."
- **WS-9:** "Raise coverage gates (Vitest), add Playwright e2e (create→chat→compile→export; import→verbatim→optimize), Docker images for api/web + compose, OTel + Sentry wiring, ADRs + CONTRIBUTING + API docs. DoD: CI enforces thresholds; images run."

---

## 4. Two ways to run this

### Option A — Manual orchestration (Agent tool, no opt-in needed)
Drive it yourself across turns, respecting the waves:
1. Run **WS-0** (one agent, `isolation: worktree` not needed — it edits root). Review & merge.
2. Run **WS-1**. Review & merge (this is the contract freeze point).
3. Fan out **WS-2…WS-6** as **parallel** `Agent` calls **in a single message**, each with `isolation: "worktree"`. Collect results.
4. Run **WS-7** on main to integrate and delete duplicates (serial barrier).
5. Run **WS-8**, then **WS-9** (sub-tasks parallel).

Between waves, *you* are the integration gate: run `turbo run lint typecheck test build` before proceeding.

### Option B — Deterministic Workflow (requires explicit opt-in)
This maps exactly onto the `Workflow` tool's pipeline/parallel/barrier primitives. **It will spawn many agents and cost significant tokens, so it only runs if you explicitly ask** (include the word "workflow", or tell me to run it). Sketch:

```js
export const meta = {
  name: 'resumex-enterprise-restructure',
  description: 'Execute the Resumex enterprise restructure across waves of agents',
  phases: [
    { title: 'Wave0 Foundation' }, { title: 'Wave1 Contracts' },
    { title: 'Wave2 Packages+Apps' }, { title: 'Wave3 Integrate' },
    { title: 'Wave4 Harden' },
  ],
};

phase('Wave0 Foundation');
await agent(BRIEF.ws0, { label: 'ws0-foundation' });           // blocking

phase('Wave1 Contracts');
await agent(BRIEF.ws1, { label: 'ws1-core-contracts' });       // blocking (contract freeze)

phase('Wave2 Packages+Apps');                                   // FAN-OUT (barrier: need all before integrate)
const fan = await parallel([
  () => agent(BRIEF.ws2, { label: 'ws2-renderer', isolation: 'worktree' }),
  () => agent(BRIEF.ws3, { label: 'ws3-ats',      isolation: 'worktree' }),
  () => agent(BRIEF.ws4, { label: 'ws4-llm',      isolation: 'worktree' }),
  () => agent(BRIEF.ws5, { label: 'ws5-api',      isolation: 'worktree' }),
  () => agent(BRIEF.ws6, { label: 'ws6-web',      isolation: 'worktree' }),
]);

phase('Wave3 Integrate');                                       // serial barrier
await agent(BRIEF.ws7_integrate_and_dedup, { label: 'ws7-integration' });

phase('Wave4 Harden');
await parallel([
  () => agent(BRIEF.ws8_preview_split, { label: 'ws8-preview', isolation: 'worktree' }),
  () => agent(BRIEF.ws9_ci_tests_docker, { label: 'ws9-cicd' }),
]);
```

> Note: agents mutating files in parallel use `isolation: 'worktree'`; the Wave-3 integration step runs on the trunk to merge and delete duplicates. Each `BRIEF.*` is the corresponding §3 brief plus its acceptance gate.

---

## 5. Integration gates (run between every wave)
- `turbo run lint typecheck test build` — must be green.
- `compile-smoke`: render + Tectonic-compile every template (catches renderer regressions).
- After WS-7: grep for deleted-duplicate symbols to confirm nothing re-imports the old paths.
- After WS-9: Playwright e2e + Docker `up` smoke.

## 6. Rollback
Each workstream is a branch/worktree; a failed wave is discarded without touching trunk. Duplicate files are deleted **only** in WS-7, **after** replacements pass tests — so trunk always has a working renderer/schema until the swap is proven.
