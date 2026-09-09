import { runFfmpeg } from "./ffmpeg";

const THUMBNAIL_WIDTH = 480;

/** Pure arg-builder, unit-testable without invoking ffmpeg. */
export function buildThumbnailArgs(inputPath: string, outputPath: string, isVideo: boolean): string[] {
  if (isVideo) {
    return [
      "-y",
      "-ss",
      "00:00:01.000",
      "-i",
      inputPath,
      "-frames:v",
      "1",
      "-vf",
      `scale=${THUMBNAIL_WIDTH}:-1`,
      outputPath,
    ];
  }
  return ["-y", "-i", inputPath, "-vf", `scale=${THUMBNAIL_WIDTH}:-1`, outputPath];
}

/**
 * Generates a thumbnail JPEG at outputPath from inputPath. For video, seeks to 1s in
 * (falling back to the first frame if the clip is shorter than 1s); for images, just
 * produces a scaled preview per brief §51.
 */
export async function generateThumbnail(inputPath: string, outputPath: string, isVideo: boolean): Promise<void> {
  try {
    await runFfmpeg(buildThumbnailArgs(inputPath, outputPath, isVideo));
  } catch (err) {
    if (!isVideo) throw err;
    const fallbackArgs = buildThumbnailArgs(inputPath, outputPath, isVideo).map((a) =>
      a === "00:00:01.000" ? "00:00:00.000" : a,
    );
    await runFfmpeg(fallbackArgs);
  }
}
