import { describe, it, expect } from "vitest";
import { buildObjectKey, sanitizeFilename, assertKeyBelongsToProject } from "../storage";

describe("sanitizeFilename", () => {
  it("strips directory components (path traversal defense)", () => {
    expect(sanitizeFilename("../../etc/passwd")).not.toContain("..");
    expect(sanitizeFilename("../../etc/passwd")).not.toContain("/");
  });

  it("replaces unsafe characters", () => {
    expect(sanitizeFilename("my photo!@#.png")).toBe("my_photo___.png");
  });

  it("falls back to a default name if nothing safe remains", () => {
    expect(sanitizeFilename("")).toBe("file");
  });
});

describe("buildObjectKey", () => {
  it("scopes the key under the given project and category folder", () => {
    const key = buildObjectKey("proj123", "IMAGE", "portrait.png");
    expect(key).toMatch(/^projects\/proj123\/images\/[0-9a-f-]+-portrait\.png$/);
  });

  it("routes REFERENCE assets to the references folder", () => {
    const key = buildObjectKey("proj123", "REFERENCE", "front.png");
    expect(key).toContain("projects/proj123/references/");
  });
});

describe("assertKeyBelongsToProject", () => {
  it("accepts a key correctly scoped to the project", () => {
    expect(() => assertKeyBelongsToProject("projects/proj123/images/x-file.png", "proj123")).not.toThrow();
  });

  it("rejects a key scoped to a different project (cross-project forgery)", () => {
    expect(() => assertKeyBelongsToProject("projects/other-proj/images/x-file.png", "proj123")).toThrow();
  });

  it("rejects a key containing path traversal segments", () => {
    expect(() => assertKeyBelongsToProject("projects/proj123/../../etc/passwd", "proj123")).toThrow();
  });
});
