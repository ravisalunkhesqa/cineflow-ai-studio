# Windows Local Setup

## Prerequisites

1. **Node.js 20+** — https://nodejs.org (LTS). Verify:
   ```powershell
   node --version
   ```
2. **pnpm** — install once Node is available:
   ```powershell
   npm install -g pnpm
   ```
3. **Docker Desktop** (with WSL2 backend enabled) — https://www.docker.com/products/docker-desktop
   Required for PostgreSQL, Redis, and MinIO. Start Docker Desktop before continuing.
4. **FFmpeg** — download a Windows build (e.g. from https://www.gyan.dev/ffmpeg/builds/),
   extract it, and either:
   - add the `bin` folder (containing `ffmpeg.exe` / `ffprobe.exe`) to your PATH, or
   - set `FFMPEG_PATH` / `FFPROBE_PATH` in `.env.local` to the full `.exe` paths, e.g.
     ```
     FFMPEG_PATH=C:\ffmpeg\bin\ffmpeg.exe
     FFPROBE_PATH=C:\ffmpeg\bin\ffprobe.exe
     ```
   Verify:
   ```powershell
   ffmpeg -version
   ```

## Setup

```powershell
git clone <your-repo-url> cineflow
cd cineflow

copy .env.example .env.local
# Set the provider key for this PowerShell session (do not put it in .env.local):
$env:XTROUTER_API_KEY = "<your key>"

docker compose up -d
# Wait ~10-20 seconds for Postgres/Redis/MinIO healthchecks to pass.
# Check: docker compose ps

pnpm install

pnpm --filter @cineflow/database run generate
pnpm --filter @cineflow/database run migrate
# This creates the initial migration + applies it to the local Postgres container.

pnpm dev
```

- Web UI: http://localhost:3000
- API: http://localhost:4000
- API health check: http://localhost:4000/health
- MinIO console: http://localhost:9001 (login with `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD`
  from `.env.local`)

## Common Windows issues

**"docker: command not found" in PowerShell**
Docker Desktop isn't running or wasn't added to PATH. Reopen Docker Desktop and retry.

**Port already in use (5432 / 6379 / 9000 / 3000 / 4000)**
Another local service (e.g. a native Postgres install) is using the port. Either stop
that service or change the corresponding `*_PORT` value in `.env.local` and
`docker-compose.yml`, then re-run `docker compose up -d`.

**`ffmpeg` not recognized**
PATH wasn't updated in the current terminal session — close and reopen PowerShell after
editing your PATH, or set `FFMPEG_PATH`/`FFPROBE_PATH` explicitly in `.env.local` instead.

**Prisma migrate fails to connect**
Confirm `docker compose ps` shows `postgres` as `healthy`, and that `DATABASE_URL` in
`.env.local` matches the `POSTGRES_*` values in the same file.

**Long paths / permission errors during `pnpm install`**
Enable long path support in Windows (`git config --system core.longpaths true`), or
clone the repo closer to the drive root (e.g. `C:\dev\cineflow`) to avoid MAX_PATH
issues with deeply nested `node_modules`.
