import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@cineflow/database";

const SceneInputSchema = z.object({
  sceneNumber: z.number().int().min(1),
  intExt: z.string().max(20).optional(),
  locationId: z.string().optional(),
  timeOfDay: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
  duration: z.number().int().min(0).optional(),
  notes: z.string().max(2000).optional(),
});

export async function scenesRoutes(app: FastifyInstance) {
  app.get("/api/projects/:projectId/scenes", async (req, reply) => {
    const { projectId } = req.params as { projectId: string };
    const scenes = await prisma.scene.findMany({
      where: { projectId },
      include: { shots: { orderBy: { shotNumber: "asc" } }, _count: { select: { shots: true } } },
      orderBy: { sceneNumber: "asc" },
    });
    return reply.send({ scenes });
  });

  app.post("/api/projects/:projectId/scenes", async (req, reply) => {
    const { projectId } = req.params as { projectId: string };
    const parsed = SceneInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: "VALIDATION_ERROR", message: "Invalid scene payload.", issues: parsed.error.issues });
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return reply.status(404).send({ error: "NOT_FOUND", message: `No project found with id "${projectId}".` });
    }

    if (parsed.data.locationId) {
      const location = await prisma.location.findFirst({
        where: { id: parsed.data.locationId, projectId },
      });
      if (!location) {
        return reply.status(400).send({
          error: "VALIDATION_ERROR",
          message: "locationId does not reference a location in this project.",
        });
      }
    }

    const scene = await prisma.scene.create({ data: { projectId, ...parsed.data } });
    return reply.status(201).send({ scene });
  });

  app.patch("/api/projects/:projectId/scenes/:id", async (req, reply) => {
    const { projectId, id } = req.params as { projectId: string; id: string };
    const parsed = SceneInputSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: "VALIDATION_ERROR", message: "Invalid scene payload.", issues: parsed.error.issues });
    }

    const scene = await prisma.scene.findFirst({ where: { id, projectId } });
    if (!scene) {
      return reply.status(404).send({ error: "NOT_FOUND", message: `No scene found with id "${id}".` });
    }

    const updated = await prisma.scene.update({ where: { id }, data: parsed.data });
    return reply.send({ scene: updated });
  });

  // Deleting a scene cascades to its shots (Prisma onDelete: Cascade). The web UI must
  // confirm explicitly before calling this — never an implicit side effect (brief §15).
  app.delete("/api/projects/:projectId/scenes/:id", async (req, reply) => {
    const { projectId, id } = req.params as { projectId: string; id: string };
    const scene = await prisma.scene.findFirst({ where: { id, projectId } });
    if (!scene) {
      return reply.status(404).send({ error: "NOT_FOUND", message: `No scene found with id "${id}".` });
    }
    await prisma.scene.delete({ where: { id } });
    return reply.status(204).send();
  });
}
