import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ModelRegistry } from "../model-registry";
import { ModelRouter } from "../model-router";
import { INITIAL_MODELS, INITIAL_PROVIDERS } from "@cineflow/config";

describe("ModelRegistry", () => {
  const originalKey = process.env.XTROUTER_API_KEY;
  const originalMock = process.env.ENABLE_MOCK_PROVIDERS;
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.XTROUTER_API_KEY = originalKey;
    process.env.ENABLE_MOCK_PROVIDERS = originalMock;
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("does not register a provider when no API key is configured", () => {
    delete process.env.XTROUTER_API_KEY;
    const registry = new ModelRegistry(INITIAL_PROVIDERS, INITIAL_MODELS);
    expect(registry.isConfigured("xkiro")).toBe(false);
  });

  it("registers the provider once an API key is present", () => {
    process.env.XTROUTER_API_KEY = "test-key";
    const registry = new ModelRegistry(INITIAL_PROVIDERS, INITIAL_MODELS);
    expect(registry.isConfigured("xkiro")).toBe(true);
  });

  it("never claims VIDEO_OUTPUT for the unverified omni model", () => {
    const registry = new ModelRegistry(INITIAL_PROVIDERS, INITIAL_MODELS);
    expect(registry.hasCapability("qwen/qwen3.5-omni-plus:free", "VIDEO_OUTPUT")).toBe(false);
    expect(registry.hasCapability("qwen/qwen3.5-omni-plus:free", "TEXT")).toBe(true);
  });

  it("does NOT register the mock provider by default", () => {
    delete process.env.ENABLE_MOCK_PROVIDERS;
    const registry = new ModelRegistry(INITIAL_PROVIDERS, INITIAL_MODELS);
    expect(registry.isConfigured("mock")).toBe(false);
    expect(registry.resolveForCapability("IMAGE_OUTPUT")).toBeUndefined();
  });

  it("does NOT register the mock provider in production even if the flag is set", () => {
    process.env.ENABLE_MOCK_PROVIDERS = "true";
    process.env.NODE_ENV = "production";
    const registry = new ModelRegistry(INITIAL_PROVIDERS, INITIAL_MODELS);
    expect(registry.isConfigured("mock")).toBe(false);
  });

  it("registers the mock provider only when explicitly enabled outside production", () => {
    process.env.ENABLE_MOCK_PROVIDERS = "true";
    process.env.NODE_ENV = "development";
    const registry = new ModelRegistry(INITIAL_PROVIDERS, INITIAL_MODELS);
    expect(registry.isConfigured("mock")).toBe(true);
    expect(registry.resolveForCapability("IMAGE_OUTPUT")?.definition.providerKey).toBe("mock");
    expect(registry.resolveForCapability("VIDEO_OUTPUT")?.definition.providerKey).toBe("mock");
  });
});

describe("ModelRouter", () => {
  beforeEach(() => {
    process.env.XTROUTER_API_KEY = "test-key";
  });

  it("resolves a manual modelId to its configured provider", () => {
    const registry = new ModelRegistry(INITIAL_PROVIDERS, INITIAL_MODELS);
    const router = new ModelRouter(registry);
    const result = router.resolve({ task: "IDEATION", modelId: "minimax/minimax-m3:free" });
    expect(result.definition.modelId).toBe("minimax/minimax-m3:free");
    expect(result.provider.key).toBe("xkiro");
  });

  it("throws a clear error for an unknown manual modelId rather than silently falling back", () => {
    const registry = new ModelRegistry(INITIAL_PROVIDERS, INITIAL_MODELS);
    const router = new ModelRouter(registry);
    expect(() => router.resolve({ task: "IDEATION", modelId: "not/a-real-model" })).toThrow(/Unknown model/);
  });

  it("AUTO resolves to the task's default model", () => {
    const registry = new ModelRegistry(INITIAL_PROVIDERS, INITIAL_MODELS);
    const router = new ModelRouter(registry);
    const result = router.resolve({ task: "IDEATION", modelId: "AUTO" });
    expect(result.definition.isDefaultFor).toContain("IDEATION");
  });

  it("throws when no provider is configured at all", () => {
    delete process.env.XTROUTER_API_KEY;
    const registry = new ModelRegistry(INITIAL_PROVIDERS, INITIAL_MODELS);
    const router = new ModelRouter(registry);
    expect(() => router.resolve({ task: "IDEATION", modelId: "AUTO" })).toThrow(/No configured model/);
  });
});
