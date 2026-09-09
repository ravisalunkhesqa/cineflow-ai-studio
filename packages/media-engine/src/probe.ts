import { runFfprobe } from "./ffmpeg";

export async function getDurationSeconds(inputPath: string): Promise<number> {
  const stdout = await runFfprobe([
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "json",
    inputPath,
  ]);
  const parsed = JSON.parse(stdout) as { format?: { duration?: string } };
  const duration = Number(parsed.format?.duration);
  if (!Number.isFinite(duration)) {
    throw new Error(`Could not determine duration for "${inputPath}".`);
  }
  return duration;
}

export async function getDimensions(inputPath: string): Promise<{ width: number; height: number }> {
  const stdout = await runFfprobe([
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height",
    "-of",
    "json",
    inputPath,
  ]);
  const parsed = JSON.parse(stdout) as { streams?: { width?: number; height?: number }[] };
  const stream = parsed.streams?.[0];
  if (!stream?.width || !stream?.height) {
    throw new Error(`Could not determine dimensions for "${inputPath}".`);
  }
  return { width: stream.width, height: stream.height };
}
