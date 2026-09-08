import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@cineflow/database";
import { assembleProjectContext, getModelRegistry, ModelRouter } from "@cineflow/ai-core";

const SendMessageSchema = z.object({
  message: z.string().min(1).max(4000),
});

/**
 * Flow Agent v0: a single ongoing conversation per project (auto-created on first
 * message), grounded by ContextAssembler rather than dumping the whole project into
 * every call. This is intentionally READ-ONLY — see packages/ai-core/src/agent/tools.ts
 * for why write tools (updateShot, reorderShots, ...) aren't wired in yet: they need
 * the propose → validate → preview → accept pipeline from brief §83 built first.
 *
 * TODO(Phase 5): route to a dedicated task type once the Prompt Composer defines one;
 * for now this uses "IDEATION" so MiniMax M3 (general creative planning, per
 * packages/config) answers general Flow Agent questions.
 */
export async function agentRoutes(app: FastifyInstance) {
  async function getOrCreateConversation(projectId: string) {
    const existing = await prisma.conversation.findFirst({
      where: { projectId },
      orderBy: { createdAt: "asc" },
    });
    if (existing) return existing;
    return prisma.conversation.create({ data: { projectId, title: "Flow Agent" } });
  }

  app.get("/api/projects/:projectId/agent/messages", async (req, reply) => {
    const { projectId } = req.params as { projectId: string };
    const conversation = await getOrCreateConversation(projectId);
    const messages = await prisma.conversationMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "asc" },
    });
    return reply.send({ conversationId: conversation.id, messages });
  });

  app.post("/api/projects/:projectId/agent/messages", async (req, reply) => {
    const { projectId } = req.params as { projectId: string };
    const parsed = SendMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: "VALIDATION_ERROR", message: "Message is required (max 4000 chars).", issues: parsed.error.issues });
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return reply.status(404).send({ error: "NOT_FOUND", message: `No project found with id "${projectId}".` });
    }

    const registry = getModelRegistry();
    const router = new ModelRouter(registry);

    let route;
    try {
      route = router.resolve({ task: "IDEATION", modelId: "AUTO" });
    } catch (err) {
      return reply.status(503).send({
        error: "PROVIDER_NOT_CONFIGURED",
        message:
          (err as Error).message +
          " Set XTROUTER_API_KEY in your .env.local and restart the API to enable Flow Agent.",
      });
    }

    const conversation = await getOrCreateConversation(projectId);

    const history = await prisma.conversationMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "asc" },
      take: 20, // keep the window bounded — this is v0, full ContextAssembler token budgeting is Phase 5+
    });

    const { systemPrompt } = await assembleProjectContext(projectId);

    const userMessage = await prisma.conversationMessage.create({
      data: { conversationId: conversation.id, role: "user", content: parsed.data.message },
    });

    try {
      const response = await route.provider.chat({
        modelId: route.definition.modelId,
        messages: [
          { role: "system", content: systemPrompt },
          ...history.map((m: { role: string; content: string }) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
          { role: "user", content: parsed.data.message },
        ],
        maxTokens: 800,
      });

      const assistantMessage = await prisma.conversationMessage.create({
        data: { conversationId: conversation.id, role: "assistant", content: response.content },
      });

      return reply.send({
        conversationId: conversation.id,
        userMessage,
        assistantMessage,
        model: route.definition.displayName,
      });
    } catch (err) {
      req.log.error({ err: (err as Error).message }, "flow agent chat call failed");
      return reply.status(502).send({
        error: "PROVIDER_ERROR",
        message:
          "Flow Agent couldn't reach the AI provider: " +
          (err as Error).message +
          " Your message was saved — try again once the provider is reachable.",
      });
    }
  });
}
