import type { TaskType } from "@cineflow/shared";
import type { ModelRegistry, ResolvedModel } from "../registry/model-registry";
import { ProviderCapabilityError } from "@cineflow/provider-sdk";

export interface RouteRequest {
  task: TaskType;
  /** "AUTO" lets the router pick; otherwise pass a specific modelId (brief §6). */
  modelId?: string | "AUTO";
}

export interface RouteResult extends ResolvedModel {
  /** Set when AUTO selection or a fallback chain picked something other than a manual request. */
  fallbackFrom?: string;
}

export class ModelRouter {
  constructor(private readonly registry: ModelRegistry) {}

  resolve(request: RouteRequest): RouteResult {
    if (request.modelId && request.modelId !== "AUTO") {
      const def = this.registry.getModel(request.modelId);
      if (!def) {
        throw new Error(`Unknown model "${request.modelId}". Configure it in packages/config first.`);
      }
      const provider = this.registry.getProviderFor(request.modelId);
      if (!provider) {
        throw new Error(
          `Model "${request.modelId}" is registered but its provider is not configured ` +
            `(missing API key?). Check Settings → AI Models.`,
        );
      }
      return { definition: def, provider };
    }

    // AUTO: resolve via task defaults, with an explicit (not silent) fallback per §81.
    const resolved = this.registry.resolveForTask(request.task);
    if (!resolved) {
      throw new Error(
        `No configured model is available for task "${request.task}". ` +
          `Set XTROUTER_API_KEY and check Settings → AI Models.`,
      );
    }
    return resolved;
  }

  /**
   * Convenience guard for capability-gated calls elsewhere in the app — callers
   * should check this before invoking an optional AIProvider method.
   */
  assertCapability(modelId: string, capability: Parameters<ModelRegistry["hasCapability"]>[1]): void {
    if (!this.registry.hasCapability(modelId, capability)) {
      const def = this.registry.getModel(modelId);
      throw new ProviderCapabilityError(def?.providerKey ?? "unknown", capability);
    }
  }
}
