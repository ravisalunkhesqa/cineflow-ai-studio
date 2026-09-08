import { z } from "zod";
import { CAPABILITIES, TASK_TYPES } from "./capabilities";

export const ModelDefinitionSchema = z.object({
  id: z.string(),
  providerKey: z.string(), // e.g. "xkiro"
  modelId: z.string(), // e.g. "qwen/qwen3.8-max:free" — never hard-coded in app logic
  displayName: z.string(),
  capabilities: z.array(z.enum(CAPABILITIES)),
  enabled: z.boolean().default(true),
  isDefaultFor: z.array(z.enum(TASK_TYPES)).default([]),
  notes: z.string().optional(),
});
export type ModelDefinitionConfig = z.infer<typeof ModelDefinitionSchema>;

export const ProviderDefinitionSchema = z.object({
  key: z.string(),
  displayName: z.string(),
  baseUrl: z.string().url(),
  enabled: z.boolean().default(true),
});
export type ProviderDefinitionConfig = z.infer<typeof ProviderDefinitionSchema>;
