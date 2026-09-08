import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@cineflow/database";
import { isValidTag } from "../../lib/tags";

const CharacterInputSchema = z.object({
  name: z.string().min(1).max(120),
  tag: z
    .string()
    .min(2)
    .max(50)
    .refine(isValidTag, "Tag must start with a letter and contain only letters/numbers/underscore."),
  aliases: z.array(z.string()).default([]),
  ageRange: z.string().max(50).optional(),
  appearance: z.string().max(2000).optional(),
  faceDescription: z.string().max(1000).optional(),
  hair: z.string().max(300).optional(),
  eyes: z.string().max(300).optional(),
  skin: z.string().max(300).optional(),
  wardrobe: z.string().max(1000).optional(),
  accessories: z.string().max(500).optional(),
  personality: z.string().max(1000).optional(),
  bodyType: z.string().max(300).optional(),
  visualStyle: z.string().max(500).optional(),
  continuityNotes: z.string().max(2000).optional(),
  characterLock: z.boolean().default(false),
});

export async function charactersRoutes(app: FastifyInstance) {
  app.get("/api/projects/:projectId/characters", async (req, reply) => {
    const { projectId } = req.params as { projectId: string };
    const characters = await prisma.character.findMany({
      where: { projectId },
      include: { references: true },
      orderBy: { createdAt: "asc" },
    });
    return reply.send({ characters });
  });

  app.post("/api/projects/:projectId/characters", async (req, reply) => {
    const { projectId } = req.params as { projectId: string };
    const parsed = CharacterInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: "VALIDATION_ERROR", message: "Invalid character payload.", issues: parsed.error.issues });
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return reply.status(404).send({ error: "NOT_FOUND", message: `No project found with id "${projectId}".` });
    }

    const existing = await prisma.character.findUnique({
      where: { projectId_tag: { projectId, tag: parsed.data.tag } },
    });
    if (existing) {
      return reply.status(409).send({
        error: "TAG_CONFLICT",
        message: `A character with tag "@${parsed.data.tag}" already exists in this project.`,
      });
    }

    const character = await prisma.character.create({
      data: { projectId, ...parsed.data },
      include: { references: true },
    });
    return reply.status(201).send({ character });
  });

  app.patch("/api/projects/:projectId/characters/:id", async (req, reply) => {
    const { projectId, id } = req.params as { projectId: string; id: string };
    const parsed = CharacterInputSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: "VALIDATION_ERROR", message: "Invalid character payload.", issues: parsed.error.issues });
    }

    const character = await prisma.character.findFirst({ where: { id, projectId } });
    if (!character) {
      return reply.status(404).send({ error: "NOT_FOUND", message: `No character found with id "${id}".` });
    }

    if (parsed.data.tag && parsed.data.tag !== character.tag) {
      const conflict = await prisma.character.findUnique({
        where: { projectId_tag: { projectId, tag: parsed.data.tag } },
      });
      if (conflict) {
        return reply.status(409).send({
          error: "TAG_CONFLICT",
          message: `A character with tag "@${parsed.data.tag}" already exists in this project.`,
        });
      }
    }

    const updated = await prisma.character.update({
      where: { id },
      data: parsed.data,
      include: { references: true },
    });
    return reply.send({ character: updated });
  });

  // Deletes are explicit and never cascade silently into shot references without confirmation
  // in the UI (brief §15 "never delete generated assets/entities without explicit confirmation").
  app.delete("/api/projects/:projectId/characters/:id", async (req, reply) => {
    const { projectId, id } = req.params as { projectId: string; id: string };
    const character = await prisma.character.findFirst({ where: { id, projectId } });
    if (!character) {
      return reply.status(404).send({ error: "NOT_FOUND", message: `No character found with id "${id}".` });
    }
    await prisma.character.delete({ where: { id } });
    return reply.status(204).send();
  });

  // Reference images (§17: FRONT/PROFILE/3-4/FULL_BODY/COSTUME/EXPRESSION) — attaches
  // an already-uploaded Asset (Phase 6) to this character.
  app.post("/api/projects/:projectId/characters/:id/references", async (req, reply) => {
    const { projectId, id } = req.params as { projectId: string; id: string };
    const parsed = z
      .object({
        assetId: z.string().min(1),
        angle: z.enum(["FRONT", "PROFILE", "THREE_QUARTER", "FULL_BODY", "COSTUME", "EXPRESSION"]),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: "VALIDATION_ERROR", message: "Invalid reference payload.", issues: parsed.error.issues });
    }

    const character = await prisma.character.findFirst({ where: { id, projectId } });
    if (!character) {
      return reply.status(404).send({ error: "NOT_FOUND", message: `No character found with id "${id}".` });
    }
    const asset = await prisma.asset.findFirst({ where: { id: parsed.data.assetId, projectId } });
    if (!asset) {
      return reply.status(400).send({ error: "INVALID_REFERENCE", message: "assetId does not belong to this project." });
    }

    const reference = await prisma.characterReference.create({
      data: { characterId: id, assetId: parsed.data.assetId, angle: parsed.data.angle },
    });
    return reply.status(201).send({ reference });
  });

  app.delete("/api/projects/:projectId/characters/:characterId/references/:refId", async (req, reply) => {
    const { characterId, refId } = req.params as { characterId: string; refId: string };
    const reference = await prisma.characterReference.findFirst({ where: { id: refId, characterId } });
    if (!reference) {
      return reply.status(404).send({ error: "NOT_FOUND", message: `No reference found with id "${refId}".` });
    }
    await prisma.characterReference.delete({ where: { id: refId } });
    return reply.status(204).send();
  });
}
