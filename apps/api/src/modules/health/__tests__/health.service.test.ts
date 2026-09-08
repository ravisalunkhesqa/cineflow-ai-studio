import { describe, it, expect } from "vitest";
import { overallStatus } from "../health.service";

describe("overallStatus", () => {
  it("returns OK when every component is OK", () => {
    expect(
      overallStatus({ api: "OK", database: "OK", redis: "OK", minio: "OK", ffmpeg: "OK" }),
    ).toBe("OK");
  });

  it("returns DEGRADED when a component is NOT_CONFIGURED (e.g. ffmpeg missing)", () => {
    expect(
      overallStatus({
        api: "OK",
        database: "OK",
        redis: "OK",
        minio: "OK",
        ffmpeg: "NOT_CONFIGURED",
      }),
    ).toBe("DEGRADED");
  });

  it("returns DOWN when any component is DOWN, even if others are OK", () => {
    expect(
      overallStatus({ api: "OK", database: "DOWN", redis: "OK", minio: "OK", ffmpeg: "OK" }),
    ).toBe("DOWN");
  });
});
