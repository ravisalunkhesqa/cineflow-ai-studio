import Fastify from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import { logger } from "./lib/logger";
import { healthRoutes } from "./modules/health/health.routes";
import { projectsRoutes } from "./modules/projects/projects.routes";
import { charactersRoutes } from "./modules/characters/characters.routes";
import { locationsRoutes } from "./modules/locations/locations.routes";
import { styleBibleRoutes } from "./modules/style-bible/style-bible.routes";
import { scenesRoutes } from "./modules/scenes/scenes.routes";
import { shotsRoutes } from "./modules/shots/shots.routes";
import { modelsRoutes } from "./modules/models/models.routes";
import { agentRoutes } from "./modules/agent/agent.routes";
import { promptsRoutes } from "./modules/prompts/prompts.routes";
import { assetsRoutes } from "./modules/assets/assets.routes";
import { getHealth } from "./modules/health/health.service";

const PORT = Number(process.env.API_PORT ?? 4000);

async function buildServer() {
  const app = Fastify({
    logger: logger as never,
    bodyLimit: 10 * 1024 * 1024, // 10MB — generous for JSON payloads; media goes through MinIO uploads, not this body.
    requestTimeout: 30_000,
  });

  await app.register(cors, {
    origin: [`http://localhost:${process.env.WEB_PORT ?? 3000}`],
    credentials: true,
  });
  await app.register(sensible);

  // Central error mapping — never leak stack traces or secrets to the client.
  app.setErrorHandler((err, req, reply) => {
    req.log.error({ err: err.message, path: req.url }, "unhandled request error");
    const status = err.statusCode ?? 500;
    reply.status(status).send({
      error: status === 500 ? "INTERNAL_ERROR" : (err.name ?? "ERROR"),
      message:
        status === 500
          ? "Something went wrong processing this request. Check server logs for details."
          : err.message,
    });
  });

  await app.register(healthRoutes);
  await app.register(projectsRoutes);
  await app.register(charactersRoutes);
  await app.register(locationsRoutes);
  await app.register(styleBibleRoutes);
  await app.register(scenesRoutes);
  await app.register(shotsRoutes);
  await app.register(modelsRoutes);
  await app.register(agentRoutes);
  await app.register(promptsRoutes);
  await app.register(assetsRoutes);

  app.get("/", async () => ({
    name: "CineFlow AI Studio API",
    status: "running",
    docs: "/health",
  }));

  return app;
}

async function startupValidation() {
  logger.info("Running startup validation…");
  const health = await getHealth();

  for (const [component, status] of Object.entries(health.components)) {
    const line = `  - ${component.padEnd(10)} ${status}`;
    if (status === "OK") logger.info(line);
    else if (status === "NOT_CONFIGURED") logger.warn(line + " (optional — some features disabled)");
    else logger.warn(line + " (unavailable — check docker compose / SETUP_WINDOWS.md)");
  }

  if (!process.env.XTROUTER_API_KEY) {
    logger.warn(
      "XTROUTER_API_KEY is not set. AI generation endpoints will report NOT_CONFIGURED until it is provided in .env.local.",
    );
  }

  return health;
}

async function main() {
  const health = await startupValidation();
  const app = await buildServer();

  try {
    await app.listen({ port: PORT, host: "0.0.0.0" });
    logger.info(`CineFlow API listening on http://localhost:${PORT}`);
    if (health.status !== "OK") {
      logger.warn(
        "API started with degraded infrastructure. Some features (jobs, storage, media) may not work until docker compose services are healthy.",
      );
    }
  } catch (err) {
    logger.error({ err }, "Failed to start CineFlow API");
    process.exit(1);
  }
}

main();
