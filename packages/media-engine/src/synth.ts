import { runFfmpeg } from "./ffmpeg";
import { existsSync } from "node:fs";

/**
 * Generates a solid-color placeholder image with a text label burned in via ffmpeg's
 * drawtext filter. This exists ONLY for MockImageProvider (brief §23: "Allow mock
 * provider only in explicit development mode") — it is never used on any real
 * generation path, and every caller is expected to visibly label the result as a
 * development mock, never presented as real AI output.
 */
export async function generateMockImage(
  outputPath: string,
  options: { width: number; height: number; label: string; color?: string },
): Promise<void> {
  const { width, height, label, color = "0x2a2a3a" } = options;
  const safeLabel = escapeDrawtext(label).slice(0, 60);
  const fontFile = getDrawtextFont();
  await runFfmpeg([
    "-y",
    "-f",
    "lavfi",
    "-i",
    `color=c=${color}:s=${width}x${height}`,
    "-vf",
    `drawtext=${fontFile}text='${safeLabel}':fontcolor=white:fontsize=24:x=(w-text_w)/2:y=(h-text_h)/2:box=1:boxcolor=black@0.5:boxborderw=10`,
    "-frames:v",
    "1",
    outputPath,
  ]);
}

/**
 * Generates a short synthetic test-pattern video with a burned-in label. Same
 * dev-mock-only scope as generateMockImage above.
 */
export async function generateMockVideo(
  outputPath: string,
  options: { width: number; height: number; durationSeconds: number; label: string; fps?: number },
): Promise<void> {
  const { width, height, durationSeconds, label, fps = 24 } = options;
  const safeLabel = escapeDrawtext(label).slice(0, 60);
  const fontFile = getDrawtextFont();
  await runFfmpeg([
    "-y",
    "-f",
    "lavfi",
    "-i",
    `testsrc2=size=${width}x${height}:duration=${durationSeconds}:rate=${fps}`,
    "-vf",
    `drawtext=${fontFile}text='${safeLabel}':fontcolor=white:fontsize=20:x=(w-text_w)/2:y=h-40:box=1:boxcolor=black@0.5:boxborderw=8`,
    "-pix_fmt",
    "yuv420p",
    outputPath,
  ]);
}

function escapeDrawtext(text: string): string {
  return text.replace(/[\\':]/g, "");
}

function getDrawtextFont(): string {
  const candidates =
    process.platform === "win32"
      ? ["C:/Windows/Fonts/arial.ttf"]
      : ["/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf"];
  const fontPath = candidates.find((candidate) => existsSync(candidate));
  return fontPath ? `fontfile='${fontPath.replace(/:/g, "\\:")}':` : "";
}
