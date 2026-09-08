# Architecture

## Overview
CineFlow AI Studio is a local-first, TypeScript monorepo. The browser never
talks to the XKiro API directly — every AI request is proxied through the
Fastify API (`apps/api`), which is the only process holding
`XTROUTER_API_KEY`.

```
Browser (apps/web, Next.js)
   │  fetch("/api/backend/...")  — same-origin, rewritten by next.config.mjs
   ▼
Fastify API (apps/api)
   │  Prisma ──► PostgreSQL
   │  ioredis ──► Redis (BullMQ queues, Phase 7)
   │  minio ──► MinIO (media storage, Phase 6)
   │  AIProvider (packages/provider-sdk) ──► XKiro HTTPS API (Phase 4)
   ▼
docker-compose services (postgres / redis / minio)
```

## Provider abstraction
`packages/provider-sdk` defines `AIProvider`: a fixed contract every adapter
(XKiroProvider now; GoogleProvider/RunwayProvider/ElevenLabsProvider later)
implements. Optional methods (`generateImage`, `generateVideo`, ...) are
capability-gated — callers must check the Model Registry before calling them,
and calling an unsupported method throws `ProviderCapabilityError` instead of
silently failing.

## Model Registry
`packages/config/src/model-registry.seed.ts` is the single source of truth
for which provider/model pairs exist and what they can do. Application code
never hard-codes a model string — it asks the (Phase 4) `ModelRegistry`
service for "the default model for task X" or lets the user pick manually.

## Data model
See `docs/DATA_MODEL.md`.

## Job architecture (planned)
Long-running AI/media work becomes a `GenerationJob` row + a BullMQ job.
Workers report progress; the browser subscribes via SSE/WebSocket so the UI
never blocks on video generation.
