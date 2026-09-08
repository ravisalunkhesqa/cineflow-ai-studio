import { prisma } from "@cineflow/database";

/** Rough token estimate (chars/4) — good enough to log/display, not for billing. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export interface AssembledContext {
  systemPrompt: string;
  approxTokens: number;
}

/**
 * Assembles a compact system prompt for the Flow Agent (project-level chat) or a
 * SHOT_PLANNING-style task. Deliberately excludes unrelated project content — e.g. it
 * does not dump every shot's full prompt text, only counts and locked style/continuity
 * facts, per brief §48.
 */
export async function assembleProjectContext(projectId: string): Promise<AssembledContext> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      story: true,
      styleBible: true,
      characters: { select: { name: true, tag: true, continuityNotes: true, characterLock: true } },
      locations: { select: { name: true, tag: true } },
      scenes: { select: { id: true } },
    },
  });

  if (!project) {
    throw new Error(`No project found with id "${projectId}".`);
  }

  const shotCount = await prisma.shot.count({ where: { projectId } });

  const lines: string[] = [];
  lines.push(
    `You are Flow Agent, the AI creative partner inside CineFlow AI Studio, currently ` +
      `working on the project "${project.name}" (aspect ratio ${project.aspectRatio}).`,
  );

  if (project.story?.logline || project.story?.synopsis) {
    lines.push("");
    lines.push("STORY:");
    if (project.story.logline) lines.push(`Logline: ${project.story.logline}`);
    if (project.story.synopsis) lines.push(`Synopsis: ${project.story.synopsis}`);
  }

  if (project.styleBible?.visualStyle || project.styleBible?.locked) {
    lines.push("");
    lines.push(`STYLE BIBLE${project.styleBible.locked ? " (LOCKED — do not suggest changes without asking)" : ""}:`);
    for (const [label, value] of Object.entries({
      "Visual style": project.styleBible.visualStyle,
      "Color palette": project.styleBible.colorPalette,
      Lighting: project.styleBible.lighting,
      "Film stock": project.styleBible.filmStockLook,
    })) {
      if (value) lines.push(`${label}: ${value}`);
    }
    if (project.styleBible.negativeConstraints.length) {
      lines.push(`Negative constraints: ${project.styleBible.negativeConstraints.join(", ")}`);
    }
  }

  if (project.characters.length) {
    lines.push("");
    lines.push("CHARACTERS (reference with @tag):");
    for (const c of project.characters) {
      lines.push(`- @${c.tag} (${c.name})${c.characterLock ? " [LOCKED]" : ""}${c.continuityNotes ? ` — ${c.continuityNotes}` : ""}`);
    }
  }

  if (project.locations.length) {
    lines.push("");
    lines.push("LOCATIONS (reference with @tag):");
    for (const l of project.locations) {
      lines.push(`- @${l.tag} (${l.name})`);
    }
  }

  lines.push("");
  lines.push(`Project currently has ${project.scenes.length} scene(s) and ${shotCount} shot(s).`);
  lines.push("");
  lines.push(
    "Only propose changes when asked. For any destructive or bulk edit, describe the " +
      "proposed change first and wait for confirmation rather than assuming approval.",
  );

  const systemPrompt = lines.join("\n");
  return { systemPrompt, approxTokens: estimateTokens(systemPrompt) };
}

/**
 * Tight, shot-scoped context for the Prompt Composer's AI-enhance call (§21/§48) —
 * deliberately narrower than assembleProjectContext: locked style bible, the specific
 * scene, and only the characters/locations this shot actually references, not the
 * whole project.
 */
export async function assembleShotContext(projectId: string, shotId: string): Promise<string> {
  const shot = await prisma.shot.findFirst({
    where: { id: shotId, projectId },
    include: { scene: true },
  });
  if (!shot) {
    throw new Error(`No shot found with id "${shotId}" in project "${projectId}".`);
  }

  const [styleBible, characters, location] = await Promise.all([
    prisma.styleBible.findUnique({ where: { projectId } }),
    shot.characterIds.length
      ? prisma.character.findMany({ where: { id: { in: shot.characterIds } } })
      : Promise.resolve([]),
    shot.locationId ? prisma.location.findUnique({ where: { id: shot.locationId } }) : Promise.resolve(null),
  ]);

  const lines: string[] = [];
  lines.push(`Scene ${shot.scene.sceneNumber}${shot.scene.intExt ? ` (${shot.scene.intExt})` : ""}: ${shot.scene.description ?? "no description"}`);
  lines.push(`Shot ${shot.shotNumber}: ${shot.description ?? "no description yet"}`);
  if (shot.cameraShotSize || shot.cameraAngle || shot.cameraMovement) {
    lines.push(
      `Camera: ${[shot.cameraShotSize, shot.cameraAngle, shot.cameraMovement].filter(Boolean).join(", ")}`,
    );
  }
  if (styleBible?.visualStyle || styleBible?.locked) {
    lines.push(
      `Project style${styleBible.locked ? " (LOCKED)" : ""}: ${[styleBible.visualStyle, styleBible.lighting, styleBible.colorPalette].filter(Boolean).join(", ")}`,
    );
    if (styleBible.negativeConstraints.length) {
      lines.push(`Style negative constraints: ${styleBible.negativeConstraints.join(", ")}`);
    }
  }
  if (characters.length) {
    lines.push(
      `Characters in this shot: ${characters
        .map(
          (c: { tag: string; appearance: string | null; wardrobe: string | null }) =>
            `@${c.tag} (${[c.appearance, c.wardrobe].filter(Boolean).join("; ") || "no appearance notes"})`,
        )
        .join(" | ")}`,
    );
  }
  if (location) {
    lines.push(`Location: @${location.tag} — ${[location.description, location.lighting].filter(Boolean).join("; ")}`);
  }

  return lines.join("\n");
}
