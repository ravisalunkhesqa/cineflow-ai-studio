import { prisma } from "@cineflow/database";

/**
 * Flow Agent tool system (brief §84).
 *
 * READ tools only in this phase — they're plain, safe, typed functions the agent
 * orchestration layer (Phase 5+, once TOOL_CALLING is verified against a real XKiro
 * response) can call to look things up. WRITE tools (updateShot, reorderShots,
 * createWorkflow, ...) are intentionally NOT implemented yet: per the brief, writes
 * must go through "AI proposes → backend validates → UI previews → user accepts →
 * apply", which needs the proposal/validation/preview UI from §83 built first. Adding
 * write tools before that pipeline exists would let free-form model output mutate the
 * database directly, which the brief explicitly forbids.
 */

export async function getProject(projectId: string) {
  return prisma.project.findUnique({
    where: { id: projectId },
    include: { story: true, styleBible: true, settings: true },
  });
}

export async function getScenes(projectId: string) {
  return prisma.scene.findMany({
    where: { projectId },
    orderBy: { sceneNumber: "asc" },
    include: { shots: { orderBy: { shotNumber: "asc" } } },
  });
}

export async function getShot(shotId: string) {
  return prisma.shot.findUnique({ where: { id: shotId } });
}

export async function getCharacter(characterId: string) {
  return prisma.character.findUnique({ where: { id: characterId }, include: { references: true } });
}

export async function getLocation(locationId: string) {
  return prisma.location.findUnique({ where: { id: locationId } });
}

export async function getStyleBible(projectId: string) {
  return prisma.styleBible.findUnique({ where: { projectId } });
}

/** Placeholder until the Asset Library (Phase 6) exists — returns an empty result rather than erroring. */
export async function searchAssets(projectId: string, _query: string) {
  return prisma.asset.findMany({ where: { projectId }, take: 0 });
}

export const FLOW_AGENT_READ_TOOLS = {
  getProject,
  getScenes,
  getShot,
  getCharacter,
  getLocation,
  getStyleBible,
  searchAssets,
} as const;
