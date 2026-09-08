import type { FastifyInstance } from "fastify";
import { getHealth } from "./health.service";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async (_req, reply) => {
    const health = await getHealth();
    const httpStatus = health.status === "DOWN" ? 503 : 200;
    return reply.status(httpStatus).send(health);
  });
}
