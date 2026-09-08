import type { FastifyInstance } from "fastify";
import { StructuredPromptSchema } from "@cineflow/shared";
import { prisma } from "@cineflow/database";
import {
  assembleShotContext,
  composeRawPrompt,
  enhancePrompt,
  getModelRegistry,
  ModelRouter,
} from "@cineflow/ai-core";
import { z } from "zod";

const EnhanceInputSchema = z.object({
  idea: z.string().min(1).max(500),
});

export async function promptsRoutes(app: FastifyInstance) {
  // Deterministic structured -> raw assembly. Works with zero AI provider configured.
  app.post("/api/projects/:projectId/shots/:shotId/prompt/compose", async (req, reply) => {
    const { projectId, shotId } = req.params as { projectId: string; shotId: string };
    const parsed = StructuredPromptSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: "VALIDATION_ERROR", message: "Invalid structured prompt payload.", issues: parsed.error.issues });
    }

    const shot = await prisma.shot.findFirst({ where: { id: shotId, projectId } });
    if (!shot) {
      return reply.status(404).send({ error: "NOT_FOUND", message: `No shot found with id "${shotId}".` });
    }

    const rawPrompt = composeRawPrompt(parsed.data);
    return reply.send({ structured: parsed.data, rawPrompt });
  });

  // AI-assisted: turns a basic idea into structured cinematic fields + composed raw prompt.
  // Does NOT save anything — the client must accept the proposal and PATCH the shot itself
  // (brief §83: propose -> validate -> preview -> accept -> apply, never a direct AI write).
  app.post("/api/projects/:projectId/shots/:shotId/prompt/enhance", async (req, reply) => {
    const { projectId, shotId } = req.params as { projectId: string; shotId: string };
    const parsed = EnhanceInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: "VALIDATION_ERROR", message: "Provide a short idea (max 500 chars).", issues: parsed.error.issues });
    }

    const shot = await prisma.shot.findFirst({ where: { id: shotId, projectId } });
    if (!shot) {
      return reply.status(404).send({ error: "NOT_FOUND", message: `No shot found with id "${shotId}".` });
    }
    if (shot.status === "LOCKED") {
      return reply.status(409).send({
        error: "SHOT_LOCKED",
        message: "This shot is locked. Unlock it (change its status) before enhancing its prompt.",
      });
    }

    const router = new ModelRouter(getModelRegistry());
    let shotContext: string;
    try {
      shotContext = await assembleShotContext(projectId, shotId);
    } catch (err) {
      return reply.status(404).send({ error: "NOT_FOUND", message: (err as Error).message });
    }

    try {
      const result = await enhancePrompt({ idea: parsed.data.idea, shotContext }, router);

      // Persist a Prompt row for traceability (brief §30 Generation History spirit) —
      // this is a record of what was proposed, independent of whether the user accepts it.
      const promptRecord = await prisma.prompt.create({
        data: {
          projectId,
          name: `Shot ${shot.shotNumber} — AI enhance`,
          structured: result.structured,
          rawText: result.rawPrompt,
        },
      });

      return reply.send({
        structured: result.structured,
        rawPrompt: result.rawPrompt,
        model: result.modelUsed,
        promptRecordId: promptRecord.id,
      });
    } catch (err) {
      const message = (err as Error).message;
      const status = message.includes("No configured model") ? 503 : 502;
      return reply.status(status).send({
        error: status === 503 ? "PROVIDER_NOT_CONFIGURED" : "PROMPT_ENHANCEMENT_FAILED",
        message,
      });
    }
  });
}
