import { PrismaClient } from "../generated/client";

// Singleton pattern so hot-reload in dev doesn't exhaust Postgres connections.
declare global {
  // eslint-disable-next-line no-var
  var __cineflowPrisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  globalThis.__cineflowPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__cineflowPrisma = prisma;
}

export * from "../generated/client";
