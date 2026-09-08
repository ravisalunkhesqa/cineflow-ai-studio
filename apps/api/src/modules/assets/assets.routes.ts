import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@cineflow/database";
import {
  assertKeyBelongsToProject,
  buildObjectKey,
  deleteObject,
  getDownloadUrl,
  getUploadUrl,
  isMinioConfigured,
  type AssetCategory,
} from "../../lib/storage";

const ASSET_TYPES = [
  "IMAGE",
  "VIDEO",
  "AUDIO",
  "VOICE",
  "MUSIC",
  "SFX",
  "REFERENCE",
  "MASK",
] as const;

// §54: only accept known-safe MIME types per asset type — never trust the client's
// claimed type blindly, and never let an uploaded file masquerade as something it isn't.
const ALLOWED_CONTENT_TYPES: Record<(typeof ASSET_TYPES)[number], string[]> = {
  IMAGE: ["image/png", "image/jpeg", "image/webp"],
  VIDEO: ["video/mp4", "video/webm", "video/quicktime"],
  AUDIO: ["audio/mpeg", "audio/wav", "audio/ogg"],
  VOICE: ["audio/mpeg", "audio/wav", "audio/ogg"],
  MUSIC: ["audio/mpeg", "audio/wav", "audio/ogg"],
  SFX: ["audio/mpeg", "audio/wav", "audio/ogg"],
  REFERENCE: ["image/png", "image/jpeg", "image/webp"],
  MASK: ["image/png"],
};

const RequestUploadSchema = z.object({
  filename: z.string().min(1).max(200),
  type: z.enum(ASSET_TYPES),
  contentType: z.string().min(1).max(100),
});

const ConfirmUploadSchema = z.object({
  storageKey: z.string().min(1).max(500),
  filename: z.string().min(1).max(200),
  type: z.enum(ASSET_TYPES),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  durationMs: z.number().int().nonnegative().optional(),
  source: z.string().max(50).default("upload"),
  prompt: z.string().max(2000).optional(),
  parentAssetId: z.string().optional(),
  tags: z.array(z.string().max(50)).default([]),
});

const UpdateAssetSchema = z.object({
  filename: z.string().min(1).max(200).optional(),
  tags: z.array(z.string().max(50)).optional(),
  approvalStatus: z.enum(["GENERATED", "FAVORITE", "SELECTED", "APPROVED", "ARCHIVED"]).optional(),
});

function requireMinioConfigured(reply: { status: (code: number) => { send: (body: unknown) => unknown } }) {
  if (!isMinioConfigured()) {
    reply.status(503).send({
      error: "STORAGE_NOT_CONFIGURED",
      message:
        "MinIO is not configured. Set MINIO_ROOT_USER and MINIO_ROOT_PASSWORD in .env.local " +
        "and make sure `docker compose up -d` is running, then restart the API.",
    });
    return false;
  }
  return true;
}

export async function assetsRoutes(app: FastifyInstance) {
  // Step 1: client asks for a presigned PUT URL, uploads the file bytes directly to
  // MinIO from the browser — the file body never passes through this API process.
  app.post("/api/projects/:projectId/assets/upload-url", async (req, reply) => {
    if (!requireMinioConfigured(reply)) return;

    const { projectId } = req.params as { projectId: string };
    const parsed = RequestUploadSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: "VALIDATION_ERROR", message: "Invalid upload request.", issues: parsed.error.issues });
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return reply.status(404).send({ error: "NOT_FOUND", message: `No project found with id "${projectId}".` });
    }

    const { filename, type, contentType } = parsed.data;
    if (!ALLOWED_CONTENT_TYPES[type].includes(contentType)) {
      return reply.status(400).send({
        error: "UNSUPPORTED_CONTENT_TYPE",
        message: `"${contentType}" is not an accepted content type for asset type ${type}. Accepted: ${ALLOWED_CONTENT_TYPES[type].join(", ")}.`,
      });
    }

    const storageKey = buildObjectKey(projectId, type as AssetCategory, filename);
    try {
      const uploadUrl = await getUploadUrl(storageKey);
      return reply.send({ uploadUrl, storageKey });
    } catch (err) {
      req.log.error({ err: (err as Error).message }, "failed to presign upload URL");
      return reply.status(502).send({
        error: "STORAGE_ERROR",
        message: "Could not reach MinIO to prepare the upload. Check that docker compose services are running.",
      });
    }
  });

  // Step 2: client confirms the upload succeeded, and the Asset row is created here —
  // never trusts the client's storageKey without checking it's actually scoped to this project.
  app.post("/api/projects/:projectId/assets", async (req, reply) => {
    const { projectId } = req.params as { projectId: string };
    const parsed = ConfirmUploadSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: "VALIDATION_ERROR", message: "Invalid asset payload.", issues: parsed.error.issues });
    }

    try {
      assertKeyBelongsToProject(parsed.data.storageKey, projectId);
    } catch (err) {
      return reply.status(400).send({ error: "INVALID_STORAGE_KEY", message: (err as Error).message });
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return reply.status(404).send({ error: "NOT_FOUND", message: `No project found with id "${projectId}".` });
    }

    const asset = await prisma.asset.create({
      data: { projectId, ...parsed.data },
    });
    return reply.status(201).send({ asset });
  });

  app.get("/api/projects/:projectId/assets", async (req, reply) => {
    const { projectId } = req.params as { projectId: string };
    const { type, favorite } = req.query as { type?: string; favorite?: string };

    const assets = await prisma.asset.findMany({
      where: {
        projectId,
        ...(type ? { type: type as (typeof ASSET_TYPES)[number] } : {}),
        ...(favorite === "true" ? { approvalStatus: "FAVORITE" } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    const withUrls = await Promise.all(
      assets.map(async (asset: { storageKey: string }) => ({
        ...asset,
        downloadUrl: isMinioConfigured() ? await getDownloadUrl(asset.storageKey).catch(() => null) : null,
      })),
    );

    return reply.send({ assets: withUrls });
  });

  app.patch("/api/projects/:projectId/assets/:id", async (req, reply) => {
    const { projectId, id } = req.params as { projectId: string; id: string };
    const parsed = UpdateAssetSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: "VALIDATION_ERROR", message: "Invalid asset update.", issues: parsed.error.issues });
    }

    const asset = await prisma.asset.findFirst({ where: { id, projectId } });
    if (!asset) {
      return reply.status(404).send({ error: "NOT_FOUND", message: `No asset found with id "${id}".` });
    }

    const updated = await prisma.asset.update({ where: { id }, data: parsed.data });
    return reply.send({ asset: updated });
  });

  // Explicit, confirmable delete only (brief §15) — the UI must confirm before calling this.
  app.delete("/api/projects/:projectId/assets/:id", async (req, reply) => {
    const { projectId, id } = req.params as { projectId: string; id: string };
    const asset = await prisma.asset.findFirst({ where: { id, projectId } });
    if (!asset) {
      return reply.status(404).send({ error: "NOT_FOUND", message: `No asset found with id "${id}".` });
    }

    await prisma.asset.delete({ where: { id } });
    // Best-effort object removal — the DB row is the source of truth; a leftover MinIO
    // object with no DB row is safe to ignore/clean up later, but we still try.
    await deleteObject(asset.storageKey).catch((err) =>
      req.log.warn({ err: (err as Error).message }, "failed to remove object from MinIO"),
    );
    return reply.status(204).send();
  });
}
