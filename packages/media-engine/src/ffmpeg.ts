import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export function getFfmpegPath(): string {
  return process.env.FFMPEG_PATH || "ffmpeg";
}

export function getFfprobePath(): string {
  return process.env.FFPROBE_PATH || "ffprobe";
}

const DEFAULT_TIMEOUT_MS = 60_000;

/**
 * Runs ffmpeg with an explicit argument array — never a shell string. This is the
 * only place `apps/api` (via jobs) invokes ffmpeg, so every caller in this codebase
 * is forced through this one trusted, array-based execution path (brief §54).
 */
export async function runFfmpeg(args: string[], timeoutMs = DEFAULT_TIMEOUT_MS): Promise<void> {
  try {
    await execFileAsync(getFfmpegPath(), args, { timeout: timeoutMs, maxBuffer: 1024 * 1024 * 10 });
  } catch (err) {
    const stderr = (err as { stderr?: string }).stderr ?? "";
    throw new Error(`ffmpeg failed: ${(err as Error).message}${stderr ? `\n${stderr.slice(-1000)}` : ""}`);
  }
}

export async function runFfprobe(args: string[], timeoutMs = 15_000): Promise<string> {
  try {
    const { stdout } = await execFileAsync(getFfprobePath(), args, { timeout: timeoutMs });
    return stdout;
  } catch (err) {
    throw new Error(`ffprobe failed: ${(err as Error).message}`);
  }
}
