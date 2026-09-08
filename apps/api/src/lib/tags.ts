/**
 * Validates the @tag used for autocomplete references (e.g. @Aarohi, @PalaceCorridor).
 * Keep this restrictive: alphanumeric + underscore only, no spaces, so prompt-string
 * parsing (Phase 5 Prompt Composer) can safely detect "@Tag" tokens without ambiguity.
 */
const TAG_PATTERN = /^[A-Za-z][A-Za-z0-9_]{1,49}$/;

export function isValidTag(tag: string): boolean {
  return TAG_PATTERN.test(tag);
}

export function normalizeTag(name: string): string {
  return name
    .trim()
    .replace(/[^A-Za-z0-9_]+/g, "")
    .slice(0, 50);
}
