/**
 * Explicit provider/model capabilities.
 *
 * IMPORTANT: A model's name or marketing description must NEVER be used to infer
 * capability. Capabilities must be explicitly configured in the Model Registry
 * (see @cineflow/ai-core) and verified against real API docs/responses before
 * being marked true. See rule #6/#7 in the project brief.
 */
export const CAPABILITIES = [
  "TEXT",
  "IMAGE_INPUT",
  "IMAGE_OUTPUT",
  "VIDEO_INPUT",
  "VIDEO_OUTPUT",
  "AUDIO_INPUT",
  "AUDIO_OUTPUT",
  "VISION",
  "STREAMING",
  "JSON_MODE",
  "TOOL_CALLING",
  "REFERENCE_IMAGES",
] as const;

export type Capability = (typeof CAPABILITIES)[number];

/**
 * Task types the ModelRouter can select a model for.
 */
export const TASK_TYPES = [
  "IDEATION",
  "SCRIPT",
  "SHOT_PLANNING",
  "IMAGE_PROMPT",
  "VIDEO_PROMPT",
  "CONTINUITY_ANALYSIS",
  "DIALOGUE",
  "CHARACTER_DESIGN",
  "WORKFLOW_CREATION",
  "TECHNICAL_CODE",
  "PROMPT_ENHANCEMENT",
] as const;

export type TaskType = (typeof TASK_TYPES)[number];

export const JOB_STATUSES = [
  "QUEUED",
  "PROCESSING",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
] as const;

export type JobStatusValue = (typeof JOB_STATUSES)[number];

export const JOB_TYPES = [
  "AI_TEXT",
  "IMAGE_GENERATION",
  "VIDEO_GENERATION",
  "AUDIO_GENERATION",
  "FRAME_EXTRACTION",
  "THUMBNAIL_GENERATION",
  "VIDEO_EXPORT",
  "WORKFLOW_EXECUTION",
] as const;

export type JobType = (typeof JOB_TYPES)[number];
