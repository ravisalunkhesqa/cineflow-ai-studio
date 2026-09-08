"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Clapperboard, ArrowRight } from "lucide-react";
import {
  listScenes,
  createScene,
  updateScene,
  deleteScene,
  listLocations,
  type Scene,
  type Location,
} from "@/lib/api-client";

const BLANK_FORM = {
  sceneNumber: 1,
  intExt: "INT",
  locationId: "",
  timeOfDay: "",
  description: "",
  duration: "",
  notes: "",
};

type FormState = typeof BLANK_FORM;

export default function ScenesPage({ params }: { params: { id: string } }) {
  const projectId = params.id;
  const [scenes, setScenes] = useState<Scene[] | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedId, setSelectedId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<FormState>(BLANK_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function refresh() {
    try {
      const [sceneList, locationList] = await Promise.all([
        listScenes(projectId),
        listLocations(projectId),
      ]);
      setScenes(sceneList);
      setLocations(locationList);
      return sceneList;
    } catch (err) {
      setError((err as Error).message);
      setScenes([]);
      return [];
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  function select(s: Scene) {
    setSelectedId(s.id);
    setForm({
      sceneNumber: s.sceneNumber,
      intExt: s.intExt ?? "INT",
      locationId: s.locationId ?? "",
      timeOfDay: s.timeOfDay ?? "",
      description: s.description ?? "",
      duration: s.duration != null ? String(s.duration) : "",
      notes: s.notes ?? "",
    });
    setError(null);
  }

  function startNew() {
    const nextNumber = (scenes?.length ?? 0) + 1;
    setSelectedId("new");
    setForm({ ...BLANK_FORM, sceneNumber: nextNumber });
    setError(null);
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        sceneNumber: form.sceneNumber,
        intExt: form.intExt || undefined,
        locationId: form.locationId || undefined,
        timeOfDay: form.timeOfDay || undefined,
        description: form.description || undefined,
        duration: form.duration ? Number(form.duration) : undefined,
        notes: form.notes || undefined,
      };
      if (selectedId === "new") {
        const created = await createScene(projectId, payload);
        const list = await refresh();
        const found = list.find((s) => s.id === created.id);
        if (found) select(found);
      } else if (selectedId) {
        const updated = await updateScene(projectId, selectedId, payload);
        await refresh();
        select(updated);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (selectedId === "new" || !selectedId) return;
    if (!confirm("Delete this scene and all of its shots? This cannot be undone.")) return;
    try {
      await deleteScene(projectId, selectedId);
      setSelectedId(null);
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="flex h-full">
      <div className="w-80 shrink-0 border-r border-border bg-panel/50 p-3">
        <button
          onClick={startNew}
          className="mb-3 flex w-full items-center justify-center gap-1.5 rounded-md bg-accent px-3 py-2 text-xs font-medium text-white hover:bg-accent-soft"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          Add Scene
        </button>

        {scenes === null && <p className="text-xs text-text-muted">Loading…</p>}
        {scenes?.length === 0 && <p className="px-1 text-xs text-text-muted">No scenes yet.</p>}

        <div className="space-y-1">
          {scenes?.map((s) => (
            <button
              key={s.id}
              onClick={() => select(s)}
              className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors ${
                selectedId === s.id
                  ? "bg-panel-raised text-text-primary"
                  : "text-text-secondary hover:bg-panel-raised/60"
              }`}
            >
              <Clapperboard className="h-3.5 w-3.5 shrink-0 text-text-muted" strokeWidth={1.75} />
              <span className="truncate">
                Scene {s.sceneNumber}
                {s.intExt ? ` — ${s.intExt}` : ""}
              </span>
              <span className="ml-auto text-[10px] text-text-muted">{s._count?.shots ?? s.shots.length} shots</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-8">
        {!selectedId && (
          <div className="mx-auto max-w-md pt-20 text-center text-sm text-text-muted">
            Select a scene on the left, or add a new one.
          </div>
        )}

        {selectedId && (
          <div className="mx-auto max-w-2xl">
            {error && (
              <div className="mb-4 rounded-md border border-status-danger/30 bg-status-danger/10 px-4 py-3 text-sm text-status-danger">
                {error}
              </div>
            )}

            <div className="mb-6 grid grid-cols-4 gap-3">
              <div>
                <label className="mb-1 block text-xs text-text-muted">Scene #</label>
                <input
                  type="number"
                  min={1}
                  value={form.sceneNumber}
                  onChange={(e) => updateField("sceneNumber", Number(e.target.value))}
                  className="w-full rounded-md border border-border bg-panel px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-soft"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-text-muted">INT / EXT</label>
                <select
                  value={form.intExt}
                  onChange={(e) => updateField("intExt", e.target.value)}
                  className="w-full rounded-md border border-border bg-panel px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-soft"
                >
                  <option value="INT">INT</option>
                  <option value="EXT">EXT</option>
                  <option value="INT/EXT">INT/EXT</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-text-muted">Time</label>
                <input
                  value={form.timeOfDay}
                  onChange={(e) => updateField("timeOfDay", e.target.value)}
                  placeholder="Night"
                  className="w-full rounded-md border border-border bg-panel px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-soft"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-text-muted">Duration (s)</label>
                <input
                  type="number"
                  min={0}
                  value={form.duration}
                  onChange={(e) => updateField("duration", e.target.value)}
                  className="w-full rounded-md border border-border bg-panel px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-soft"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-xs text-text-muted">Location</label>
              <select
                value={form.locationId}
                onChange={(e) => updateField("locationId", e.target.value)}
                className="w-full rounded-md border border-border bg-panel px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-soft"
              >
                <option value="">No location set</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} (@{l.tag})
                  </option>
                ))}
              </select>
              {locations.length === 0 && (
                <p className="mt-1 text-xs text-text-muted">
                  No locations yet —{" "}
                  <Link href={`/project/${projectId}/locations`} className="text-accent-glow hover:underline">
                    add one first
                  </Link>
                  .
                </p>
              )}
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-xs text-text-muted">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                rows={3}
                className="w-full resize-none rounded-md border border-border bg-panel px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-soft"
              />
            </div>

            <div className="mb-6">
              <label className="mb-1 block text-xs text-text-muted">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                rows={2}
                className="w-full resize-none rounded-md border border-border bg-panel px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-soft"
              />
            </div>

            <div className="flex items-center gap-2 border-t border-border-subtle pt-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-soft disabled:opacity-50"
              >
                {saving ? "Saving…" : selectedId === "new" ? "Create Scene" : "Save Changes"}
              </button>
              {selectedId !== "new" && (
                <>
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-1.5 rounded-md border border-status-danger/40 px-3 py-2 text-sm text-status-danger hover:bg-status-danger/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                    Delete
                  </button>
                  <Link
                    href={`/project/${projectId}/storyboard`}
                    className="ml-auto flex items-center gap-1.5 text-sm text-accent-glow hover:underline"
                  >
                    Open in Storyboard
                    <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
