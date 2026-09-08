"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, HelpCircle, Zap } from "lucide-react";
import { listModels, testConnection, type ModelInfo, type ProviderInfo, type ConnectionTestResult } from "@/lib/api-client";

const STATUS_STYLES: Record<string, string> = {
  CONNECTED: "text-status-success",
  AUTH_ERROR: "text-status-danger",
  RATE_LIMITED: "text-status-warning",
  MODEL_UNAVAILABLE: "text-status-warning",
  NETWORK_ERROR: "text-status-danger",
  NOT_CONFIGURED: "text-text-muted",
};

export default function ModelsSettingsPage() {
  const [providers, setProviders] = useState<ProviderInfo[] | null>(null);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [testResults, setTestResults] = useState<Record<string, ConnectionTestResult>>({});
  const [testing, setTesting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listModels()
      .then((data) => {
        setProviders(data.providers);
        setModels(data.models);
      })
      .catch((err) => setError((err as Error).message));
  }, []);

  async function handleTest(providerKey: string) {
    setTesting(providerKey);
    try {
      const results = await testConnection(providerKey);
      setTestResults((prev) => {
        const next = { ...prev };
        for (const r of results) next[r.providerKey] = r;
        return next;
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setTesting(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <h1 className="mb-1 text-xl font-semibold text-text-primary">AI Models</h1>
      <p className="mb-8 text-sm text-text-secondary">
        Providers and models are configured in <code className="rounded bg-panel-raised px-1 py-0.5">packages/config</code> —
        never hard-coded in application code. Capabilities beyond TEXT are only enabled
        once verified against a real API response.
      </p>

      {error && (
        <div className="mb-6 rounded-md border border-status-warning/30 bg-status-warning/10 px-4 py-3 text-sm text-status-warning">
          {error}
        </div>
      )}

      {providers === null && !error && <p className="text-sm text-text-muted">Loading…</p>}

      <div className="space-y-8">
        {providers?.map((provider) => {
          const providerModels = models.filter((m) => m.providerKey === provider.key);
          const result = testResults[provider.key];
          return (
            <div key={provider.key} className="rounded-lg border border-border bg-panel">
              <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-medium text-text-primary">{provider.displayName}</h2>
                    {provider.configured ? (
                      <span className="text-[10px] rounded-full border border-status-success/40 px-2 py-0.5 text-status-success">
                        Configured
                      </span>
                    ) : (
                      <span className="text-[10px] rounded-full border border-status-warning/40 px-2 py-0.5 text-status-warning">
                        Not configured
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-text-muted">{provider.baseUrl}</p>
                </div>
                <div className="flex items-center gap-3">
                  {result && (
                    <span className={`flex items-center gap-1.5 text-xs ${STATUS_STYLES[result.status]}`}>
                      {result.status === "CONNECTED" ? (
                        <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
                      ) : result.status === "NOT_CONFIGURED" ? (
                        <HelpCircle className="h-3.5 w-3.5" strokeWidth={2} />
                      ) : (
                        <XCircle className="h-3.5 w-3.5" strokeWidth={2} />
                      )}
                      {result.status.replace(/_/g, " ")}
                    </span>
                  )}
                  <button
                    onClick={() => handleTest(provider.key)}
                    disabled={testing === provider.key || !provider.configured}
                    title={!provider.configured ? "Set XTROUTER_API_KEY in .env.local first" : undefined}
                    className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary hover:border-accent-soft hover:text-text-primary disabled:opacity-40"
                  >
                    <Zap className="h-3.5 w-3.5" strokeWidth={1.75} />
                    {testing === provider.key ? "Testing…" : "Test Connection"}
                  </button>
                </div>
              </div>

              <div className="divide-y divide-border-subtle">
                {providerModels.map((model) => (
                  <div key={model.id} className="flex items-start justify-between gap-4 px-5 py-3">
                    <div>
                      <p className="text-sm text-text-primary">{model.displayName}</p>
                      <p className="mt-0.5 font-mono text-xs text-text-muted">{model.modelId}</p>
                      {model.notes && <p className="mt-1 max-w-md text-xs text-text-muted">{model.notes}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex flex-wrap justify-end gap-1">
                        {model.capabilities.map((cap) => (
                          <span
                            key={cap}
                            className="rounded border border-border-subtle px-1.5 py-0.5 text-[10px] text-text-secondary"
                          >
                            {cap}
                          </span>
                        ))}
                      </div>
                      {model.isDefaultFor.length > 0 && (
                        <span className="text-[10px] text-accent-glow">
                          Default: {model.isDefaultFor.join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
