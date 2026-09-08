# Development

```bash
git clone <repo>
cd cineflow
cp .env.example .env.local     # fill in XTROUTER_API_KEY
docker compose up -d           # postgres, redis, minio
pnpm install
pnpm --filter @cineflow/database run generate
pnpm --filter @cineflow/database run migrate
pnpm dev                       # runs apps/web + apps/api in parallel
```

Web: http://localhost:3000
API: http://localhost:4000  (health: http://localhost:4000/health)

## Conventions
- Strict TypeScript everywhere (`tsconfig.base.json`), no unjustified `any`.
- Route/business logic lives in per-domain modules (`apps/api/src/modules/*`), never
  one giant file.
- Cross-cutting types/enums live in `packages/shared` — import them, don't redefine.
- Zod validates every external input (HTTP body, LLM JSON) before it touches Prisma.
