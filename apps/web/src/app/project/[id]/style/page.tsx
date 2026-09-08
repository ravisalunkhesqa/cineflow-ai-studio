"use client";

import { useEffect, useState } from "react";
import { Lock, Unlock, Save } from "lucide-react";
import { getStyleBible, updateStyleBible, type StyleBible } from "@/lib/api-client";

const FIELDS: { key: keyof StyleBible; label: string; placeholder?: string }[] = [
  { key: "visualStyle", label: "Visual Style", placeholder: "Hyper-realistic, modern luxury editorial" },
  { key: "colorPalette", label: "Color Palette", placeholder: "Warm ivory, deep tungsten amber" },
  { key: "lighting", label: "Lighting", placeholder: "Warm tungsten interiors" },
  { key: "contrast", label: "Contrast" },
  { key: "filmStockLook", label: "Film Stock Look", placeholder: "35mm cinematic" },
  { key: "cameraFormat", label: "Camera Format" },
  { key: "lensStyle", label: "Lens Style" },
  { key: "depthOfField", label: "Depth of Field" },
  { key: "composition", label: "Composition" },
  { key: "texture", label: "Texture" },
  { key: "era", label: "Era" },
  { key: "productionDesign", label: "Production Design" },
  { key: "wardrobeStyle", label: "Wardrobe Style" },
  { key: "skinRendering", label: "Skin Rendering" },
  { key: "motionStyle", label: "Motion Style" },
];

type TextFormState = Record<string, string>;

export default function StyleBiblePage({ params }: { params: { id: string } }) {
  const projectId = params.id;
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState<TextFormState>({});
  const [negativeConstraints, setNegativeConstraints] = useState<string[]>([]);
  const [newConstraint, setNewConstraint] = useState("");
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getStyleBible(projectId)
      .then((sb) => {
        const next: TextFormState = {};
        for (const f of FIELDS) next[f.key] = (sb[f.key] as string) ?? "";
        setForm(next);
        setNegativeConstraints(sb.negativeConstraints ?? []);
        setLocked(sb.locked);
        setLoaded(true);
      })
      .catch((err) => setError((err as Error).message));
  }, [projectId]);

  function updateField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addConstraint() {
    const value = newConstraint.trim();
    if (!value) return;
    setNegativeConstraints((prev) => [...prev, value]);
    setNewConstraint("");
  }

  function removeConstraint(idx: number) {
    setNegativeConstraints((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const payload = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, v === "" ? undefined : v]),
      );
      const updated = await updateStyleBible(projectId, { ...payload, negativeConstraints });
      setLocked(updated.locked);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleLock() {
    setError(null);
    try {
      const updated = await updateStyleBible(projectId, { locked: !locked });
      setLocked(updated.locked);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (!loaded && !error) {
    return <div className="px-8 py-10 text-sm text-text-muted">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Style Bible</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Defines the project&apos;s global cinematic look. When locked, these values
            propagate to new shots automatically (Phase 5).
          </p>
        </div>
        <button
          onClick={toggleLock}
          className={`flex items-center gap-1.5 rounded-md border px-3 py-2 text-xs ${
            locked ? "border-accent-soft bg-accent/10 text-accent-glow" : "border-border text-text-secondary"
          }`}
        >
          {locked ? <Lock className="h-3.5 w-3.5" strokeWidth={2} /> : <Unlock className="h-3.5 w-3.5" strokeWidth={2} />}
          {locked ? "Locked" : "Lock Style"}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-status-danger/30 bg-status-danger/10 px-4 py-3 text-sm text-status-danger">
          {error}
        </div>
      )}
      {locked && (
        <div className="mb-4 rounded-md border border-accent-soft/30 bg-accent/5 px-4 py-3 text-xs text-accent-glow">
          Style is locked. Unlock it above before editing fields.
        </div>
      )}

      <fieldset disabled={locked} className="grid grid-cols-2 gap-3 disabled:opacity-50">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label className="mb-1 block text-xs text-text-muted">{f.label}</label>
            <input
              value={form[f.key] ?? ""}
              onChange={(e) => updateField(f.key, e.target.value)}
              placeholder={f.placeholder}
              className="w-full rounded-md border border-border bg-panel px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-soft"
            />
          </div>
        ))}
      </fieldset>

      <div className="mt-6">
        <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-text-muted">
          Negative Constraints
        </label>
        <div className="mb-2 flex flex-wrap gap-2">
          {negativeConstraints.map((c, idx) => (
            <span
              key={`${c}-${idx}`}
              className="flex items-center gap-1.5 rounded-full border border-border bg-panel px-3 py-1 text-xs text-text-secondary"
            >
              {c}
              {!locked && (
                <button onClick={() => removeConstraint(idx)} className="text-text-muted hover:text-status-danger">
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
        {!locked && (
          <div className="flex gap-2">
            <input
              value={newConstraint}
              onChange={(e) => setNewConstraint(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addConstraint()}
              placeholder="e.g. avoid facial drift"
              className="flex-1 rounded-md border border-border bg-panel px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-soft"
            />
            <button
              onClick={addConstraint}
              className="rounded-md border border-border px-3 py-2 text-sm text-text-secondary hover:border-accent-soft hover:text-text-primary"
            >
              Add
            </button>
          </div>
        )}
      </div>

      {!locked && (
        <div className="mt-6 border-t border-border-subtle pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-soft disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" strokeWidth={1.75} />
            {saving ? "Saving…" : "Save Style Bible"}
          </button>
        </div>
      )}
    </div>
  );
}
