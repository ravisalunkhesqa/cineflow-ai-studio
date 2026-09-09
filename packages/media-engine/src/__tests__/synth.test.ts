import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync, existsSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateMockImage, generateMockVideo } from "../synth";
import { getDurationSeconds, getDimensions } from "../probe";

let workDir: string;

beforeAll(() => {
  workDir = mkdtempSync(join(tmpdir(), "cineflow-synth-test-"));
});

afterAll(() => {
  rmSync(workDir, { recursive: true, force: true });
});

describe("generateMockImage (real ffmpeg)", () => {
  it("produces a labeled placeholder image at the requested size", async () => {
    const outputPath = join(workDir, "mock.jpg");
    await generateMockImage(outputPath, { width: 512, height: 512, label: "A woman discovers a photo" });
    expect(existsSync(outputPath)).toBe(true);
    expect(statSync(outputPath).size).toBeGreaterThan(0);
    const dims = await getDimensions(outputPath);
    expect(dims).toEqual({ width: 512, height: 512 });
  });

  it("strips characters that would break the drawtext filter string", async () => {
    const outputPath = join(workDir, "mock-escaped.jpg");
    await expect(
      generateMockImage(outputPath, { width: 256, height: 256, label: "it's a 'test': tricky" }),
    ).resolves.not.toThrow();
  });
});

describe("generateMockVideo (real ffmpeg)", () => {
  it("produces a labeled test-pattern video of the requested duration", async () => {
    const outputPath = join(workDir, "mock.mp4");
    await generateMockVideo(outputPath, { width: 320, height: 240, durationSeconds: 2, label: "Mock generation" });
    expect(existsSync(outputPath)).toBe(true);
    const duration = await getDurationSeconds(outputPath);
    expect(duration).toBeGreaterThan(1.5);
    expect(duration).toBeLessThan(2.5);
  });
});
