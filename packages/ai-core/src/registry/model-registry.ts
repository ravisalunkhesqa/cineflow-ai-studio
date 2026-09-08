import { INITIAL_MODELS, INITIAL_PROVIDERS } from "@cineflow/config";
import type { Capability, ModelDefinitionConfig, ProviderDefinitionConfig, TaskType } from "@cineflow/shared";
import type { AIProvider } from "@cineflow/provider-sdk";
import { XKiroProvider } from "../providers/xkiro-provider";

export interface ResolvedModel {
  definition: ModelDefinitionConfig;
  provider: AIProvider;
}

/**
 * ModelRegistry is the single place that turns config (packages/config) + runtime
 * secrets (XTROUTER_API_KEY) into usable AIProvider instances. Application code asks
 * this registry for "the model for task X" — it never imports a model ID string
 * itself (brief rule #3/#4).
 */
export class ModelRegistry {
  private readonly providers = new Map<string, AIProvider>();
  private readonly providerDefs: ProviderDefinitionConfig[];
  private readonly modelDefs: ModelDefinitionConfig[];

  constructor(
    providerDefs: ProviderDefinitionConfig[] = INITIAL_PROVIDERS,
    modelDefs: ModelDefinitionConfig[] = INITIAL_MODELS,
  ) {
    this.providerDefs = providerDefs;
    this.modelDefs = modelDefs;

    for (const def of providerDefs) {
      if (!def.enabled) continue;
      if (def.key === "xkiro") {
        const apiKey = process.env.XTROUTER_API_KEY;
        if (apiKey) {
          this.providers.set(def.key, new XKiroProvider({ baseUrl: def.baseUrl, apiKey }));
        }
        // If no API key is configured, the provider is intentionally left unregistered —
        // callers get a clear NOT_CONFIGURED style error rather than a silent failure.
      }
      // Future providers (Google/Runway/ElevenLabs/...) register here without touching
      // any application code that calls ModelRegistry.
    }
  }

  isConfigured(providerKey: string): boolean {
    return this.providers.has(providerKey);
  }

  listModels(): ModelDefinitionConfig[] {
    return this.modelDefs;
  }

  listProviders(): (ProviderDefinitionConfig & { configured: boolean })[] {
    return this.providerDefs.map((p) => ({ ...p, configured: this.providers.has(p.key) }));
  }

  getModel(modelId: string): ModelDefinitionConfig | undefined {
    return this.modelDefs.find((m) => m.modelId === modelId || m.id === modelId);
  }

  getProviderFor(modelId: string): AIProvider | undefined {
    const def = this.getModel(modelId);
    if (!def) return undefined;
    return this.providers.get(def.providerKey);
  }

  /** Resolve the default model for a task, per §6/§81 (AUTO selection + fallback chain). */
  resolveForTask(task: TaskType): ResolvedModel | undefined {
    const candidates = this.modelDefs.filter(
      (m) => m.enabled && m.isDefaultFor.includes(task),
    );
    for (const candidate of candidates) {
      const provider = this.providers.get(candidate.providerKey);
      if (provider) return { definition: candidate, provider };
    }
    // Fallback: any enabled TEXT-capable model with a configured provider.
    const fallback = this.modelDefs.find(
      (m) => m.enabled && m.capabilities.includes("TEXT") && this.providers.has(m.providerKey),
    );
    if (fallback) {
      const provider = this.providers.get(fallback.providerKey);
      if (provider) return { definition: fallback, provider };
    }
    return undefined;
  }

  hasCapability(modelId: string, capability: Capability): boolean {
    return this.getModel(modelId)?.capabilities.includes(capability) ?? false;
  }
}

let sharedRegistry: ModelRegistry | undefined;

/** Process-wide singleton, mirroring the Prisma client singleton pattern. */
export function getModelRegistry(): ModelRegistry {
  if (!sharedRegistry) sharedRegistry = new ModelRegistry();
  return sharedRegistry;
}
