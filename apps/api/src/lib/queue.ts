import { Queue } from "bullmq";
import IORedis from "ioredis";
import type { JobType } from "@cineflow/shared";

let connection: IORedis | null = null;
let queue: Queue<GenerationJobPayload> | null = null;

export interface GenerationJobPayload {
  generationJobId: string; // Prisma GenerationJob.id — the durable record
  projectId: string;
  type: JobType;
  params: Record<string, unknown>;
}

export const QUEUE_NAME = "cineflow-jobs";

export function getRedisConnection(): IORedis {
  if (!connection) {
    connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
      maxRetriesPerRequest: null, // required by BullMQ
    });
  }
  return connection;
}

export function getJobQueue(): Queue<GenerationJobPayload> {
  if (!queue) {
    queue = new Queue<GenerationJobPayload>(QUEUE_NAME, { connection: getRedisConnection() });
  }
  return queue;
}

export function isQueueConfigured(): boolean {
  return Boolean(process.env.REDIS_URL || process.env.REDIS_HOST);
}
