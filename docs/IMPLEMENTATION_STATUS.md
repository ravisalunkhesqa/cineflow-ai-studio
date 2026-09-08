# Implementation Status

_Last updated: end of this build session (Phase 0, Phase 1 foundational slice, Phase 2, Phase 3, Phase 4, Phase 5, Phase 6)._

## Completed — Phase 6 (this session)

- Schema: added `LocationReference` (mirrors `CharacterReference`) so Location, like
  Character, links to real uploaded `Asset` rows rather than freeform text — safe to
  add since no migration had been applied anywhere yet.
- `apps/api/src/lib/storage.ts` — MinIO client wrapper: presigned PUT/GET URLs, bucket
  layout per §50 (`projects/{projectId}/{images,videos,audio,references,masks}/...`),
  and two defensive helpers that matter for §54: `sanitizeFilename` (strips directory
  components so a malicious filename can't path-traverse) and
  `assertKeyBelongsToProject` (rejects a client-supplied storageKey that doesn't
  actually belong to the claimed project — closes off cross-project asset forgery).
  **Unit tested (8/8 passing)**, including explicit path-traversal and forged-key cases.
- `apps/api/src/modules/assets/assets.routes.ts` — two-step upload flow: the client
  requests a presigned URL, uploads the file bytes **directly to MinIO** (never through
  this API process), then confirms so the `Asset` row is created only after a real
  object exists. Content-type is checked against an allowlist per asset type. List
  endpoint attaches a fresh presigned download URL to each asset. Delete is DB-first,
  then best-effort MinIO cleanup (never blocks on storage errors) — always explicit,
  never silent, per §15.
- Reference endpoints added to `characters.routes.ts` / `locations.routes.ts` —
  attach/detach an already-uploaded `Asset` to a `CharacterReference`/`LocationReference`.
- `apps/web`:
  - `/project/[id]/assets` is now real (was a disabled tab) — grid view, upload,
    type filters, Favorite/Approve/Archive/Delete actions (§29/§65), image thumbnails
    rendered from presigned URLs.
  - Character Studio's "pending Phase 6" placeholder is now a real 6-slot reference
    grid (FRONT/PROFILE/3-4/FULL BODY/COSTUME/EXPRESSION per §17) with per-slot upload
    and delete.
  - Location Studio's placeholder is now a real reference grid (§18).
  - `uploadFile()` in `api-client.ts` handles the full flow: request URL → PUT to
    MinIO → read image dimensions client-side → confirm.

**Known limitation carried forward honestly**: file size limits are enforced by MIME
allowlist only, not by a signed-URL policy — minio-js's basic `presignedPutObject`
doesn't include a conditions API in this setup, so a client could technically PUT an
oversized file. Documented here rather than silently left as a gap; worth revisiting
with a reverse proxy size cap or multipart-policy signing if this matters before real
use.

## Completed — Phase 5 (this session)

- `packages/shared/src/prompt.ts` — `StructuredPromptSchema` (Zod), shared between
  API validation and the web form so both sides of `POST .../prompt/compose` agree on
  shape without duplicating the field list (§21: Subject/Action/Environment/
  Composition/Camera/Lens/Camera Movement/Lighting/Color/Atmosphere/Style/Continuity/
  Audio/Negative Prompt).
- `packages/ai-core/src/prompt/prompt-composer.ts`:
  - `composeRawPrompt()` — deterministic structured→raw join, works offline with zero
    AI provider configured (this is the mechanical half of §21, not an AI call).
  - `enhancePrompt()` — AI-assisted: turns a short idea + shot context into structured
    fields via the `PROMPT_ENHANCEMENT` task (routes to Mistral Medium 3.5, which has
    `JSON_MODE`). Validates the model's JSON with the shared Zod schema and does
    **exactly one repair pass** before failing loudly (§49 — never trusts arbitrary
    LLM JSON). **Unit tested (4/4 passing)** for the deterministic composition path;
    the AI path is untestable without a live provider in this sandbox.
  - `assembleShotContext()` added to `ContextAssembler` — a tighter, shot-scoped
    context (scene, locked style, only the characters/locations *this shot*
    references) than the project-wide Flow Agent context, per §48.
- `apps/api`: `POST /api/projects/:id/shots/:shotId/prompt/compose` (deterministic) and
  `.../prompt/enhance` (AI-assisted). Enhance never writes to the Shot directly — it
  returns a proposal, persists a `Prompt` row for traceability, and the client decides
  whether to apply it (§83 propose → preview → accept, not a direct AI write). Refuses
  with 409 if the shot is `LOCKED`.
- `apps/web`: replaced the storyboard's plain Prompt/Negative Prompt textareas with a
  `PromptComposerPanel` — RAW/STRUCTURED toggle, an idea input with a visible
  "proposed by {model} — review before applying" step before anything is written, a
  small Prompt Templates picker (§47, simplified to preset field values rather than a
  full template-management UI), and `@mention` autocomplete (`MentionTextarea`) reading
  the project's actual Character/Location tags — typing `@` suggests real `@tag`s, it
  doesn't just accept arbitrary text.

**Deliberately deferred**: full Prompt Templates CRUD/sharing (§47 as originally
scoped) — the picker here is 5 hard-coded starter presets, not user-authored/saved
templates; that's a reasonable Phase-13-polish item rather than a blocker.

## Completed — Phase 4

- `packages/ai-core`:
  - `XKiroProvider` implementing `AIProvider.chat()` against `${XKIRO_BASE_URL}/chat/completions`
    with AbortController timeouts, retry-on-5xx-only (never retries 4xx), and structured
    error mapping to `CONNECTED / AUTH_ERROR / RATE_LIMITED / MODEL_UNAVAILABLE / NETWORK_ERROR`.
    **Unverified against a live response** — see the file header in
    `packages/ai-core/src/providers/xkiro-provider.ts` for exactly what's assumed
    (OpenAI-compatible `choices[0].message.content` shape) and what to check first.
    Only `TEXT`/`JSON_MODE` are implemented; `generateImage`/`generateVideo`/etc. are
    correctly absent, not stubbed.
  - `ModelRegistry` — turns `packages/config` + `XTROUTER_API_KEY` into live provider
    instances; a provider with no API key is simply left unregistered (not silently
    faked). **Unit tested (7/7 passing)**, including a regression test asserting the
    omni model's `VIDEO_OUTPUT` capability stays `false`.
  - `ModelRouter` — AUTO vs manual model selection, throws clear errors instead of
    silently substituting a model (§81).
  - `ContextAssembler` (`assembleProjectContext`) — compact project system prompt
    (story, locked style bible, character/location `@tag` list, scene/shot counts)
    instead of dumping the whole project (§48).
  - Flow Agent **read-only** tool functions (§84) — `getProject`/`getScenes`/`getShot`/
    `getCharacter`/`getLocation`/`getStyleBible`/`searchAssets`. Write tools
    (`updateShot`, `reorderShots`, ...) are deliberately not implemented yet — see the
    file header in `packages/ai-core/src/agent/tools.ts` for why (no propose → validate
    → preview → accept pipeline exists yet to gate them, per §83).
- `apps/api`: `GET /api/models` (provider/model list with `configured` flags),
  `POST /api/models/test-connection` (§45 TEST CONNECTION), and Flow Agent v0 routes
  (`GET`/`POST /api/projects/:id/agent/messages`) — single auto-created conversation
  per project, grounded by `ContextAssembler`, persists both sides of the exchange even
  if the provider call fails.
- `apps/web`:
  - `/settings/models` is now a real page (was a placeholder) — provider cards with
    Test Connection, per-model capability chips, default-task labels.
  - Flow Agent right-side collapsible panel (§13), wired into every `/project/[id]/*`
    page via a new `ProjectShell` client wrapper. Clearly states it's read-only in the
    empty state.

**Manual verification still needed on your machine**: with `XTROUTER_API_KEY` set,
open Settings → AI Models and click Test Connection, then open a project and try Flow
Agent. If the response shape assumption above is wrong, `chat()` will throw a
`MODEL_UNAVAILABLE`-style error naming the exact file to fix rather than returning
garbage — report back what the raw response looks like and the parser can be corrected
in one place.

## Completed — Phase 3

- `apps/api`: `scenes` module (CRUD, location-reference validation, cascade delete with
  explicit confirm required client-side) and `shots` module — full Shot field set from
  §42 (camera size/angle/movement, lens, DOF, lighting/mood/color grade, prompt/negative
  prompt, character/location/prop reference arrays, status), plus:
  - `POST /shots/:id/duplicate` — clones a shot into the same scene as `DRAFT`, appended
    at the end (never copies `selectedImageAssetId`/`selectedVideoAssetId`/status).
  - `POST /shots/reorder` — takes the full ordered `shotIds` for one scene and
    renumbers 1..N server-side in a transaction; rejects any list that doesn't exactly
    match the scene's current shots (no silent partial reorders).
  - **Shot Lock enforcement is server-side, not just UI**: a `LOCKED` shot rejects any
    `PATCH` touching fields other than `status` with `409 SHOT_LOCKED` (brief §64).
- `apps/web`:
  - `/project/[id]/scenes` — scene list + create/edit form (scene number, INT/EXT, time,
    location picker sourced from real Location data, duration, description, notes),
    delete-with-confirm (cascades to shots, confirmed client-side first).
  - `/project/[id]/storyboard` — card-based film board (§16): a draggable horizontal
    shot strip (`@dnd-kit`) per scene with live reorder persisted via `POST /shots/reorder`
    (optimistic UI, rolls back on error), Add Shot, Duplicate, Delete. Detail panel below
    the strip exposes the full Virtual Camera Controls set from §22 (shot size, angle,
    movement, lens, depth of field — all from the brief's exact option lists), lighting/
    mood/color grade, `@character` toggle chips backed by real Character tags, a location
    picker, prompt/negative prompt fields, and a status selector. **Generate Image /
    Generate Video buttons are present but disabled** with an explicit "no provider
    configured" tooltip — per §23, no fake output — until Phase 4/8 wire up a real
    provider.
  - Scenes/Storyboard tabs enabled in `ProjectTabs`; Timeline/Assets/Workflows remain
    disabled.

## Completed — Phase 2

- `apps/api`: `characters`, `locations`, `style-bible` route modules — full CRUD for
  Character and Location (§17/§18, tag validation, tag-uniqueness-per-project, explicit
  confirm-before-delete semantics), get/update for the singleton StyleBible per project
  including the `locked` flag (§20 LOCK STYLE — locked style rejects further edits with
  409 `STYLE_LOCKED` until unlocked).
- `apps/web`: project-scoped route group `/project/[id]/*` with a sub-nav (`ProjectTabs`)
  — Overview, Characters, Locations, Style Bible are live; Scenes/Storyboard/Timeline/
  Assets/Workflows show as disabled tabs until their phases land.
  - `/project/[id]` — overview cards linking into each sub-area.
  - `/project/[id]/characters` — list + full create/edit form (all §17 fields, tag
    input, Character Lock toggle, delete-with-confirm). Reference-image upload UI is
    explicitly marked pending Phase 6 (MinIO) rather than faked.
  - `/project/[id]/locations` — same pattern for Location (§18 fields).
  - `/project/[id]/style` — Style Bible form with LOCK STYLE toggle and negative
    constraints editor (§20/§86); fields disable when locked.
- `/projects` — real "all projects" list (not a placeholder).
- Dashboard project cards and new-project flow now navigate into the created/opened
  project instead of just refreshing a flat list.
- Remaining sidebar destinations (`/assets`, `/characters`, `/locations`, `/styles`,
  `/workflows`, `/settings/models`, `/settings/general`) now render an explicit
  "not implemented yet — planned for Phase N" screen instead of 404ing, so the shell
  from §10 is fully navigable even before later phases land.

## Completed — Phase 0 / Phase 1 foundation

- Monorepo scaffolded: pnpm workspaces, root TypeScript/ESLint/Prettier config, `.gitignore`.
- `docker-compose.yml` for Postgres 16, Redis 7, MinIO, with healthchecks.
- `.env.example` covering XKiro, DB, Redis, MinIO, FFmpeg, privacy default.
- `@cineflow/database`: full normalized Prisma schema (28 models, 7 enums) per brief §41/§42.
- `@cineflow/shared`: capability/task-type enums, Zod schemas for health + model registry — **unit tested, passing**.
- `@cineflow/config`: data-driven model registry seed for the 6 initial XKiro models, with capabilities set conservatively (no VIDEO_OUTPUT/VISION claimed until verified).
- `@cineflow/provider-sdk`: `AIProvider` interface contract + `ProviderCapabilityError`.
- `apps/api` (Fastify): structured/redacted logging, `GET /health` (checks DB/Redis/MinIO/FFmpeg independently), `GET/POST /api/projects`, `GET /api/projects/:id`, central error handler, CORS locked to local web origin, startup validation log.
- `apps/web` (Next.js 14 + Tailwind): cinematic dark theme tokens, Sidebar + Topbar shell, Dashboard page with 9 project templates (§11) wired to `POST /api/projects`, and a Recent Projects grid wired to `GET /api/projects`.
- Docs: README, SETUP_WINDOWS, ARCHITECTURE, DATA_MODEL, AI_PROVIDER_SYSTEM, MEDIA_PIPELINE, WORKFLOW_ENGINE, SECURITY, DEVELOPMENT, TESTING, IMPLEMENTATION_PLAN, this file.
- Placeholder packages (`ai-core`, `media-engine`, `workflow-engine`) scaffolded with README explaining their future scope so `apps/api` doesn't need restructuring later.

## Test / build results (run in this session's sandbox)

| Package | Lint | Typecheck | Build | Test |
|---|---|---|---|---|
| `@cineflow/shared` | ✅ pass | ✅ pass | ✅ pass | ✅ 6/6 tests pass |
| `@cineflow/config` | ✅ pass | ✅ pass | ✅ pass | n/a (no logic yet) |
| `@cineflow/provider-sdk` | ✅ pass | ✅ pass | ✅ pass | n/a (interface only) |
| `@cineflow/ai-core` | ✅ pass | blocked* (only via `context`/`agent`/`prompt` modules importing `@cineflow/database`) | not run | ✅ 11/11 tests pass (`ModelRegistry`/`ModelRouter`/`composeRawPrompt`, isolated from DB-dependent modules) |
| `apps/web` | ✅ pass (0 warnings, 17 routes) | ✅ pass | ✅ `next build` succeeds | n/a (Phase 14) |
| `@cineflow/database` | not run | blocked* | blocked* | n/a |
| `apps/api` | not run** | blocked* (only the known missing-generated-client error; all route modules through Phase 6 introduced no new type errors after fixes) | blocked* | `storage.test.ts` (pure logic, no DB import) ✅ 8/8 pass; DB-dependent tests still blocked* |

\* **Blocked by this sandbox's network allowlist, not a code defect.** `prisma generate`
needs to download the query engine binary from `binaries.prisma.sh`, which isn't in this
container's allowed domain list. `apps/api` imports `@cineflow/database`, whose generated
Prisma client therefore doesn't exist here, so anything downstream fails to type-check/build/test
in-sandbox. This is a completely standard, first-time Prisma setup step — on your machine,
`pnpm --filter @cineflow/database run generate` (listed first in `SETUP_WINDOWS.md`) will
succeed normally with regular internet access, and everything downstream should then pass.

\** API lint wasn't run standalone for the same reason (ESLint would trip over the same
missing types when parsing files that import `@cineflow/database`); the one real bug this
process *did* catch — an invalid Fastify constructor option (`loggerInstance` → `logger`) —
was found via typecheck and fixed.

## Known limitations

- `apps/api` and `@cineflow/database` are unverified end-to-end in this environment (see
  above). Please run `SETUP_WINDOWS.md` step-by-step on first checkout and report any
  errors — the architecture has been reviewed but not executed against live Postgres.
- No AI provider is actually wired up yet (`XKiroProvider` doesn't exist). The Model
  Registry config exists; nothing calls it yet. `Generate` actions anywhere in the UI
  would need Phase 4 before they do anything.
- No file uploads, no MinIO wiring, no asset library UI yet (Phase 6).
- No BullMQ workers — `GenerationJob` rows can be created via schema but nothing
  processes them yet (Phase 7).
- Storyboard supports Add Shot (appends) and drag-to-reorder, but not yet the explicit
  "Add Before / Add After a specific shot" actions from §16 — reordering after Add Shot
  covers the same outcome today; a dedicated insert-at-position action is a small
  follow-up once this pattern is reused for Scenes too.
- Only Overview/Characters/Locations/Style Bible/Scenes/Storyboard exist. Timeline/
  Assets/Workflows routes are in the sidebar but not yet implemented (Phase 9/6/10).
- Playwright E2E and Vitest coverage beyond the two baseline suites above are Phase 14.

## Next implementation phase

**Phase 7 — Generation job infrastructure (BullMQ).** Suggested first slice:
- Wire `ioredis`/BullMQ workers for the job types already enumerated in
  `packages/shared/src/capabilities.ts` (`JOB_TYPES`) and modeled in the `GenerationJob`
  table: start with `THUMBNAIL_GENERATION` and `FRAME_EXTRACTION` since Phase 6 gave
  you real uploaded video/image assets to test against, and both are useful before any
  image/video AI provider exists.
- `POST /api/jobs` (or per-feature endpoints) to enqueue, `GET /api/jobs/:id` to poll
  status, and an SSE or WebSocket endpoint so the browser doesn't have to poll — the
  brief is explicit that the UI must never freeze while a job runs (§12).
- A small `apps/worker` process (or a worker entrypoint inside `apps/api`) that
  consumes the queue; keep it separate enough that it can scale independently later.
- Once job infra exists, Phase 8 (image/video provider-capability architecture) has
  somewhere real to report progress — don't build Phase 8's provider adapters before
  this, since every one of them will need to report through the same job/queue path.

**Carried-forward flags to resolve before relying on any of this in production use**:
- `@mention` in the Prompt Composer still inserts plain text, not resolved internal
  IDs — deferred again to Phase 8's generation-request assembly (see Phase 6 notes
  above).
- MinIO upload size limits are MIME-allowlist-only, not policy-enforced (see Phase 6
  notes above) — revisit if oversized uploads become a real concern.
- **`XKiroProvider`'s response-shape assumption is still unverified** against a live
  call — please confirm this on your machine before Phase 7 wires up jobs that will
  eventually call it for image/video prompts.
