import { execFile } from "node:child_process";
import { promisify } from "node:util";
import Redis from "ioredis";
import { Client as MinioClient } from "minio";
import { prisma } from "@cineflow/database";
import type { HealthComponentStatus, HealthResponse } from "@cineflow/shared";
import { logger } from "../../lib/logger";

const execFileAsync = promisify(execFile);

async function checkDatabase(): Promise<HealthComponentStatus> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return "OK";
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "health: database check failed");
    return "DOWN";
  }
}

async function checkRedis(): Promise<HealthComponentStatus> {
  const url = process.env.REDIS_URL ?? "redis://localhost:6379";
  const client = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 1, connectTimeout: 1500 });
  try {
    await client.connect();
    const pong = await client.ping();
    return pong === "PONG" ? "OK" : "DEGRADED";
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "health: redis check failed");
    return "DOWN";
  } finally {
    client.disconnect();
  }
}

async function checkMinio(): Promise<HealthComponentStatus> {
  const endPoint = process.env.MINIO_ENDPOINT ?? "localhost";
  const port = Number(process.env.MINIO_PORT ?? 9000);
  const accessKey = process.env.MINIO_ROOT_USER;
  const secretKey = process.env.MINIO_ROOT_PASSWORD;

  if (!accessKey || !secretKey) return "NOT_CONFIGURED";

  try {
    const client = new MinioClient({
      endPoint,
      port,
      useSSL: process.env.MINIO_USE_SSL === "true",
      accessKey,
      secretKey,
    });
    await client.listBuckets();
    return "OK";
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "health: minio check failed");
    return "DOWN";
  }
}

async function checkFfmpeg(): Promise<HealthComponentStatus> {
  const ffmpegPath = process.env.FFMPEG_PATH || "ffmpeg";
  try {
    await execFileAsync(ffmpegPath, ["-version"], { timeout: 3000 });
    return "OK";
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "health: ffmpeg not found on PATH");
    return "NOT_CONFIGURED";
  }
}

export function overallStatus(components: HealthResponse["components"]): HealthComponentStatus {
  const values = Object.values(components);
  if (values.includes("DOWN")) return "DOWN";
  if (values.includes("DEGRADED") || values.includes("NOT_CONFIGURED")) return "DEGRADED";
  return "OK";
}

export async function getHealth(): Promise<HealthResponse> {
  const [database, redis, minio, ffmpeg] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkMinio(),
    checkFfmpeg(),
  ]);

  const components: HealthResponse["components"] = {
    api: "OK",
    database,
    redis,
    minio,
    ffmpeg,
  };

  return {
    status: overallStatus(components),
    timestamp: new Date().toISOString(),
    components,
  };
}
