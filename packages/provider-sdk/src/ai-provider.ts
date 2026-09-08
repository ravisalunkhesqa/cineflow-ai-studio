import type { Capability } from "@cineflow/shared";

/**
 * AIProvider — the abstraction all provider adapters implement.
 *
 * A provider adapter (e.g. XKiroProvider, later GoogleProvider, RunwayProvider,
 * ElevenLabsProvider) implements ONLY the methods its declared capabilities
 * actually support. Callers must check `capabilities` (or ask the ModelRegistry)
 * before invoking a method — calling an unsupported method throws
 * ProviderCapabilityError rather than silently failing or fabricating output.
 *
 * Full method implementations (chat/generateImage/generateVideo/etc.) land in
 * Phase 4+ once the XKiro API surface has been verified. This file defines the
 * stable contract so core product code can be written against it now.
 */

export interface ProviderMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
}

export interface ChatRequest {
  modelId: string;
  messages: ProviderMessage[];
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  stream?: boolean;
  signal?: AbortSignal;
}

export interface ChatResponse {
  content: string;
  modelId: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs: number;
  raw?: unknown;
}

export interface JobHandle {
  jobId: string;
  status: "QUEUED" | "PROCESSING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
  progress?: number;
  resultUrls?: string[];
  errorMessage?: string;
}

export class ProviderCapabilityError extends Error {
  constructor(
    public readonly providerKey: string,
    public readonly missingCapability: Capability,
  ) {
    super(
      `Provider "${providerKey}" does not declare capability "${missingCapability}". ` +
        `Refusing to fabricate output — configure a provider/model that supports it.`,
    );
    this.name = "ProviderCapabilityError";
  }
}

export interface AIProvider {
  readonly key: string;
  readonly capabilities: Capability[];

  chat(request: ChatRequest): Promise<ChatResponse>;

  // Optional capability-gated methods. Adapters that don't support a capability
  // simply omit the method or throw ProviderCapabilityError; the caller is
  // responsible for checking `capabilities` first via the ModelRegistry.
  generateText?(request: ChatRequest): Promise<ChatResponse>;
  analyzeImage?(request: ChatRequest & { imageUrls: string[] }): Promise<ChatResponse>;
  generateImage?(request: Record<string, unknown>): Promise<JobHandle>;
  generateVideo?(request: Record<string, unknown>): Promise<JobHandle>;
  extendVideo?(request: Record<string, unknown>): Promise<JobHandle>;
  generateAudio?(request: Record<string, unknown>): Promise<JobHandle>;
  generateSpeech?(request: Record<string, unknown>): Promise<JobHandle>;
  generateMusic?(request: Record<string, unknown>): Promise<JobHandle>;

  cancelJob?(jobId: string): Promise<JobHandle>;
  getJobStatus?(jobId: string): Promise<JobHandle>;

  testConnection(): Promise<{
    status: "CONNECTED" | "AUTH_ERROR" | "RATE_LIMITED" | "MODEL_UNAVAILABLE" | "NETWORK_ERROR";
    detail?: string;
  }>;
}
