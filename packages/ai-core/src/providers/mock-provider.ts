import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateMockImage, generateMockVideo } from "@cineflow/media-engine";
import type { AIProvider, ChatRequest, ChatResponse, JobHandle } from "@cineflow/provider-sdk";
import { ProviderCapabilityError } from "@cineflow/provider-sdk";
import type { Capability, ModelDefinitionConfig } from "@cineflow/shared";

/**
 * MockProvider — brief §23: "Allow mock provider only in explicit development mode."
 *
 * Never claims to be a real generation provider: every image is a solid-color
 * placeholder and every video is a synthetic test pattern, both with the prompt text
 * burned in via ffmpeg. It exists so the job-queue/asset pipeline built in Phase 7 has
 * something real to exercise end-to-end before a genuine image/video provider is
 * confirmed available. Callers (apps/api's generation routes) tag every resulting
 * Asset/Generation with source: "mock_generation" so the UI can show a visible
 * "DEV MOCK" badge — this is never presented to the user as real AI output.
 *
 * Only registered by ModelRegistry when BOTH ENABLE_MOCK_PROVIDERS=true and
 * NODE_ENV != "production" — see registry/model-registry.ts.
 *
 * generateImage/generateVideo's JobHandle.resultUrls are LOCAL FILESYSTEM PATHS (this
 * runs in-process in the worker that uploads to MinIO), not remote URLs. A real
 * provider adapter would return actual HTTPS URLs instead — apps/api/src/worker.ts
 * branches on this so swapping in a real provider later doesn't change the contract.
 */
export class MockProvider implements AIProvider {
  readonly key = "mock";
  readonly capabilities: Capability[] = ["IMAGE_OUTPUT", "VIDEO_OUTPUT"];

  async chat(_request: ChatRequest): Promise<ChatResponse> {
    throw new ProviderCapabilityError(this.key, "TEXT");
  }

  async generateImage(request: Record<string, unknown>): Promise<JobHandle> {
    const { prompt, width = 768, height = 768 } = request as {
      prompt: string;
      width?: number;
      height?: number;
    };
    const tmpDir = mkdtempSync(join(tmpdir(), "cineflow-mock-image-"));
    const outputPath = join(tmpDir, "mock-image.jpg");

    await generateMockImage(outputPath, { width, height, label: `MOCK: ${prompt || "(no prompt)"}` });

    return {
      jobId: `mock-image-${Date.now()}`,
      status: "SUCCEEDED",
      progress: 100,
      resultUrls: [outputPath],
    };
  }

  async generateVideo(request: Record<string, unknown>): Promise<JobHandle> {
    const { prompt, durationSeconds = 3, width = 768, height = 432 } = request as {
      prompt: string;
      durationSeconds?: number;
      width?: number;
      height?: number;
    };
    const tmpDir = mkdtempSync(join(tmpdir(), "cineflow-mock-video-"));
    const outputPath = join(tmpDir, "mock-video.mp4");

    await generateMockVideo(outputPath, {
      width,
      height,
      durationSeconds: Math.min(Math.max(durationSeconds, 1), 10),
      label: `MOCK: ${prompt || "(no prompt)"}`,
    });

    return {
      jobId: `mock-video-${Date.now()}`,
      status: "SUCCEEDED",
      progress: 100,
      resultUrls: [outputPath],
    };
  }

  async testConnection(): ReturnType<AIProvider["testConnection"]> {
    return { status: "CONNECTED", detail: "Mock provider — no real network call made." };
  }
}

export const MOCK_MODEL_DEFINITIONS: ModelDefinitionConfig[] = [
  {
    id: "mock-image-v1",
    providerKey: "mock",
    modelId: "mock/image-v1",
    displayName: "Mock Image Provider (dev)",
    capabilities: ["IMAGE_OUTPUT"],
    enabled: true,
    isDefaultFor: [],
    notes:
      "Development-only placeholder generator — produces labeled solid-color images, " +
      "never real AI output. Only active when ENABLE_MOCK_PROVIDERS=true and NODE_ENV != production.",
  },
  {
    id: "mock-video-v1",
    providerKey: "mock",
    modelId: "mock/video-v1",
    displayName: "Mock Video Provider (dev)",
    capabilities: ["VIDEO_OUTPUT"],
    enabled: true,
    isDefaultFor: [],
    notes:
      "Development-only placeholder generator — produces a labeled synthetic test-pattern " +
      "clip, never real AI output. Only active when ENABLE_MOCK_PROVIDERS=true and NODE_ENV != production.",
  },
];
