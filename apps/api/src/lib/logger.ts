import pino from "pino";

// Structured logging per brief §72: timestamp, level, requestId, projectId, jobId,
// provider, model — NEVER api keys, authorization headers, or raw credentials.
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  transport:
    process.env.NODE_ENV === "development"
      ? { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss" } }
      : undefined,
  redact: {
    paths: [
      "req.headers.authorization",
      "*.apiKey",
      "*.API_KEY",
      "*.XTROUTER_API_KEY",
      "*.token",
    ],
    censor: "[REDACTED]",
  },
});
