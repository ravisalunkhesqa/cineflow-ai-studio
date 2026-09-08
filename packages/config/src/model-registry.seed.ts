import type {
  ModelDefinitionConfig,
  ProviderDefinitionConfig,
} from "@cineflow/shared";

/**
 * Initial provider registry.
 *
 * This is the ONLY place provider base URLs are declared. Application code
 * must resolve providers/models through the ModelRegistry service, never by
 * hard-coding a model string inline.
 */
export const INITIAL_PROVIDERS: ProviderDefinitionConfig[] = [
  {
    key: "xkiro",
    displayName: "XKiro",
    baseUrl: process.env.XKIRO_BASE_URL ?? "https://api.xkiro.com/v1",
    enabled: true,
  },
];

/**
 * Initial model registry.
 *
 * CAPABILITY POLICY:
 * - Only TEXT is marked true for models whose multimodal/video/image output
 *   has not been verified against real XKiro API documentation or live
 *   responses. This follows rule #6/#7/#8 of the project brief: never assume
 *   video/image generation support merely because a model name implies it.
 * - When a capability is verified (e.g. by a successful provider health
 *   check or documented API behavior), update this file and re-seed —
 *   do not flip capability flags inside business logic.
 */
export const INITIAL_MODELS: ModelDefinitionConfig[] = [
  {
    id: "xkiro-gpt-5.3-codex-spark",
    providerKey: "xkiro",
    modelId: "openai/gpt-5.3-codex-spark",
    displayName: "GPT-5.3 Codex Spark",
    capabilities: ["TEXT", "JSON_MODE", "TOOL_CALLING"],
    enabled: true,
    isDefaultFor: ["TECHNICAL_CODE", "WORKFLOW_CREATION"],
    notes: "Coding / technical assistant. Used for workflow JSON generation and schema work.",
  },
  {
    id: "xkiro-qwen3.8-max",
    providerKey: "xkiro",
    modelId: "qwen/qwen3.8-max:free",
    displayName: "Qwen3.8 Max (free)",
    capabilities: ["TEXT"],
    enabled: true,
    isDefaultFor: ["SHOT_PLANNING", "SCRIPT"],
    notes:
      "Configured for filmmaking reasoning / shot planning / scene descriptions. " +
      "VIDEO_OUTPUT and VISION intentionally NOT enabled until verified against real API responses.",
  },
  {
    id: "xkiro-qwen3.7-plus",
    providerKey: "xkiro",
    modelId: "qwen/qwen3.7-plus:free",
    displayName: "Qwen3.7 Plus (free)",
    capabilities: ["TEXT"],
    enabled: true,
    isDefaultFor: ["CONTINUITY_ANALYSIS"],
    notes: "Used for storyboard/video prompt drafting and continuity reasoning (text-only, verified).",
  },
  {
    id: "xkiro-qwen3.5-omni-plus",
    providerKey: "xkiro",
    modelId: "qwen/qwen3.5-omni-plus:free",
    displayName: "Qwen3.5 Omni Plus (free)",
    capabilities: ["TEXT"],
    enabled: true,
    isDefaultFor: [],
    notes:
      "Name implies multimodal ('omni') capability, but VISION/IMAGE_INPUT/VIDEO_INPUT are left " +
      "disabled until confirmed via a real API response. Enable explicitly once verified.",
  },
  {
    id: "xkiro-mistral-medium-3.5",
    providerKey: "xkiro",
    modelId: "mistralai/mistral-medium-3.5",
    displayName: "Mistral Medium 3.5",
    capabilities: ["TEXT", "JSON_MODE"],
    enabled: true,
    isDefaultFor: ["IMAGE_PROMPT", "CHARACTER_DESIGN", "PROMPT_ENHANCEMENT"],
    notes: "Prompt generation, script and character descriptions, rewriting.",
  },
  {
    id: "xkiro-minimax-m3",
    providerKey: "xkiro",
    modelId: "minimax/minimax-m3:free",
    displayName: "MiniMax M3",
    capabilities: ["TEXT"],
    enabled: true,
    isDefaultFor: ["IDEATION", "DIALOGUE"],
    notes: "General creative planning, cinematic prompt refinement, alternative concepts.",
  },
];
