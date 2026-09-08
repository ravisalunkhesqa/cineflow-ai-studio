import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@cineflow/database";

const SHOT_STATUSES = ["DRAFT", "READY", "GENERATING", "REVIEW", "APPROVED", "LOCKED"] as const;

const ShotInputSchema = z.object({
  sceneId: z.string(),
  shotNumber: z.number().int().min(1),
  name: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  duration: z.number().int().min(0).optional(),
  cameraShotSize: z.string().max(20).optional(),
  cameraAngle: z.string().max(50).optional(),
  cameraMovement: z.string().max(50).optional(),
  lens: z.string().max(20).optional(),
  depthOfField: z.string().max(30).optional(),
  lighting: z.string().max(300).optional(),
  mood: z.string().max(200).optional(),
  colorGrade: z.string().max(200).optional(),
  prompt: z.string().max(4000).optional(),
  negativePrompt: z.string().max(1000).optional(),
  characterIds: z.array(z.string()).default([]),
  locationId: z.string().optional(),
  propIds: z.array(z.string()).default([]),
  referenceAssetIds: z.array(z.string()).default([]),
  status: z.enum(SHOT_STATUSES).default("DRAFT"),
});

// Fields a LOCKED shot may still have changed (status itself, to unlock) — everything
// else is rejected server-side, not just hidden in the UI (brief §64).
const UNLOCK_ONLY_FIELDS = new Set(["status"]);

export async function shotsRoutes(app: FastifyInstance) {
  app.get("/api/projects/:projectId/shots", async (req, reply) => {
    const { projectId } = req.params as { projectId: string };
    const { sceneId } = req.query as { sceneId?: string };
    const shots = await prisma.shot.findMany({
      where: { projectId, ...(sceneId ? { sceneId } : {}) },
      orderBy: [{ sceneId: "asc" }, { shotNumber: "asc" }],
    });
    return reply.send({ shots });
  });

  app.post("/api/projects/:projectId/shots", async (req, reply) => {
    const { projectId } = req.params as { projectId: string };
    const parsed = ShotInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: "VALIDATION_ERROR", message: "Invalid shot payload.", issues: parsed.error.issues });
    }

    const scene = await prisma.scene.findFirst({ where: { id: parsed.data.sceneId, projectId } });
    if (!scene) {
      return reply.status(400).send({
        error: "VALIDATION_ERROR",
        message: "sceneId does not reference a scene in this project.",
      });
    }

    const shot = await prisma.shot.create({ data: { projectId, ...parsed.data } });
    return reply.status(201).send({ shot });
  });

  app.patch("/api/projects/:projectId/shots/:id", async (req, reply) => {
    const { projectId, id } = req.params as { projectId: string; id: string };
    const parsed = ShotInputSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: "VALIDATION_ERROR", message: "Invalid shot payload.", issues: parsed.error.issues });
    }

    const shot = await prisma.shot.findFirst({ where: { id, projectId } });
    if (!shot) {
      return reply.status(404).send({ error: "NOT_FOUND", message: `No shot found with id "${id}".` });
    }

    if (shot.status === "LOCKED") {
      const attemptedFields = Object.keys(parsed.data);
      const disallowed = attemptedFields.filter((f) => !UNLOCK_ONLY_FIELDS.has(f));
      if (disallowed.length > 0) {
        return reply.status(409).send({
          error: "SHOT_LOCKED",
          message: "This shot is locked. Change its status away from LOCKED before editing other fields.",
        });
      }
    }

    const updated = await prisma.shot.update({ where: { id }, data: parsed.data });
    return reply.send({ shot: updated });
  });

  app.delete("/api/projects/:projectId/shots/:id", async (req, reply) => {
    const { projectId, id } = req.params as { projectId: string; id: string };
    const shot = await prisma.shot.findFirst({ where: { id, projectId } });
    if (!shot) {
      return reply.status(404).send({ error: "NOT_FOUND", message: `No shot found with id "${id}".` });
    }
    await prisma.shot.delete({ where: { id } });
    return reply.status(204).send();
  });

  app.post("/api/projects/:projectId/shots/:id/duplicate", async (req, reply) => {
    const { projectId, id } = req.params as { projectId: string; id: string };
    const shot = await prisma.shot.findFirst({ where: { id, projectId } });
    if (!shot) {
      return reply.status(404).send({ error: "NOT_FOUND", message: `No shot found with id "${id}".` });
    }

    const siblingCount = await prisma.shot.count({ where: { sceneId: shot.sceneId } });

    const {
      id: _id,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      selectedImageAssetId: _selImg,
      selectedVideoAssetId: _selVid,
      status: _status,
      ...rest
    } = shot;

    const duplicate = await prisma.shot.create({
      data: {
        ...rest,
        name: shot.name ? `${shot.name} (copy)` : undefined,
        shotNumber: siblingCount + 1,
        status: "DRAFT",
      },
    });
    return reply.status(201).send({ shot: duplicate });
  });

  // Reorders shots within a single scene by supplying the full ordered list of shot IDs.
  // Renumbers 1..N sequentially — never trusts client-supplied shotNumber values directly.
  const ReorderSchema = z.object({ sceneId: z.string(), shotIds: z.array(z.string()).min(1) });

  app.post("/api/projects/:projectId/shots/reorder", async (req, reply) => {
    const { projectId } = req.params as { projectId: string };
    const parsed = ReorderSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: "VALIDATION_ERROR", message: "Invalid reorder payload.", issues: parsed.error.issues });
    }

    const { sceneId, shotIds } = parsed.data;
    const existing = await prisma.shot.findMany({ where: { projectId, sceneId } });
    const existingIds = new Set(existing.map((s: { id: string }) => s.id));

    if (shotIds.length !== existing.length || !shotIds.every((sid) => existingIds.has(sid))) {
      return reply.status(400).send({
        error: "VALIDATION_ERROR",
        message: "shotIds must be exactly the current set of shot IDs for this scene.",
      });
    }

    await prisma.$transaction(
      shotIds.map((shotId, index) =>
        prisma.shot.update({ where: { id: shotId }, data: { shotNumber: index + 1 } }),
      ),
    );

    const shots = await prisma.shot.findMany({ where: { sceneId }, orderBy: { shotNumber: "asc" } });
    return reply.send({ shots });
  });
}
