# Security

Implemented in Phase 0/1/6:
- Secrets (`XTROUTER_API_KEY`, DB/MinIO credentials) live only in `.env.local` /
  `apps/api` process env — never sent to the browser, never logged (`apps/api/src/lib/logger.ts`
  redacts `authorization`, `*apiKey*`, `*token*` paths).
- CORS restricted to the local web origin (`apps/api/src/server.ts`).
- Central error handler never leaks stack traces to the client.
- Zod validation on all mutating routes.
- Upload MIME-type validation against an explicit allowlist per asset type
  (`apps/api/src/modules/assets/assets.routes.ts`).
- Path-traversal protection on uploads: `sanitizeFilename` strips directory
  components before building the storage key, and `assertKeyBelongsToProject`
  rejects any client-supplied `storageKey` that doesn't actually belong to the
  claimed project — both unit tested (`apps/api/src/lib/__tests__/storage.test.ts`).
- The browser never talks to MinIO's admin API — it only receives short-lived
  presigned PUT/GET URLs scoped to one object.

Known gap (see `docs/IMPLEMENTATION_STATUS.md` Phase 6 notes): upload size is
enforced only by client-side expectations, not a signed-URL policy — a determined
client could PUT an oversized file. Worth a reverse-proxy body-size cap or
multipart-policy signing before this matters for real use.

Planned for later phases:
- FFmpeg argument construction restricted to trusted backend code paths (Phase 9).
- Workflow engine input validation against a strict schema, no arbitrary shell
  execution (Phase 10).
- Prompt length limits and request timeouts on the AI proxy endpoints — partially
  done (Zod `max()` on prompt/idea inputs since Phase 5), full audit still Phase 4/7.
- Rate limiting on `/api/*` (Phase 7, alongside job infra).
