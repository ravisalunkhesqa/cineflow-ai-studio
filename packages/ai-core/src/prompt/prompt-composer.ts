import { FIELD_ORDER, StructuredPromptSchema, type StructuredPrompt } from "@cineflow/shared";
import type { ModelRouter } from "../registry/model-router";

/**
 * Deterministic structured → raw-text assembly. No AI call needed — this always
 * works even with zero provider configured, since the Prompt Composer's
 * STRUCTURED/RAW toggle must function offline (brief §21: "never unnecessarily
 * overwrite user text" — this is the mechanical composition path, not the AI one).
 */
export function composeRawPrompt(structured: StructuredPrompt): string {
  const parts = FIELD_ORDER.map((key) => structured[key]).filter(
    (v): v is string => typeof v === "string" && v.trim().length > 0,
  );
  return parts.join(", ");
}

export interface EnhancePromptInput {
  idea: string;
  /** Free-text context assembled by the caller (scene, style bible, referenced characters/locations). */
  shotContext: string;
}

export interface EnhancePromptResult {
  structured: StructuredPrompt;
  rawPrompt: string;
  modelUsed: string;
}

const RESPONSE_INSTRUCTIONS = `Respond with ONLY a single JSON object (no markdown fences, no commentary) with these optional string keys: subject, action, environment, composition, camera, lens, cameraMovement, lighting, color, atmosphere, style, continuity, audio, negativePrompt. Fill in only the keys that make sense; omit others. Keep each value concise (under 25 words).`;

/**
 * Turns a basic idea into structured cinematic prompt fields using the configured
 * PROMPT_ENHANCEMENT model. Validates the model's JSON with Zod and attempts exactly
 * one repair pass on failure before giving up with a controlled error — never trusts
 * arbitrary LLM JSON (brief §49).
 */
export async function enhancePrompt(
  input: EnhancePromptInput,
  router: ModelRouter,
): Promise<EnhancePromptResult> {
  const route = router.resolve({ task: "PROMPT_ENHANCEMENT", modelId: "AUTO" });

  const userPrompt = [
    `Basic idea: "${input.idea}"`,
    "",
    "Shot context:",
    input.shotContext,
    "",
    RESPONSE_INSTRUCTIONS,
  ].join("\n");

  const response = await route.provider.chat({
    modelId: route.definition.modelId,
    messages: [
      {
        role: "system",
        content:
          "You are a cinematography prompt engineer. Turn a filmmaker's basic idea into " +
          "professional, structured cinematic direction. Never invent character or location " +
          "names that weren't given to you.",
      },
      { role: "user", content: userPrompt },
    ],
    jsonMode: true,
    maxTokens: 500,
  });

  const structured = parseStructuredPromptOrRepair(response.content);
  if (!structured) {
    // One repair attempt: ask the model to fix its own output against the schema.
    const repaired = await route.provider.chat({
      modelId: route.definition.modelId,
      messages: [
        { role: "system", content: "You output only valid JSON. Fix the following to be valid JSON matching the requested shape — output ONLY the corrected JSON." },
        { role: "user", content: response.content },
      ],
      jsonMode: true,
      maxTokens: 500,
    });
    const repairedStructured = parseStructuredPromptOrRepair(repaired.content);
    if (!repairedStructured) {
      throw new Error(
        "PROMPT_ENHANCEMENT_PARSE_FAILED: the model's response could not be parsed as " +
          "structured prompt JSON, even after one repair attempt. Try again or edit the " +
          "prompt fields manually.",
      );
    }
    return {
      structured: repairedStructured,
      rawPrompt: composeRawPrompt(repairedStructured),
      modelUsed: route.definition.displayName,
    };
  }

  return {
    structured,
    rawPrompt: composeRawPrompt(structured),
    modelUsed: route.definition.displayName,
  };
}

function parseStructuredPromptOrRepair(raw: string): StructuredPrompt | null {
  const stripped = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    const json = JSON.parse(stripped);
    const result = StructuredPromptSchema.safeParse(json);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
