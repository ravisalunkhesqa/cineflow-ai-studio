"use client";

import { useState } from "react";
import { Sparkles, LayoutGrid, Type, Check, X } from "lucide-react";
import { MentionTextarea, type MentionTag } from "./mention-textarea";
import { PROMPT_TEMPLATES } from "./prompt-templates";
import {
  composePrompt,
  enhancePrompt,
  type StructuredPrompt,
} from "@/lib/api-client";
import { FIELD_LABELS, FIELD_ORDER } from "@cineflow/shared";

export function PromptComposerPanel({
  projectId,
  shotId,
  prompt,
  negativePrompt,
  locked,
  mentionTags,
  onApply,
}: {
  projectId: string;
  shotId: string;
  prompt: string;
  negativePrompt: string;
  locked: boolean;
  mentionTags: MentionTag[];
  onApply: (patch: { prompt?: string; negativePrompt?: string }) => void;
}) {
  const [view, setView] = useState<"raw" | "structured">("raw");
  const [structured, setStructured] = useState<StructuredPrompt>({});
  const [idea, setIdea] = useState("");
  const [enhancing, setEnhancing] = useState(false);
  const [composing, setComposing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<{ structured: StructuredPrompt; rawPrompt: string; model: string } | null>(
    null,
  );

  function updateField(key: keyof StructuredPrompt, value: string) {
    setStructured((prev) => ({ ...prev, [key]: value || undefined }));
  }

  async function handleComposeFromFields() {
    setComposing(true);
    setError(null);
    try {
      const result = await composePrompt(projectId, shotId, structured);
      onApply({ prompt: result.rawPrompt, negativePrompt: structured.negativePrompt });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setComposing(false);
    }
  }

  async function handleEnhance() {
    if (!idea.trim()) return;
    setEnhancing(true);
    setError(null);
    setProposal(null);
    try {
      const result = await enhancePrompt(projectId, shotId, idea.trim());
      setProposal(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEnhancing(false);
    }
  }

  function acceptProposal() {
    if (!proposal) return;
    setStructured(proposal.structured);
    onApply({ prompt: proposal.rawPrompt, negativePrompt: proposal.structured.negativePrompt });
    setProposal(null);
    setIdea("");
    setView("structured");
  }

  function applyTemplate(preset: Partial<StructuredPrompt>) {
    setStructured((prev) => ({ ...prev, ...preset }));
  }

  return (
    <div className="rounded-lg border border-border bg-panel/50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
          <button
            onClick={() => setView("raw")}
            className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${
              view === "raw" ? "bg-panel-raised text-text-primary" : "text-text-muted"
            }`}
          >
            <Type className="h-3 w-3" strokeWidth={1.75} />
            Raw
          </button>
          <button
            onClick={() => setView("structured")}
            className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${
              view === "structured" ? "bg-panel-raised text-text-primary" : "text-text-muted"
            }`}
          >
            <LayoutGrid className="h-3 w-3" strokeWidth={1.75} />
            Structured
          </button>
        </div>

        {view === "structured" && (
          <select
            onChange={(e) => {
              const tpl = PROMPT_TEMPLATES.find((t) => t.name === e.target.value);
              if (tpl) applyTemplate(tpl.preset);
              e.target.value = "";
            }}
            defaultValue=""
            disabled={locked}
            className="rounded-md border border-border bg-panel px-2 py-1 text-xs text-text-secondary disabled:opacity-40"
          >
            <option value="" disabled>
              Apply template…
            </option>
            {PROMPT_TEMPLATES.map((t) => (
              <option key={t.name} value={t.name}>
                {t.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {error && (
        <div className="mb-3 rounded-md border border-status-danger/30 bg-status-danger/10 px-3 py-2 text-xs text-status-danger">
          {error}
        </div>
      )}

      {/* AI Enhance */}
      <div className="mb-4 flex items-center gap-2">
        <input
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleEnhance()}
          disabled={locked}
          placeholder="Basic idea, e.g. 'Woman discovers a photo' — Enhance with AI"
          className="flex-1 rounded-md border border-border bg-panel px-3 py-2 text-xs text-text-primary outline-none focus:border-accent-soft disabled:opacity-40"
        />
        <button
          onClick={handleEnhance}
          disabled={locked || enhancing || !idea.trim()}
          className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-xs font-medium text-white hover:bg-accent-soft disabled:opacity-40"
        >
          <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />
          {enhancing ? "Enhancing…" : "Enhance"}
        </button>
      </div>

      {proposal && (
        <div className="mb-4 rounded-md border border-accent-soft/40 bg-accent/5 p-3">
          <p className="mb-1 text-[10px] text-accent-glow">Proposed by {proposal.model} — review before applying</p>
          <p className="mb-2 text-xs text-text-secondary">{proposal.rawPrompt}</p>
          <div className="flex gap-2">
            <button
              onClick={acceptProposal}
              className="flex items-center gap-1 rounded-md bg-accent px-2.5 py-1 text-[11px] font-medium text-white hover:bg-accent-soft"
            >
              <Check className="h-3 w-3" strokeWidth={2} />
              Use This
            </button>
            <button
              onClick={() => setProposal(null)}
              className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-[11px] text-text-secondary hover:text-text-primary"
            >
              <X className="h-3 w-3" strokeWidth={2} />
              Discard
            </button>
          </div>
        </div>
      )}

      {view === "raw" ? (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-text-muted">Prompt</label>
            <MentionTextarea
              value={prompt}
              onChange={() => {}}
              onBlurCommit={(v) => onApply({ prompt: v })}
              tags={mentionTags}
              rows={3}
              placeholder="Describe the shot — type @ to reference a character or location"
              className="w-full resize-none rounded-md border border-border bg-panel px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-soft disabled:opacity-50"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-text-muted">Negative Prompt</label>
            <textarea
              defaultValue={negativePrompt}
              onBlur={(e) => onApply({ negativePrompt: e.target.value })}
              disabled={locked}
              rows={2}
              className="w-full resize-none rounded-md border border-border bg-panel px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-soft disabled:opacity-50"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {FIELD_ORDER.map((key) => (
              <div key={key}>
                <label className="mb-1 block text-xs text-text-muted">{FIELD_LABELS[key]}</label>
                <input
                  value={structured[key] ?? ""}
                  onChange={(e) => updateField(key, e.target.value)}
                  disabled={locked}
                  className="w-full rounded-md border border-border bg-panel px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-accent-soft disabled:opacity-50"
                />
              </div>
            ))}
          </div>
          <div>
            <label className="mb-1 block text-xs text-text-muted">{FIELD_LABELS.negativePrompt}</label>
            <input
              value={structured.negativePrompt ?? ""}
              onChange={(e) => updateField("negativePrompt", e.target.value)}
              disabled={locked}
              className="w-full rounded-md border border-border bg-panel px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-accent-soft disabled:opacity-50"
            />
          </div>
          <button
            onClick={handleComposeFromFields}
            disabled={locked || composing}
            className="rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary hover:border-accent-soft hover:text-text-primary disabled:opacity-40"
          >
            {composing ? "Composing…" : "Compose → Update Prompt"}
          </button>
        </div>
      )}
    </div>
  );
}
