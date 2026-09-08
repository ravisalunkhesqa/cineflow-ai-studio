import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@cineflow/database";

const StyleBibleInputSchema = z.object({
  visualStyle: z.string().max(300).optional(),
  colorPalette: z.string().max(300).optional(),
  lighting: z.string().max(300).optional(),
  contrast: z.string().max(200).optional(),
  filmStockLook: z.string().max(200).optional(),
  cameraFormat: z.string().max(200).optional(),
  lensStyle: z.string().max(200).optional(),
  depthOfField: z.string().max(200).optional(),
  composition: z.string().max(300).optional(),
  texture: z.string().max(200).optional(),
  era: z.string().max(200).optional(),
  productionDesign: z.string().max(500).optional(),
  wardrobeStyle: z.string().max(500).optional(),
  skinRendering: z.string().max(200).optional(),
  motionStyle: z.string().max(200).optional(),
  negativeConstraints: z.array(z.string().max(200)).default([]),
  locked: z.boolean().optional(),
});

export async function styleBibleRoutes(app: FastifyInstance) {
  app.get("/api/projects/:projectId/style-bible", async (req, reply) => {
    const { projectId } = req.params as { projectId: string };
    const styleBible = await prisma.styleBible.findUnique({ where: { projectId } });
    if (!styleBible) {
      return reply
        .status(404)
        .send({ error: "NOT_FOUND", message: `No style bible found for project "${projectId}".` });
    }
    return reply.send({ styleBible });
  });

  app.patch("/api/projects/:projectId/style-bible", async (req, reply) => {
    const { projectId } = req.params as { projectId: string };
    const parsed = StyleBibleInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: "VALIDATION_ERROR", message: "Invalid style bible payload.", issues: parsed.error.issues });
    }

    const existing = await prisma.styleBible.findUnique({ where: { projectId } });
    if (existing?.locked && parsed.data.locked !== false) {
      return reply.status(409).send({
        error: "STYLE_LOCKED",
        message: "Style Bible is locked. Unlock it before making further changes.",
      });
    }

    const styleBible = await prisma.styleBible.upsert({
      where: { projectId },
      update: parsed.data,
      create: { projectId, ...parsed.data },
    });
    return reply.send({ styleBible });
  });
}
