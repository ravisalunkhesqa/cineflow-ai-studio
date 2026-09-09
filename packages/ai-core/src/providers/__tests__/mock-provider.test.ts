import { describe, it, expect } from "vitest";
import { existsSync, statSync, rmSync } from "node:fs";
import { dirname } from "node:path";
import { MockProvider } from "../mock-provider";

describe("MockProvider (real ffmpeg, no DB/queue needed)", () => {
  it("generateImage produces a real local file and reports SUCCEEDED", async () => {
    const provider = new MockProvider();
    const handle = await provider.generateImage({ prompt: "A woman discovers a photo", width: 256, height: 256 });
    expect(handle.status).toBe("SUCCEEDED");
    const filePath = handle.resultUrls?.[0];
    expect(filePath).toBeTruthy();
    if (!filePath) throw new Error("unreachable");
    expect(existsSync(filePath)).toBe(true);
    expect(statSync(filePath).size).toBeGreaterThan(0);
    rmSync(dirname(filePath), { recursive: true, force: true });
  });

  it("generateVideo produces a real local file and reports SUCCEEDED", async () => {
    const provider = new MockProvider();
    const handle = await provider.generateVideo({ prompt: "Slow dolly push-in", durationSeconds: 1, width: 320, height: 240 });
    expect(handle.status).toBe("SUCCEEDED");
    const filePath = handle.resultUrls?.[0];
    expect(filePath).toBeTruthy();
    if (!filePath) throw new Error("unreachable");
    expect(existsSync(filePath)).toBe(true);
    rmSync(dirname(filePath), { recursive: true, force: true });
  });

  it("chat() throws ProviderCapabilityError since MockProvider does not support TEXT", async () => {
    const provider = new MockProvider();
    await expect(provider.chat({ modelId: "mock/image-v1", messages: [] })).rejects.toThrow(/TEXT/);
  });

  it("declares only IMAGE_OUTPUT and VIDEO_OUTPUT capabilities", () => {
    const provider = new MockProvider();
    expect(provider.capabilities).toEqual(["IMAGE_OUTPUT", "VIDEO_OUTPUT"]);
    expect(provider.capabilities).not.toContain("TEXT");
  });
});
