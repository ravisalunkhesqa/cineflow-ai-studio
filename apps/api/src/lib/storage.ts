import { Client as MinioClient } from "minio";
import { randomUUID } from "node:crypto";

const BUCKET = process.env.MINIO_BUCKET ?? "cineflow-media";
const PRESIGN_EXPIRY_SECONDS = 15 * 60; // 15 minutes

let client: MinioClient | null = null;
let bucketReady: Promise<void> | null = null;

function getClient(): MinioClient {
  if (!client) {
    const endPoint = process.env.MINIO_ENDPOINT ?? "localhost";
    const port = Number(process.env.MINIO_PORT ?? 9000);
    const accessKey = process.env.MINIO_ROOT_USER;
    const secretKey = process.env.MINIO_ROOT_PASSWORD;
    if (!accessKey || !secretKey) {
      throw new Error(
        "MinIO is not configured — set MINIO_ROOT_USER and MINIO_ROOT_PASSWORD in .env.local.",
      );
    }
    client = new MinioClient({
      endPoint,
      port,
      useSSL: process.env.MINIO_USE_SSL === "true",
      accessKey,
      secretKey,
    });
  }
  return client;
}

async function ensureBucket(): Promise<void> {
  if (!bucketReady) {
    bucketReady = (async () => {
      const c = getClient();
      const exists = await c.bucketExists(BUCKET).catch(() => false);
      if (!exists) await c.makeBucket(BUCKET);
    })();
  }
  return bucketReady;
}

const ASSET_CATEGORY_FOLDERS = {
  IMAGE: "images",
  VIDEO: "videos",
  AUDIO: "audio",
  VOICE: "audio",
  MUSIC: "audio",
  SFX: "audio",
  REFERENCE: "references",
  MASK: "masks",
} as const;

export type AssetCategory = keyof typeof ASSET_CATEGORY_FOLDERS;

/**
 * Bucket layout per brief §50: projects/{projectId}/{references,images,videos,audio,
 * frames,masks,exports,thumbnails}/{uuid}-{safeFilename}
 *
 * The key is always built server-side from a validated projectId + a UUID — the
 * client-provided filename is sanitized and only used as a cosmetic suffix, which
 * closes off path traversal (§54) even if the client sends "../../etc/passwd".
 */
export function buildObjectKey(projectId: string, category: AssetCategory, filename: string): string {
  const folder = ASSET_CATEGORY_FOLDERS[category];
  const safeName = sanitizeFilename(filename);
  return `projects/${projectId}/${folder}/${randomUUID()}-${safeName}`;
}

/** For derived media that isn't itself an AssetType (thumbnails, extracted frames). */
export function buildDerivedObjectKey(
  projectId: string,
  kind: "thumbnails" | "frames",
  filename: string,
): string {
  const safeName = sanitizeFilename(filename);
  return `projects/${projectId}/${kind}/${randomUUID()}-${safeName}`;
}

export function sanitizeFilename(filename: string): string {
  const base = filename.split(/[\\/]/).pop() ?? "file";
  const cleaned = base.replace(/[^A-Za-z0-9._-]/g, "_").slice(-150);
  return cleaned || "file";
}

/** Defends against a forged storageKey that doesn't belong to the claimed project. */
export function assertKeyBelongsToProject(storageKey: string, projectId: string): void {
  if (!storageKey.startsWith(`projects/${projectId}/`)) {
    throw new Error("storageKey does not belong to this project.");
  }
  if (storageKey.includes("..")) {
    throw new Error("Invalid storageKey.");
  }
}

export async function getUploadUrl(objectKey: string): Promise<string> {
  await ensureBucket();
  return getClient().presignedPutObject(BUCKET, objectKey, PRESIGN_EXPIRY_SECONDS);
}

export async function getDownloadUrl(objectKey: string): Promise<string> {
  await ensureBucket();
  return getClient().presignedGetObject(BUCKET, objectKey, PRESIGN_EXPIRY_SECONDS);
}

export async function deleteObject(objectKey: string): Promise<void> {
  await getClient().removeObject(BUCKET, objectKey);
}

/** Used by the job worker to pull a source object down to a local temp file for ffmpeg. */
export async function downloadToFile(objectKey: string, localPath: string): Promise<void> {
  await ensureBucket();
  await getClient().fGetObject(BUCKET, objectKey, localPath);
}

/** Used by the job worker to push a generated output (thumbnail/frame) back to MinIO. */
export async function uploadFromFile(objectKey: string, localPath: string, contentType: string): Promise<void> {
  await ensureBucket();
  await getClient().fPutObject(BUCKET, objectKey, localPath, { "Content-Type": contentType });
}

export function isMinioConfigured(): boolean {
  return Boolean(process.env.MINIO_ROOT_USER && process.env.MINIO_ROOT_PASSWORD);
}
