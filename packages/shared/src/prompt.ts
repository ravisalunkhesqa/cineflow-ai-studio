import { z } from "zod";

/**
 * Structured Prompt (brief §21) — the Prompt Composer represents a shot's prompt as
 * these fields internally, with a raw-text view derived from (or overriding) them.
 * All fields optional: a user or the AI may only fill in a few.
 */
export const StructuredPromptSchema = z.object({
  subject: z.string().max(300).optional(),
  action: z.string().max(300).optional(),
  environment: z.string().max(300).optional(),
  composition: z.string().max(200).optional(),
  camera: z.string().max(200).optional(),
  lens: z.string().max(100).optional(),
  cameraMovement: z.string().max(200).optional(),
  lighting: z.string().max(200).optional(),
  color: z.string().max(200).optional(),
  atmosphere: z.string().max(200).optional(),
  style: z.string().max(200).optional(),
  continuity: z.string().max(300).optional(),
  audio: z.string().max(200).optional(),
  negativePrompt: z.string().max(300).optional(),
});

export type StructuredPrompt = z.infer<typeof StructuredPromptSchema>;

export const FIELD_ORDER: (keyof StructuredPrompt)[] = [
  "subject",
  "action",
  "environment",
  "composition",
  "camera",
  "lens",
  "cameraMovement",
  "lighting",
  "color",
  "atmosphere",
  "style",
  "continuity",
  "audio",
];

export const FIELD_LABELS: Record<keyof StructuredPrompt, string> = {
  subject: "Subject",
  action: "Action",
  environment: "Environment",
  composition: "Composition",
  camera: "Camera",
  lens: "Lens",
  cameraMovement: "Camera Movement",
  lighting: "Lighting",
  color: "Color",
  atmosphere: "Atmosphere",
  style: "Style",
  continuity: "Continuity",
  audio: "Audio",
  negativePrompt: "Negative Prompt",
};
