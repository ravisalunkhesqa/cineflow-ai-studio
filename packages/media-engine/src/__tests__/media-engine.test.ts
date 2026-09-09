import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync, existsSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { generateThumbnail, buildThumbnailArgs } from "../thumbnail";
import { extractFrame, buildFrameExtractArgs } from "../frame-extract";
import { getDurationSeconds, getDimensions } from "../probe";

const execFileAsync = promisify(execFile);

let workDir: string;
let testVideoPath: string;
let testImagePath: string;

beforeAll(async () => {
  workDir = mkdtempSync(join(tmpdir(), "cineflow-media-test-"));
  testVideoPath = join(workDir, "test.mp4");
  testImagePath = join(workDir, "test.png");

  // Synthesize a 3-second test video and a still image entirely with ffmpeg's
  // built-in lavfi sources — no network access or fixture files needed.
  await execFileAsync("ffmpeg", [
    "-y",
    "-f",
    "lavfi",
    "-i",
    "testsrc=duration=3:size=320x240:rate=10",
    testVideoPath,
  ]);
  await execFileAsync("ffmpeg", [
    "-y",
    "-f",
    "lavfi",
    "-i",
    "color=c=blue:s=640x480",
    "-frames:v",
    "1",
    testImagePath,
  ]);
}, 30_000);

afterAll(() => {
  rmSync(workDir, { recursive: true, force: true });
});

describe("buildThumbnailArgs (pure)", () => {
  it("seeks to 1s for video", () => {
    const args = buildThumbnailArgs("in.mp4", "out.jpg", true);
    expect(args).toContain("00:00:01.000");
  });

  it("does not seek for images", () => {
    const args = buildThumbnailArgs("in.png", "out.jpg", false);
    expect(args).not.toContain("-ss");
  });
});

describe("generateThumbnail (real ffmpeg)", () => {
  it("produces a scaled JPEG thumbnail from a real video", async () => {
    const outputPath = join(workDir, "video-thumb.jpg");
    await generateThumbnail(testVideoPath, outputPath, true);
    expect(existsSync(outputPath)).toBe(true);
    expect(statSync(outputPath).size).toBeGreaterThan(0);
  });

  it("produces a scaled JPEG thumbnail from a real image", async () => {
    const outputPath = join(workDir, "image-thumb.jpg");
    await generateThumbnail(testImagePath, outputPath, false);
    expect(existsSync(outputPath)).toBe(true);
    expect(statSync(outputPath).size).toBeGreaterThan(0);
  });
});

describe("extractFrame (real ffmpeg)", () => {
  it("extracts the first frame", async () => {
    const outputPath = join(workDir, "first-frame.jpg");
    await extractFrame(testVideoPath, outputPath, "first");
    expect(existsSync(outputPath)).toBe(true);
    expect(statSync(outputPath).size).toBeGreaterThan(0);
  });

  it("extracts the last frame using real ffprobe duration lookup", async () => {
    const outputPath = join(workDir, "last-frame.jpg");
    await extractFrame(testVideoPath, outputPath, "last");
    expect(existsSync(outputPath)).toBe(true);
    expect(statSync(outputPath).size).toBeGreaterThan(0);
  });

  it("extracts a frame at a specific timestamp", async () => {
    const outputPath = join(workDir, "mid-frame.jpg");
    await extractFrame(testVideoPath, outputPath, "timestamp", 1500);
    expect(existsSync(outputPath)).toBe(true);
    expect(statSync(outputPath).size).toBeGreaterThan(0);
  });

  it("rejects timestamp position without a timestampMs", async () => {
    await expect(extractFrame(testVideoPath, join(workDir, "x.jpg"), "timestamp")).rejects.toThrow(
      /timestampMs is required/,
    );
  });
});

describe("probe (real ffprobe)", () => {
  it("reports the correct duration for the synthetic 3-second video", async () => {
    const duration = await getDurationSeconds(testVideoPath);
    expect(duration).toBeGreaterThan(2.5);
    expect(duration).toBeLessThan(3.5);
  });

  it("reports the correct dimensions", async () => {
    const dims = await getDimensions(testVideoPath);
    expect(dims).toEqual({ width: 320, height: 240 });
  });
});

describe("buildFrameExtractArgs (pure)", () => {
  it("builds an argument array, never a shell string", () => {
    const args = buildFrameExtractArgs("in.mp4", "out.jpg", "00:00:01.500");
    expect(Array.isArray(args)).toBe(true);
    expect(args).toEqual(["-y", "-ss", "00:00:01.500", "-i", "in.mp4", "-frames:v", "1", "out.jpg"]);
  });
});
