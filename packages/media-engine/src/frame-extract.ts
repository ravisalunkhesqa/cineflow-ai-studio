import { runFfmpeg } from "./ffmpeg";
import { getDurationSeconds } from "./probe";

export type FramePosition = "first" | "last" | "timestamp";

function secondsToTimestamp(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = (clamped % 60).toFixed(3).padStart(6, "0");
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${seconds}`;
}

export function buildFrameExtractArgs(inputPath: string, outputPath: string, seekTimestamp: string): string[] {
  return ["-y", "-ss", seekTimestamp, "-i", inputPath, "-frames:v", "1", outputPath];
}

/**
 * Extracts a single frame from a video to outputPath (brief §26). "last" needs
 * ffprobe to find the duration first, then seeks just before the end — seeking
 * exactly to the duration can land past the last decodable frame on some containers.
 */
export async function extractFrame(
  inputPath: string,
  outputPath: string,
  position: FramePosition,
  timestampMs?: number,
): Promise<void> {
  let seekSeconds: number;

  if (position === "first") {
    seekSeconds = 0;
  } else if (position === "timestamp") {
    if (timestampMs === undefined) {
      throw new Error('timestampMs is required when position is "timestamp".');
    }
    seekSeconds = timestampMs / 1000;
  } else {
    const duration = await getDurationSeconds(inputPath);
    seekSeconds = Math.max(0, duration - 0.1);
  }

  await runFfmpeg(buildFrameExtractArgs(inputPath, outputPath, secondsToTimestamp(seekSeconds)));
}
