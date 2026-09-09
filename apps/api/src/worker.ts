import { Worker, type Job } from "bullmq";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prisma } from "@cineflow/database";
import { generateThumbnail, extractFrame, type FramePosition } from "@cineflow/media-engine";
import { getModelRegistry, ModelRouter } from "@cineflow/ai-core";
import { getRedisConnection, QUEUE_NAME, type GenerationJobPayload } from "./lib/queue";
import { downloadToFile, uploadFromFile, buildDerivedObjectKey } from "./lib/storage";
import { logger } from "./lib/logger";

/**
 * This is a separate process from the API server (`pnpm --filter @cineflow/api run worker`)
 * so a slow/stuck ffmpeg or generation job never blocks HTTP request handling. It only
 * implements the job types that have a real implementation behind them
 * (THUMBNAIL_GENERATION, FRAME_EXTRACTION, IMAGE_GENERATION, VIDEO_GENERATION) —
 * anything else fails loudly with NOT_IMPLEMENTED rather than pretending to succeed,
 * per the brief's "never fake output" rule.
 */

async function handleThumbnailGeneration(payload: GenerationJobPayload, tmpDir: string) {
  const { assetId } = payload.params as { assetId: string };
  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset) throw new Error(`Asset "${assetId}" not found.`);
  if (asset.type !== "IMAGE" && asset.type !== "VIDEO" && asset.type !== "REFERENCE") {
    throw new Error(`Cannot generate a thumbnail for asset type "${asset.type}".`);
  }

  const inputPath = join(tmpDir, "input");
  const outputPath = join(tmpDir, "thumb.jpg");
  await downloadToFile(asset.storageKey, inputPath);
  await generateThumbnail(inputPath, outputPath, asset.type === "VIDEO");

  const thumbnailKey = buildDerivedObjectKey(payload.projectId, "thumbnails", `${assetId}.jpg`);
  await uploadFromFile(thumbnailKey, outputPath, "image/jpeg");

  await prisma.asset.update({ where: { id: assetId }, data: { thumbnailKey } });
  return { assetId, thumbnailKey };
}

async function handleFrameExtraction(payload: GenerationJobPayload, tmpDir: string) {
  const { assetId, position, timestampMs } = payload.params as {
    assetId: string;
    position: FramePosition;
    timestampMs?: number;
  };
  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset) throw new Error(`Asset "${assetId}" not found.`);
  if (asset.type !== "VIDEO") {
    throw new Error(`Frame extraction requires a VIDEO asset, got "${asset.type}".`);
  }

  const inputPath = join(tmpDir, "input.mp4");
  const outputPath = join(tmpDir, "frame.jpg");
  await downloadToFile(asset.storageKey, inputPath);
  await extractFrame(inputPath, outputPath, position, timestampMs);

  const frameKey = buildDerivedObjectKey(payload.projectId, "frames", `${assetId}-${position}.jpg`);
  await uploadFromFile(frameKey, outputPath, "image/jpeg");

  const frameAsset = await prisma.asset.create({
    data: {
      projectId: payload.projectId,
      filename: `${asset.filename} (${position} frame)`,
      type: "IMAGE",
      storageKey: frameKey,
      source: "frame_extraction",
      parentAssetId: assetId,
    },
  });
  return { assetId: frameAsset.id };
}

/**
 * Downloads a JobHandle result to a local path. MockProvider returns local filesystem
 * paths directly (see mock-provider.ts); a real remote provider would return an HTTPS
 * URL instead, which this fetches. Either way the caller ends up with a local file
 * ready to upload to MinIO — swapping in a real provider later doesn't change anything
 * downstream of this function.
 */
async function materializeResultToFile(resultUrl: string, localPath: string): Promise<void> {
  if (resultUrl.startsWith("http://") || resultUrl.startsWith("https://")) {
    const res = await fetch(resultUrl);
    if (!res.ok) throw new Error(`Failed to download generation result: ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    const { writeFileSync } = await import("node:fs");
    writeFileSync(localPath, buffer);
  } else {
    const { copyFileSync } = await import("node:fs");
    copyFileSync(resultUrl, localPath);
  }
}

async function handleImageGeneration(payload: GenerationJobPayload, tmpDir: string) {
  const { shotId, prompt, negativePrompt, width, height } = payload.params as {
    shotId: string;
    prompt: string;
    negativePrompt?: string;
    width?: number;
    height?: number;
  };

  const router = new ModelRouter(getModelRegistry());
  const route = getModelRegistry().resolveForCapability("IMAGE_OUTPUT");
  if (!route) {
    throw new Error("No image-generation provider is configured.");
  }
  router.assertCapability(route.definition.modelId, "IMAGE_OUTPUT");

  if (!route.provider.generateImage) {
    throw new Error(`Provider "${route.provider.key}" declares IMAGE_OUTPUT but does not implement generateImage().`);
  }
  const handle = await route.provider.generateImage({ prompt, negativePrompt, width, height });
  if (handle.status !== "SUCCEEDED" || !handle.resultUrls?.[0]) {
    throw new Error(handle.errorMessage ?? "Image generation did not return a result.");
  }

  const outputPath = join(tmpDir, "generated.jpg");
  await materializeResultToFile(handle.resultUrls[0], outputPath);

  const isMock = route.provider.key === "mock";
  const storageKey = buildDerivedObjectKey(payload.projectId, "thumbnails", `shot-${shotId}-image.jpg`);
  await uploadFromFile(storageKey, outputPath, "image/jpeg");

  const asset = await prisma.asset.create({
    data: {
      projectId: payload.projectId,
      filename: `Shot ${shotId} — generated image`,
      type: "IMAGE",
      storageKey,
      source: isMock ? "mock_generation" : "generation",
      prompt,
      modelId: route.definition.modelId,
      tags: isMock ? ["mock"] : [],
      metadata: { shotId },
    },
  });
  return { assetId: asset.id };
}

async function handleVideoGeneration(payload: GenerationJobPayload, tmpDir: string) {
  const { shotId, prompt, negativePrompt, width, height, durationSeconds } = payload.params as {
    shotId: string;
    prompt: string;
    negativePrompt?: string;
    width?: number;
    height?: number;
    durationSeconds?: number;
  };

  const router = new ModelRouter(getModelRegistry());
  const route = getModelRegistry().resolveForCapability("VIDEO_OUTPUT");
  if (!route) {
    throw new Error("No video-generation provider is configured.");
  }
  router.assertCapability(route.definition.modelId, "VIDEO_OUTPUT");

  if (!route.provider.generateVideo) {
    throw new Error(`Provider "${route.provider.key}" declares VIDEO_OUTPUT but does not implement generateVideo().`);
  }
  const handle = await route.provider.generateVideo({ prompt, negativePrompt, width, height, durationSeconds });
  if (handle.status !== "SUCCEEDED" || !handle.resultUrls?.[0]) {
    throw new Error(handle.errorMessage ?? "Video generation did not return a result.");
  }

  const outputPath = join(tmpDir, "generated.mp4");
  await materializeResultToFile(handle.resultUrls[0], outputPath);

  const isMock = route.provider.key === "mock";
  const storageKey = buildDerivedObjectKey(payload.projectId, "thumbnails", `shot-${shotId}-video.mp4`);
  await uploadFromFile(storageKey, outputPath, "video/mp4");

  const asset = await prisma.asset.create({
    data: {
      projectId: payload.projectId,
      filename: `Shot ${shotId} — generated video`,
      type: "VIDEO",
      storageKey,
      source: isMock ? "mock_generation" : "generation",
      prompt,
      modelId: route.definition.modelId,
      tags: isMock ? ["mock"] : [],
      metadata: { shotId },
    },
  });
  return { assetId: asset.id };
}

async function processJob(job: Job<GenerationJobPayload>) {
  const { generationJobId, type } = job.data;
  const tmpDir = mkdtempSync(join(tmpdir(), "cineflow-job-"));

  await prisma.generationJob.update({
    where: { id: generationJobId },
    data: { status: "PROCESSING", startedAt: new Date() },
  });

  try {
    let result: { assetId: string };
    switch (type) {
      case "THUMBNAIL_GENERATION":
        result = await handleThumbnailGeneration(job.data, tmpDir);
        break;
      case "FRAME_EXTRACTION":
        result = await handleFrameExtraction(job.data, tmpDir);
        break;
      case "IMAGE_GENERATION":
        result = await handleImageGeneration(job.data, tmpDir);
        break;
      case "VIDEO_GENERATION":
        result = await handleVideoGeneration(job.data, tmpDir);
        break;
      default:
        throw new Error(
          `Job type "${type}" is not implemented yet in this build. Implemented: THUMBNAIL_GENERATION, FRAME_EXTRACTION, IMAGE_GENERATION, VIDEO_GENERATION.`,
        );
    }

    await prisma.generationJob.update({
      where: { id: generationJobId },
      data: {
        status: "SUCCEEDED",
        progress: 100,
        resultAssetIds: [result.assetId],
        finishedAt: new Date(),
      },
    });
  } catch (err) {
    await prisma.generationJob.update({
      where: { id: generationJobId },
      data: { status: "FAILED", errorMessage: (err as Error).message, finishedAt: new Date() },
    });
    throw err;
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

const worker = new Worker<GenerationJobPayload>(QUEUE_NAME, processJob, {
  connection: getRedisConnection(),
  concurrency: 2,
});

worker.on("completed", (job) => logger.info({ jobId: job.id, type: job.data.type }, "job completed"));
worker.on("failed", (job, err) =>
  logger.error({ jobId: job?.id, type: job?.data.type, err: err.message }, "job failed"),
);

logger.info(`CineFlow job worker started, listening on queue: ${QUEUE_NAME}`);
