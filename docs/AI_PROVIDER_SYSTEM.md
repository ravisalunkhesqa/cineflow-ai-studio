# AI Provider System

See `docs/ARCHITECTURE.md` for the request flow diagram.

## Key files
- `packages/provider-sdk/src/ai-provider.ts` — the `AIProvider` interface contract.
- `packages/shared/src/capabilities.ts` — the `Capability` and `TaskType` enums.
- `packages/config/src/model-registry.seed.ts` — data-driven provider/model list.

## Rules (enforced by review, not yet by a lint rule)
1. No model ID string literal may appear inside `apps/api` or `apps/web` business logic —
   always resolve through the Model Registry / ModelRouter (Phase 4).
2. A capability may only be set `true` after being verified against a real XKiro API
   response or documented behavior. Until then it stays `false`, even if the model name
   implies support (e.g. "omni").
3. Adapters implement only the `AIProvider` methods they actually support. Unsupported
   calls throw `ProviderCapabilityError` — the UI is expected to disable the action and
   explain why (e.g. "No image-generation provider is configured.").
4. `XTROUTER_API_KEY` is read only in `apps/api` server code, never sent to the browser.

## Status (Phase 4 — done)
`XKiroProvider` (`chat()` only — TEXT/JSON_MODE), `ModelRegistry`, `ModelRouter` (AUTO
vs manual selection + fallback, §81), `ContextAssembler` (§48), and read-only Flow
Agent tools (§84) are implemented in `packages/ai-core`. **The XKiroProvider response
shape is unverified against a live API call** — see the file header in
`packages/ai-core/src/providers/xkiro-provider.ts`.

## Not yet implemented
`PromptComposer` (§21, Phase 5), Flow Agent write tools + propose/validate/preview/
accept pipeline (§83/§84, needs UI from a later phase), image/video provider adapters
(Phase 8).
