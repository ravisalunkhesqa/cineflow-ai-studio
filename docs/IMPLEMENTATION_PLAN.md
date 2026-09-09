# CineFlow AI Studio — Implementation Plan

## Repo assessment (start of this session)
Repository was empty. No existing code to reuse — this is a from-scratch monorepo.

## Target architecture
TypeScript-first pnpm monorepo:

```
apps/
  web/    Next.js 14 App Router, Tailwind, cinematic dark UI shell
  api/    Fastify (chosen over NestJS for a leaner, faster-to-scaffold modular
          backend that still supports clean route modules — see ADR below)
packages/
  shared/          Cross-cutting types, capability enum, Zod schemas
  database/        Prisma schema + client singleton
  config/          Data-driven Model Registry seed (no model names hard-coded in app code)
  provider-sdk/    AIProvider interface contract
  ai-core/         (Phase 4) ModelRouter, ContextAssembler, PromptComposer, XKiroProvider, Flow Agent tools
  media-engine/    (Phase 9) FFmpeg wrapper
  workflow-engine/ (Phase 10) Workflow JSON schema + validator/executor
infra/docker/
docs/
```

### ADR: Fastify over NestJS
The brief allows either. Fastify was chosen for Phase 0/1 because it scaffolds
faster with fewer decorators/boilerplate while still supporting the same
modular-route, dependency-injected-provider architecture the brief requires.
Route modules (`modules/health`, `modules/projects`, …) mirror what a NestJS
module structure would look like, so migrating later is a mechanical change
if the team prefers Nest's DI container.

## Database entities (implemented)
Full Prisma schema created per brief §41/§42: LocalProfile, Project,
ProjectSettings, Story, Script, StyleBible, Character, CharacterReference,
Location, Prop, Scene, Shot, Asset, Prompt, ModelProvider, ModelDefinition,
Generation, GenerationJob, Timeline, TimelineTrack, TimelineClip, Workflow,
WorkflowNode, WorkflowEdge, Conversation, ConversationMessage, AppSetting.
All relations are real foreign keys; JSON columns are used only for flexible
AI metadata (structured prompts, workflow definitions, generation parameters).

## API modules (Phase 0/1 implemented)
- `GET /health` — checks API, Postgres, Redis, MinIO, FFmpeg independently
- `GET /api/projects`, `POST /api/projects`, `GET /api/projects/:id`

## Frontend modules (Phase 0/1 implemented)
- App shell: Sidebar + Topbar + content area (cinematic dark theme)
- Dashboard: New Project (9 templates from §11), Recent Projects grid

## Provider system (interface only — Phase 0/1)
`AIProvider` interface defined in `packages/provider-sdk`. Capability-gated
methods (chat is required; generateImage/generateVideo/etc. are optional and
throw `ProviderCapabilityError` if called without being implemented).
`packages/config` holds the seeded Model Registry for the six XKiro models —
capabilities are set conservatively; VIDEO_OUTPUT/VISION are left disabled
for any model whose multimodal support hasn't been verified against a real
API response, per brief rule #6/#7.

**Not yet implemented (Phase 4):** actual `XKiroProvider` HTTP client,
`ModelRouter` task→model selection, `ContextAssembler`, `PromptComposer`,
Flow Agent tool system.

## Job architecture (planned — Phase 7)
BullMQ workers per job type (`AI_TEXT`, `IMAGE_GENERATION`, `VIDEO_GENERATION`,
`AUDIO_GENERATION`, `FRAME_EXTRACTION`, `THUMBNAIL_GENERATION`, `VIDEO_EXPORT`,
`WORKFLOW_EXECUTION`), status pushed to the browser via SSE/WebSocket. Schema
for `GenerationJob` already exists in Prisma; queue wiring is not yet built.

## Media pipeline (planned — Phase 9)
`@cineflow/media-engine` will wrap FFmpeg/ffprobe for thumbnailing, frame
extraction, and timeline render/export. FFmpeg args will always be built by
trusted backend code, never concatenated from raw AI/user strings (§54).

## Implementation phases (from brief §76)
| Phase | Scope | Status |
|---|---|---|
| 0 | Architecture + repo setup | **Done** |
| 1 | Project system + database + dashboard (foundational slice) | **Done** |
| 2 | Characters + locations + style bible (full UI) | **Done** |
| 3 | Scenes + shots + storyboard | **Done** |
| 4 | XKiro provider + Model Registry service + Flow Agent | **Done** |
| 5 | Prompt Composer + cinematography controls | **Done** |
| 6 | Asset library + uploads + MinIO wiring | **Done** |
| 7 | Generation job infrastructure (BullMQ) | **Done** |
| 8 | Image/video provider-capability architecture | **Done** |
| 9 | Timeline + FFmpeg | Pending (next) |
| 10 | Workflow builder (React Flow) | Pending |
| 11 | Continuity engine | Pending |
| 12 | Audio architecture | Pending |
| 13 | Export + polish | Pending |
| 14 | Automated testing + documentation | Partial (baseline only) |

## Risks
- **XKiro API surface is unverified.** No live API docs were available this
  session; the provider client, streaming support, and true model
  capabilities must be confirmed against real responses before Phase 4 marks
  anything beyond TEXT as supported.
- **This container cannot run Docker/Postgres/Redis/MinIO.** The code was
  written and structurally validated (types, schema) but full end-to-end
  `docker compose up -d && pnpm dev` has not been executed against live
  infrastructure — you'll do that first run on your Windows machine.
- **NestJS vs Fastify** — documented as an explicit deviation above; flag if
  you'd prefer Nest's DI conventions before Phase 2.

## Assumptions
- Local-only, single-user (`LocalProfile`) for now; multi-user/collaboration
  is explicitly deferred per brief §88.
- MP4/H.264 export only for the MVP, per brief §37.
- Windows is the primary target OS; `SETUP_WINDOWS.md` covers exact steps.
