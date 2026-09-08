import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@cineflow/database";
import { isValidTag } from "../../lib/tags";

const LocationInputSchema = z.object({
  name: z.string().min(1).max(120),
  tag: z
    .string()
    .min(2)
    .max(50)
    .refine(isValidTag, "Tag must start with a letter and contain only letters/numbers/underscore."),
  description: z.string().max(2000).optional(),
  architecture: z.string().max(500).optional(),
  interiorExterior: z.string().max(50).optional(),
  timeOfDay: z.string().max(100).optional(),
  weather: z.string().max(100).optional(),
  lighting: z.string().max(300).optional(),
  palette: z.string().max(300).optional(),
  continuityNotes: z.string().max(2000).optional(),
});

export async function locationsRoutes(app: FastifyInstance) {
  app.get("/api/projects/:projectId/locations", async (req, reply) => {
    const { projectId } = req.params as { projectId: string };
    const locations = await prisma.location.findMany({
      where: { projectId },
      include: { references: true },
      orderBy: { createdAt: "asc" },
    });
    return reply.send({ locations });
  });

  app.post("/api/projects/:projectId/locations", async (req, reply) => {
    const { projectId } = req.params as { projectId: string };
    const parsed = LocationInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: "VALIDATION_ERROR", message: "Invalid location payload.", issues: parsed.error.issues });
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return reply.status(404).send({ error: "NOT_FOUND", message: `No project found with id "${projectId}".` });
    }

    const existing = await prisma.location.findUnique({
      where: { projectId_tag: { projectId, tag: parsed.data.tag } },
    });
    if (existing) {
      return reply.status(409).send({
        error: "TAG_CONFLICT",
        message: `A location with tag "@${parsed.data.tag}" already exists in this project.`,
      });
    }

    const location = await prisma.location.create({ data: { projectId, ...parsed.data } });
    return reply.status(201).send({ location });
  });

  app.patch("/api/projects/:projectId/locations/:id", async (req, reply) => {
    const { projectId, id } = req.params as { projectId: string; id: string };
    const parsed = LocationInputSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: "VALIDATION_ERROR", message: "Invalid location payload.", issues: parsed.error.issues });
    }

    const location = await prisma.location.findFirst({ where: { id, projectId } });
    if (!location) {
      return reply.status(404).send({ error: "NOT_FOUND", message: `No location found with id "${id}".` });
    }

    if (parsed.data.tag && parsed.data.tag !== location.tag) {
      const conflict = await prisma.location.findUnique({
        where: { projectId_tag: { projectId, tag: parsed.data.tag } },
      });
      if (conflict) {
        return reply.status(409).send({
          error: "TAG_CONFLICT",
          message: `A location with tag "@${parsed.data.tag}" already exists in this project.`,
        });
      }
    }

    const updated = await prisma.location.update({ where: { id }, data: parsed.data });
    return reply.send({ location: updated });
  });

  app.delete("/api/projects/:projectId/locations/:id", async (req, reply) => {
    const { projectId, id } = req.params as { projectId: string; id: string };
    const location = await prisma.location.findFirst({ where: { id, projectId } });
    if (!location) {
      return reply.status(404).send({ error: "NOT_FOUND", message: `No location found with id "${id}".` });
    }
    await prisma.location.delete({ where: { id } });
    return reply.status(204).send();
  });

  // Reference images — attaches an already-uploaded Asset (Phase 6) to this location.
  app.post("/api/projects/:projectId/locations/:id/references", async (req, reply) => {
    const { projectId, id } = req.params as { projectId: string; id: string };
    const parsed = z.object({ assetId: z.string().min(1) }).safeParse(req.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: "VALIDATION_ERROR", message: "Invalid reference payload.", issues: parsed.error.issues });
    }

    const location = await prisma.location.findFirst({ where: { id, projectId } });
    if (!location) {
      return reply.status(404).send({ error: "NOT_FOUND", message: `No location found with id "${id}".` });
    }
    const asset = await prisma.asset.findFirst({ where: { id: parsed.data.assetId, projectId } });
    if (!asset) {
      return reply.status(400).send({ error: "INVALID_REFERENCE", message: "assetId does not belong to this project." });
    }

    const reference = await prisma.locationReference.create({
      data: { locationId: id, assetId: parsed.data.assetId },
    });
    return reply.status(201).send({ reference });
  });

  app.delete("/api/projects/:projectId/locations/:locationId/references/:refId", async (req, reply) => {
    const { locationId, refId } = req.params as { locationId: string; refId: string };
    const reference = await prisma.locationReference.findFirst({ where: { id: refId, locationId } });
    if (!reference) {
      return reply.status(404).send({ error: "NOT_FOUND", message: `No reference found with id "${refId}".` });
    }
    await prisma.locationReference.delete({ where: { id: refId } });
    return reply.status(204).send();
  });
}
