import { describe, it, expect } from "vitest";
import { CAPABILITIES, TASK_TYPES, HealthResponseSchema, ModelDefinitionSchema } from "./index";

describe("shared capability/task enums", () => {
  it("declares the expected capability set", () => {
    expect(CAPABILITIES).toContain("TEXT");
    expect(CAPABILITIES).toContain("VIDEO_OUTPUT");
    expect(CAPABILITIES.length).toBeGreaterThan(5);
  });

  it("declares the expected task types", () => {
    expect(TASK_TYPES).toContain("SHOT_PLANNING");
    expect(TASK_TYPES).toContain("CONTINUITY_ANALYSIS");
  });
});

describe("HealthResponseSchema", () => {
  it("accepts a valid health payload", () => {
    const result = HealthResponseSchema.safeParse({
      status: "OK",
      timestamp: new Date().toISOString(),
      components: {
        api: "OK",
        database: "OK",
        redis: "OK",
        minio: "OK",
        ffmpeg: "NOT_CONFIGURED",
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid component status", () => {
    const result = HealthResponseSchema.safeParse({
      status: "OK",
      timestamp: new Date().toISOString(),
      components: {
        api: "OK",
        database: "SOMETHING_INVALID",
        redis: "OK",
        minio: "OK",
        ffmpeg: "OK",
      },
    });
    expect(result.success).toBe(false);
  });
});

describe("ModelDefinitionSchema", () => {
  it("rejects a model definition with an unknown capability", () => {
    const result = ModelDefinitionSchema.safeParse({
      id: "x",
      providerKey: "xkiro",
      modelId: "some/model",
      displayName: "Some Model",
      capabilities: ["NOT_A_REAL_CAPABILITY"],
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid, conservative model definition", () => {
    const result = ModelDefinitionSchema.safeParse({
      id: "x",
      providerKey: "xkiro",
      modelId: "qwen/qwen3.5-omni-plus:free",
      displayName: "Qwen Omni Plus",
      capabilities: ["TEXT"],
      enabled: true,
      isDefaultFor: [],
    });
    expect(result.success).toBe(true);
  });
});
