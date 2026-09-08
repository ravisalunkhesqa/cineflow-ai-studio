# Media Pipeline

## Status (Phase 6 — storage/upload done; FFmpeg processing still Phase 9)
- Storage: MinIO wired in `apps/api/src/lib/storage.ts`. Bucket layout per §50:
  `projects/{projectId}/{images,videos,audio,references,masks}/{uuid}-{safeFilename}`.
  Postgres (`Asset.storageKey`) stores only the object key, never blobs.
- Upload flow: browser requests a presigned PUT URL from the API, uploads the file
  bytes directly to MinIO (never proxied through the API process), then confirms so
  the `Asset` row is only created after a real object exists.
- Content-type is checked against an allowlist per asset type (§54). Upload size is
  **not yet enforced by a signed policy** — see `docs/IMPLEMENTATION_STATUS.md`
  Phase 6 notes for the known gap and what would close it.
- `frames/`, `exports/`, `thumbnails/` folders from §50 are reserved in the bucket
  layout convention but nothing writes to them yet — that's Phase 9 (FFmpeg).

## Not yet implemented (Phase 9)
- FFmpeg/ffprobe wrapper in `packages/media-engine` (still a stub).
- Frame extraction (§26) as a `FRAME_EXTRACTION` job producing an `Asset` with
  `source: "frame_extraction"` and `parentAssetId` pointing at the source video —
  this is what enables the Shot N → last frame → Shot N+1 reference continuity
  workflow described in §66/§67.
- Automatic thumbnailing (§51) on upload/generation completion.
- All FFmpeg argument arrays must be built by trusted backend code — never
  string-concatenated from raw AI or user input (§54) — when this is implemented.
