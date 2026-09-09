import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@cineflow/database";
import { getJobQueue, isQueueConfigured } from "../../lib/queue";
import { getModelRegistry } from "@cineflow/ai-core";

const EnqueueThumbnailSchema = z.object({ assetId: z.string().min(1) });
const EnqueueFrameExtractSchema = z.object({
  assetId: z.string().min(1),
  position: z.enum(["first", "last", "timestamp"]),
  timestampMs: z.number().int().nonnegative().optional(),
});

function requireQueueConfigured(reply: { status: (code: number) => { send: (body: unknown) => unknown } }) {
  if (!isQueueConfigured()) {
    reply.status(503).send({
      error: "QUEUE_NOT_CONFIGURED",
      message: "Redis is not configured. Make sure `docker compose up -d` is running and REDIS_URL is set.",
    });
    return false;
  }
  return true;
}

/** Resolves a project's aspect ratio string (e.g. "16:9", "2.39:1") to pixel dimensions
 * for generation requests, anchored to a base long-edge size. */
function resolveDimensions(aspectRatio: string, baseSize = 768): { width: number; height: number } {
  const [wRatio, hRatio] = aspectRatio.split(":").map(Number);
  if (!wRatio || !hRatio) return { width: baseSize, height: baseSize };
  if (wRatio >= hRatio) {
    return { width: baseSize, height: Math.round((baseSize * hRatio) / wRatio / 2) * 2 };
  }
  return { width: Math.round((baseSize * wRatio) / hRatio / 2) * 2, height: baseSize };
}

export async function jobsRoutes(app: FastifyInstance) {
  // Image/video generation — capability-gated per brief §23/§24: if no configured
  // provider declares IMAGE_OUTPUT/VIDEO_OUTPUT, this returns the exact required
  // message rather than enqueueing anything that could only fail.
  app.post("/api/projects/:projectId/shots/:shotId/generate-image", async (req, reply) => {
    if (!requireQueueConfigured(reply)) return;
    const { projectId, shotId } = req.params as { projectId: string; shotId: string };

    const route = getModelRegistry().resolveForCapability("IMAGE_OUTPUT");
    if (!route) {
      return reply.status(503).send({
        error: "NO_IMAGE_PROVIDER",
        message: "No image-generation provider is configured.",
      });
    }

    const shot = await prisma.shot.findFirst({ where: { id: shotId, projectId }, include: { project: true } });
    if (!shot) {
      return reply.status(404).send({ error: "NOT_FOUND", message: `No shot found with id "${shotId}".` });
    }
    if (shot.status === "LOCKED") {
      return reply.status(409).send({ error: "SHOT_LOCKED", message: "This shot is locked." });
    }
    if (!shot.prompt) {
      return reply.status(400).send({ error: "NO_PROMPT", message: "This shot has no prompt yet." });
    }

    const { width, height } = resolveDimensions(shot.project.aspectRatio);
    const generationJob = await prisma.generationJob.create({
      data: {
        projectId,
        type: "IMAGE_GENERATION",
        status: "QUEUED",
        payload: { shotId, prompt: shot.prompt, negativePrompt: shot.negativePrompt, width, height },
      },
    });
    await getJobQueue().add("IMAGE_GENERATION", {
      generationJobId: generationJob.id,
      projectId,
      type: "IMAGE_GENERATION",
      params: { shotId, prompt: shot.prompt, negativePrompt: shot.negativePrompt, width, height },
    });

    return reply.status(202).send({ job: generationJob, provider: route.definition.displayName });
  });

  app.post("/api/projects/:projectId/shots/:shotId/generate-video", async (req, reply) => {
    if (!requireQueueConfigured(reply)) return;
    const { projectId, shotId } = req.params as { projectId: string; shotId: string };

    const route = getModelRegistry().resolveForCapability("VIDEO_OUTPUT");
    if (!route) {
      return reply.status(503).send({
        error: "NO_VIDEO_PROVIDER",
        message: "No video-generation provider is configured.",
      });
    }

    const shot = await prisma.shot.findFirst({ where: { id: shotId, projectId }, include: { project: true } });
    if (!shot) {
      return reply.status(404).send({ error: "NOT_FOUND", message: `No shot found with id "${shotId}".` });
    }
    if (shot.status === "LOCKED") {
      return reply.status(409).send({ error: "SHOT_LOCKED", message: "This shot is locked." });
    }
    if (!shot.prompt) {
      return reply.status(400).send({ error: "NO_PROMPT", message: "This shot has no prompt yet." });
    }

    const { width, height } = resolveDimensions(shot.project.aspectRatio);
    const durationSeconds = shot.duration ? Math.min(Math.max(shot.duration, 1), 10) : 3;
    const generationJob = await prisma.generationJob.create({
      data: {
        projectId,
        type: "VIDEO_GENERATION",
        status: "QUEUED",
        payload: { shotId, prompt: shot.prompt, negativePrompt: shot.negativePrompt, width, height, durationSeconds },
      },
    });
    await getJobQueue().add("VIDEO_GENERATION", {
      generationJobId: generationJob.id,
      projectId,
      type: "VIDEO_GENERATION",
      params: { shotId, prompt: shot.prompt, negativePrompt: shot.negativePrompt, width, height, durationSeconds },
    });

    return reply.status(202).send({ job: generationJob, provider: route.definition.displayName });
  });

  app.post("/api/projects/:projectId/assets/:assetId/thumbnail", async (req, reply) => {
    if (!requireQueueConfigured(reply)) return;
    const { projectId, assetId } = req.params as { projectId: string; assetId: string };
    const parsed = EnqueueThumbnailSchema.safeParse({ assetId, ...(req.body as object) });
    if (!parsed.success) {
      return reply.status(400).send({ error: "VALIDATION_ERROR", message: "Invalid request.", issues: parsed.error.issues });
    }

    const asset = await prisma.asset.findFirst({ where: { id: assetId, projectId } });
    if (!asset) {
      return reply.status(404).send({ error: "NOT_FOUND", message: `No asset found with id "${assetId}".` });
    }

    const generationJob = await prisma.generationJob.create({
      data: { projectId, type: "THUMBNAIL_GENERATION", status: "QUEUED", payload: { assetId } },
    });
    await getJobQueue().add("THUMBNAIL_GENERATION", {
      generationJobId: generationJob.id,
      projectId,
      type: "THUMBNAIL_GENERATION",
      params: { assetId },
    });

    return reply.status(202).send({ job: generationJob });
  });

  app.post("/api/projects/:projectId/assets/:assetId/extract-frame", async (req, reply) => {
    if (!requireQueueConfigured(reply)) return;
    const { projectId, assetId } = req.params as { projectId: string; assetId: string };
    const parsed = EnqueueFrameExtractSchema.safeParse({ assetId, ...(req.body as object) });
    if (!parsed.success) {
      return reply.status(400).send({ error: "VALIDATION_ERROR", message: "Invalid request.", issues: parsed.error.issues });
    }
    if (parsed.data.position === "timestamp" && parsed.data.timestampMs === undefined) {
      return reply.status(400).send({
        error: "VALIDATION_ERROR",
        message: 'timestampMs is required when position is "timestamp".',
      });
    }

    const asset = await prisma.asset.findFirst({ where: { id: assetId, projectId } });
    if (!asset) {
      return reply.status(404).send({ error: "NOT_FOUND", message: `No asset found with id "${assetId}".` });
    }
    if (asset.type !== "VIDEO") {
      return reply.status(400).send({ error: "INVALID_ASSET_TYPE", message: "Frame extraction requires a VIDEO asset." });
    }

    const { position, timestampMs } = parsed.data;
    const generationJob = await prisma.generationJob.create({
      data: {
        projectId,
        type: "FRAME_EXTRACTION",
        status: "QUEUED",
        payload: { assetId, position, timestampMs },
      },
    });
    await getJobQueue().add("FRAME_EXTRACTION", {
      generationJobId: generationJob.id,
      projectId,
      type: "FRAME_EXTRACTION",
      params: { assetId, position, timestampMs },
    });

    return reply.status(202).send({ job: generationJob });
  });

  app.get("/api/projects/:projectId/jobs", async (req, reply) => {
    const { projectId } = req.params as { projectId: string };
    const jobs = await prisma.generationJob.findMany({
      where: { projectId },
      orderBy: { queuedAt: "desc" },
      take: 50,
    });
    return reply.send({ jobs });
  });

  app.get("/api/jobs/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const job = await prisma.generationJob.findUnique({ where: { id } });
    if (!job) {
      return reply.status(404).send({ error: "NOT_FOUND", message: `No job found with id "${id}".` });
    }
    return reply.send({ job });
  });

  // Cancellation is honest about its limits (brief §82): a still-QUEUED job is removed
  // outright (real cancellation). A job already PROCESSING is running a local ffmpeg
  // child process this MVP doesn't track a kill-handle for, so it does not claim the
  // job was interrupted — it says so explicitly instead of lying about the outcome.
  app.post("/api/jobs/:id/cancel", async (req, reply) => {
    const { id } = req.params as { id: string };
    const job = await prisma.generationJob.findUnique({ where: { id } });
    if (!job) {
      return reply.status(404).send({ error: "NOT_FOUND", message: `No job found with id "${id}".` });
    }

    if (job.status === "QUEUED") {
      const queue = getJobQueue();
      const bullJobs = await queue.getJobs(["waiting", "delayed"]);
      const match = bullJobs.find((j) => j.data.generationJobId === id);
      if (match) await match.remove();
      const updated = await prisma.generationJob.update({
        where: { id },
        data: { status: "CANCELLED", finishedAt: new Date() },
      });
      return reply.send({ job: updated, cancelled: true });
    }

    if (job.status === "PROCESSING") {
      return reply.status(409).send({
        error: "CANNOT_CANCEL_IN_PROGRESS",
        message:
          "This job is already running a local ffmpeg process and cannot be interrupted mid-run in this build. It will finish or fail shortly on its own.",
      });
    }

    return reply.status(409).send({
      error: "ALREADY_FINISHED",
      message: `Job is already ${job.status.toLowerCase()} and cannot be cancelled.`,
    });
  });

  // SSE stream: pushes this project's active/recently-updated jobs every ~1.5s so the
  // browser never has to poll (brief §12/§52). Deliberately DB-driven rather than wired
  // directly to BullMQ's QueueEvents so it behaves the same whether the worker runs
  // in-process or as a separate `pnpm run worker` process.
  app.get("/api/projects/:projectId/jobs/stream", async (req, reply) => {
    const { projectId } = req.params as { projectId: string };

    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    let closed = false;
    req.raw.on("close", () => {
      closed = true;
    });

    while (!closed) {
      const active = await prisma.generationJob.findMany({
        where: { projectId, OR: [{ status: "QUEUED" }, { status: "PROCESSING" }] },
        orderBy: { queuedAt: "desc" },
      });
      const recentlyFinished = await prisma.generationJob.findMany({
        where: {
          projectId,
          status: { in: ["SUCCEEDED", "FAILED", "CANCELLED"] },
          finishedAt: { gte: new Date(Date.now() - 15_000) },
        },
        orderBy: { finishedAt: "desc" },
      });

      reply.raw.write(`data: ${JSON.stringify({ active, recentlyFinished })}\n\n`);
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    reply.raw.end();
  });
}
