import { z } from "zod";

export const HealthComponentStatusSchema = z.enum([
  "OK",
  "DEGRADED",
  "DOWN",
  "NOT_CONFIGURED",
]);
export type HealthComponentStatus = z.infer<typeof HealthComponentStatusSchema>;

export const HealthResponseSchema = z.object({
  status: HealthComponentStatusSchema,
  timestamp: z.string(),
  components: z.object({
    api: HealthComponentStatusSchema,
    database: HealthComponentStatusSchema,
    redis: HealthComponentStatusSchema,
    minio: HealthComponentStatusSchema,
    ffmpeg: HealthComponentStatusSchema,
  }),
  details: z.record(z.string()).optional(),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
