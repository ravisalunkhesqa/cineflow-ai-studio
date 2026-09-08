# Testing (baseline — Phase 0/1)

- `apps/api`: Vitest configured (`pnpm --filter @cineflow/api test`). Baseline smoke
  test covers the health endpoint status mapping.
- `apps/web`: no component tests yet (Phase 14).
- Playwright E2E, provider mocking for CI, and unit tests for ModelRouter /
  ContextAssembler / PromptComposer / continuity rules are all planned for Phase 14,
  once those modules exist (Phase 4/11).

Tests must never depend on a live/paid XKiro API call — provider tests will use a
`MockProvider` implementing the `AIProvider` interface once Phase 4 lands.
