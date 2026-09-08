import type { FastifyInstance } from "fastify";
import { getModelRegistry } from "@cineflow/ai-core";

export async function modelsRoutes(app: FastifyInstance) {
  // Settings → AI Models screen (brief §46): provider, model, capability, configured.
  app.get("/api/models", async (_req, reply) => {
    const registry = getModelRegistry();
    const models = registry.listModels().map((m) => ({
      ...m,
      configured: registry.isConfigured(m.providerKey),
    }));
    const providers = registry.listProviders();
    return reply.send({ providers, models });
  });

  // "TEST CONNECTION" (brief §45): sends a minimal safe request per configured provider.
  app.post("/api/models/test-connection", async (req, reply) => {
    const { providerKey } = (req.body as { providerKey?: string }) ?? {};
    const registry = getModelRegistry();
    const providers = registry.listProviders().filter((p) => !providerKey || p.key === providerKey);

    const results = await Promise.all(
      providers.map(async (p) => {
        if (!p.configured) {
          return { providerKey: p.key, status: "NOT_CONFIGURED" as const };
        }
        // Try enabled models until one succeeds; provider access can vary by model.
        const candidateModels = registry.listModels().filter((m) => m.providerKey === p.key && m.enabled);
        if (candidateModels.length === 0) {
          return { providerKey: p.key, status: "MODEL_UNAVAILABLE" as const };
        }
        const provider = registry.getProviderFor(candidateModels[0]!.modelId);
        if (!provider) {
          return { providerKey: p.key, status: "NOT_CONFIGURED" as const };
        }
        let lastError: { status: string; detail: string; modelId: string } | undefined;
        for (const model of candidateModels) {
          try {
            const result = await provider.chat({
              modelId: model.modelId,
              messages: [{ role: "user", content: "Reply with OK" }],
              maxTokens: 5,
            });
            return {
              providerKey: p.key,
              status: "CONNECTED" as const,
              modelId: model.modelId,
              sample: result.content,
            };
          } catch (err) {
            const status =
              err && typeof err === "object" && "status" in err
                ? ((err as { status: string }).status as
                    | "AUTH_ERROR"
                    | "RATE_LIMITED"
                    | "MODEL_UNAVAILABLE"
                    | "NETWORK_ERROR")
                : "NETWORK_ERROR";
            lastError = { status, detail: (err as Error).message, modelId: model.modelId };
          }
        }
        return { providerKey: p.key, ...lastError };
      }),
    );

    return reply.send({ results });
  });
}
