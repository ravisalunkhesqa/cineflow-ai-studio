import { describe, it, expect } from "vitest";
import { composeRawPrompt } from "../prompt-composer";

describe("composeRawPrompt", () => {
  it("joins only the non-empty fields in a stable field order", () => {
    const result = composeRawPrompt({
      subject: "A woman",
      lighting: "warm tungsten",
      camera: "eye level",
    });
    // subject, then camera (comes before lighting in FIELD_ORDER), then lighting
    expect(result).toBe("A woman, eye level, warm tungsten");
  });

  it("returns an empty string when no fields are set", () => {
    expect(composeRawPrompt({})).toBe("");
  });

  it("ignores whitespace-only fields", () => {
    expect(composeRawPrompt({ subject: "   ", action: "walks slowly" })).toBe("walks slowly");
  });

  it("never includes negativePrompt in the positive raw prompt", () => {
    const result = composeRawPrompt({ subject: "A man", negativePrompt: "extra fingers" });
    expect(result).not.toContain("extra fingers");
  });
});
