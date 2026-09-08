import type { AIProvider, ChatRequest, ChatResponse } from "@cineflow/provider-sdk";
import type { Capability } from "@cineflow/shared";

/**
 * XKiroProvider
 *
 * IMPORTANT — unverified API surface: no live XKiro API documentation was available
 * when this adapter was written. The request/response shapes below follow the
 * OpenAI-compatible `/chat/completions` convention implied by the brief (§44: body
 * `{ model, messages }`), which is the standard shape for LLM-router APIs like this
 * one. `chat()` defensively parses the response and throws a clear error — rather than
 * silently returning garbage — if the shape doesn't match. Confirm against a real
 * response and adjust `parseChatResponse` before relying on this in production.
 *
 * Per brief rule #6/#7/#8: this adapter only implements `chat()` (TEXT capability).
 * It does NOT implement generateImage/generateVideo/etc. — those throw
 * ProviderCapabilityError via the base capability check pattern until a real
 * image/video-capable provider is configured (Phase 8).
 */

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;

export interface XKiroProviderOptions {
  baseUrl: string;
  apiKey: string;
  timeoutMs?: number;
}

export class XKiroProvider implements AIProvider {
  readonly key = "xkiro";
  readonly capabilities: Capability[] = ["TEXT", "JSON_MODE"];

  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;

  constructor(options: XKiroProviderOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.apiKey = options.apiKey;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const start = Date.now();
    let lastError: unknown;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const controller = new AbortController();
      const externalSignal = request.signal;
      const onExternalAbort = () => controller.abort();
      externalSignal?.addEventListener("abort", onExternalAbort);
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const res = await fetch(`${this.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: request.modelId,
            messages: request.messages,
            temperature: request.temperature,
            max_tokens: request.maxTokens,
            stream: false, // streaming not verified — see file header
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const bodyText = await res.text().catch(() => "");
          throw new XKiroApiError(res.status, bodyText);
        }

        const json = await res.json();
        return parseChatResponse(json, request.modelId, Date.now() - start);
      } catch (err) {
        lastError = err;
        // Retry only on network-level failures / timeouts, never on 4xx (bad request,
        // auth) — retrying those just repeats the same failure.
        const isRetryable =
          err instanceof XKiroApiError ? err.status >= 500 : true;
        if (!isRetryable || attempt === MAX_RETRIES) {
          throw toStructuredError(err);
        }
        await sleep(200 * 2 ** attempt);
      } finally {
        clearTimeout(timeout);
        externalSignal?.removeEventListener("abort", onExternalAbort);
      }
    }

    // Unreachable, but keeps TS happy.
    throw toStructuredError(lastError);
  }

  async testConnection(): ReturnType<AIProvider["testConnection"]> {
    // Deliberately does not hard-code a model string — caller (ModelRegistry) should
    // pass a real modelId. This default is only a last-resort fallback for a bare
    // "is the endpoint reachable at all" check and may return MODEL_UNAVAILABLE.
    try {
      await this.chat({
        modelId: "xkiro/test",
        messages: [{ role: "user", content: "Reply with OK" }],
        maxTokens: 5,
      });
      return { status: "CONNECTED" };
    } catch (err) {
      if (err instanceof StructuredProviderError) {
        return { status: err.status, detail: err.detail };
      }
      return { status: "NETWORK_ERROR", detail: (err as Error).message };
    }
  }
}

function parseChatResponse(json: unknown, modelId: string, latencyMs: number): ChatResponse {
  const obj = json as Record<string, unknown>;
  const choices = obj?.choices as Array<{ message?: { content?: string } }> | undefined;
  const content = choices?.[0]?.message?.content;

  if (typeof content !== "string") {
    throw new StructuredProviderError(
      "MODEL_UNAVAILABLE",
      "Unexpected response shape from XKiro API — expected choices[0].message.content. " +
        "The API surface may differ from the OpenAI-compatible convention assumed here; " +
        "inspect the raw response and update packages/ai-core/src/providers/xkiro-provider.ts.",
    );
  }

  const usage = obj?.usage as { prompt_tokens?: number; completion_tokens?: number } | undefined;

  return {
    content,
    modelId,
    inputTokens: usage?.prompt_tokens,
    outputTokens: usage?.completion_tokens,
    latencyMs,
    raw: json,
  };
}

export class XKiroApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly bodyText: string,
  ) {
    super(`XKiro API responded ${status}: ${bodyText.slice(0, 500)}`);
    this.name = "XKiroApiError";
  }
}

export type ConnectionStatus =
  | "CONNECTED"
  | "AUTH_ERROR"
  | "RATE_LIMITED"
  | "MODEL_UNAVAILABLE"
  | "NETWORK_ERROR";

export class StructuredProviderError extends Error {
  constructor(
    public readonly status: ConnectionStatus,
    public readonly detail: string,
  ) {
    super(detail);
    this.name = "StructuredProviderError";
  }
}

function toStructuredError(err: unknown): StructuredProviderError {
  if (err instanceof StructuredProviderError) return err;

  if (err instanceof XKiroApiError) {
    if (err.status === 401 || err.status === 403) {
      return new StructuredProviderError("AUTH_ERROR", "XKiro API rejected the API key.");
    }
    if (err.status === 429) {
      return new StructuredProviderError("RATE_LIMITED", "XKiro API rate limit exceeded.");
    }
    if (err.status === 404) {
      return new StructuredProviderError(
        "MODEL_UNAVAILABLE",
        "XKiro API reports the requested model is unavailable.",
      );
    }
    return new StructuredProviderError("NETWORK_ERROR", err.message);
  }

  if (err instanceof Error && err.name === "AbortError") {
    return new StructuredProviderError("NETWORK_ERROR", "Request to XKiro API timed out.");
  }

  return new StructuredProviderError(
    "NETWORK_ERROR",
    err instanceof Error ? err.message : "Unknown network error contacting XKiro API.",
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
