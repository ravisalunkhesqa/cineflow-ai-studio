# CineFlow AI Studio

**Imagine. Direct. Generate. Edit.**

A local-first AI creative studio and filmmaking platform: idea → story → script →
characters → storyboard → shots → images → video → audio → timeline → export, in one
workspace, running on your own machine.

> **Status:** Phase 0 (architecture/repo setup) and the foundational slice of Phase 1
> (project system + dashboard) are implemented. See `docs/IMPLEMENTATION_STATUS.md` for
> exactly what works today and `docs/IMPLEMENTATION_PLAN.md` for the full roadmap.

## Quick start (Windows)

See **[`SETUP_WINDOWS.md`](./SETUP_WINDOWS.md)** for exact, copy-pasteable steps.

```bash
git clone <repo>
cd cineflow
cp .env.example .env.local   # set XTROUTER_API_KEY
docker compose up -d
pnpm install
pnpm --filter @cineflow/database run generate
pnpm --filter @cineflow/database run migrate
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:4000/health

## Monorepo layout

```
apps/
  web/     Next.js + Tailwind — cinematic dark UI
  api/     Fastify backend — the only process that talks to the XKiro API
packages/
  shared/          types, capability enum, Zod schemas
  database/        Prisma schema + client
  config/          data-driven model registry (no hard-coded model names in app code)
  provider-sdk/    AIProvider interface every provider adapter implements
  ai-core/         (Phase 4) ModelRouter, ContextAssembler, PromptComposer, Flow Agent
  media-engine/    (Phase 9) FFmpeg wrapper
  workflow-engine/ (Phase 10) workflow JSON schema + validator
docs/              architecture, data model, security, testing, plan/status
```

## Documentation

- [`docs/IMPLEMENTATION_PLAN.md`](./docs/IMPLEMENTATION_PLAN.md) — full phased roadmap
- [`docs/IMPLEMENTATION_STATUS.md`](./docs/IMPLEMENTATION_STATUS.md) — what's done vs. pending
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)
- [`docs/DATA_MODEL.md`](./docs/DATA_MODEL.md)
- [`docs/AI_PROVIDER_SYSTEM.md`](./docs/AI_PROVIDER_SYSTEM.md)
- [`docs/SECURITY.md`](./docs/SECURITY.md)
- [`docs/DEVELOPMENT.md`](./docs/DEVELOPMENT.md)
- [`docs/TESTING.md`](./docs/TESTING.md)

## Core rules this codebase follows

- API keys never reach the browser; all AI calls proxy through `apps/api`.
- No model name is ever hard-coded in application logic — see `packages/config`.
- A provider capability (e.g. `VIDEO_OUTPUT`) is only marked supported once verified
  against a real API response — never assumed from a model's name.
- The full project is never dumped into one JSON blob — see `docs/DATA_MODEL.md`.
