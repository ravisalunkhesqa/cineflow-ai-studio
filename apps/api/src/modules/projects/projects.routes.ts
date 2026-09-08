import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@cineflow/database";

const CreateProjectSchema = z.object({
  name: z.string().min(1).max(200),
  templateKey: z.string().optional(),
  aspectRatio: z.string().default("16:9"),
  tagline: z.string().optional(),
});

export async function projectsRoutes(app: FastifyInstance) {
  // List recent projects
  app.get("/api/projects", async (_req, reply) => {
    const projects = await prisma.project.findMany({
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: {
        _count: { select: { scenes: true, shots: true, assets: true } },
      },
    });
    return reply.send({ projects });
  });

  // Create a project
  app.post("/api/projects", async (req, reply) => {
    const parsed = CreateProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "VALIDATION_ERROR",
        message: "Invalid project payload.",
        issues: parsed.error.issues,
      });
    }
    const { name, templateKey, aspectRatio, tagline } = parsed.data;

    const project = await prisma.project.create({
      data: {
        name,
        templateKey,
        aspectRatio,
        tagline,
        settings: { create: {} },
        styleBible: { create: {} },
      },
      include: { settings: true, styleBible: true },
    });

    return reply.status(201).send({ project });
  });

  // Get single project
  app.get("/api/projects/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        settings: true,
        styleBible: true,
        story: true,
        characters: true,
        locations: true,
        scenes: { include: { shots: true }, orderBy: { sceneNumber: "asc" } },
      },
    });

    if (!project) {
      return reply.status(404).send({
        error: "NOT_FOUND",
        message: `No project found with id "${id}".`,
      });
    }

    return reply.send({ project });
  });
}
