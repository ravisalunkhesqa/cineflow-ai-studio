"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, MapPin } from "lucide-react";
import { LocationReferenceGrid } from "@/components/project/location-reference-grid";
import {
  listLocations,
  createLocation,
  updateLocation,
  deleteLocation,
  type Location,
} from "@/lib/api-client";

const BLANK_FORM = {
  name: "",
  tag: "",
  description: "",
  architecture: "",
  interiorExterior: "",
  timeOfDay: "",
  weather: "",
  lighting: "",
  palette: "",
  continuityNotes: "",
};

type FormState = typeof BLANK_FORM;

function toFormState(l: Location): FormState {
  return {
    name: l.name,
    tag: l.tag,
    description: l.description ?? "",
    architecture: l.architecture ?? "",
    interiorExterior: l.interiorExterior ?? "",
    timeOfDay: l.timeOfDay ?? "",
    weather: l.weather ?? "",
    lighting: l.lighting ?? "",
    palette: l.palette ?? "",
    continuityNotes: l.continuityNotes ?? "",
  };
}

const FIELDS: { key: keyof FormState; label: string; multiline?: boolean }[] = [
  { key: "interiorExterior", label: "Interior / Exterior" },
  { key: "timeOfDay", label: "Time of day" },
  { key: "weather", label: "Weather" },
  { key: "architecture", label: "Architecture" },
  { key: "lighting", label: "Lighting" },
  { key: "palette", label: "Palette" },
  { key: "description", label: "Description", multiline: true },
  { key: "continuityNotes", label: "Continuity notes", multiline: true },
];

export default function LocationsPage({ params }: { params: { id: string } }) {
  const projectId = params.id;
  const [locations, setLocations] = useState<Location[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<FormState>(BLANK_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function refresh() {
    try {
      const list = await listLocations(projectId);
      setLocations(list);
      return list;
    } catch (err) {
      setError((err as Error).message);
      setLocations([]);
      return [];
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  function select(l: Location) {
    setSelectedId(l.id);
    setForm(toFormState(l));
    setError(null);
  }

  function startNew() {
    setSelectedId("new");
    setForm(BLANK_FORM);
    setError(null);
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.name.trim() || !form.tag.trim()) {
      setError("Name and tag are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, v === "" ? undefined : v]),
      ) as Partial<FormState> & { name: string; tag: string };

      if (selectedId === "new") {
        const created = await createLocation(projectId, payload);
        const list = await refresh();
        const found = list.find((l) => l.id === created.id);
        if (found) select(found);
      } else if (selectedId) {
        const updated = await updateLocation(projectId, selectedId, payload);
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
    if (!confirm("Delete this location? This cannot be undone.")) return;
    try {
      await deleteLocation(projectId, selectedId);
      setSelectedId(null);
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="flex h-full">
      <div className="w-72 shrink-0 border-r border-border bg-panel/50 p-3">
        <button
          onClick={startNew}
          className="mb-3 flex w-full items-center justify-center gap-1.5 rounded-md bg-accent px-3 py-2 text-xs font-medium text-white hover:bg-accent-soft"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          Add Location
        </button>

        {locations === null && <p className="text-xs text-text-muted">Loading…</p>}
        {locations?.length === 0 && <p className="px-1 text-xs text-text-muted">No locations yet.</p>}

        <div className="space-y-1">
          {locations?.map((l) => (
            <button
              key={l.id}
              onClick={() => select(l)}
              className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors ${
                selectedId === l.id
                  ? "bg-panel-raised text-text-primary"
                  : "text-text-secondary hover:bg-panel-raised/60"
              }`}
            >
              <MapPin className="h-3.5 w-3.5 shrink-0 text-text-muted" strokeWidth={1.75} />
              <span className="truncate">{l.name}</span>
              <span className="ml-auto text-[10px] text-text-muted">@{l.tag}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-8">
        {!selectedId && (
          <div className="mx-auto max-w-md pt-20 text-center text-sm text-text-muted">
            Select a location on the left, or add a new one.
          </div>
        )}

        {selectedId && (
          <div className="mx-auto max-w-2xl">
            {error && (
              <div className="mb-4 rounded-md border border-status-danger/30 bg-status-danger/10 px-4 py-3 text-sm text-status-danger">
                {error}
              </div>
            )}

            <div className="mb-6 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-text-muted">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  className="w-full rounded-md border border-border bg-panel px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-soft"
                  placeholder="Palace Corridor"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-text-muted">
                  Tag (used as @tag in prompts)
                </label>
                <input
                  value={form.tag}
                  onChange={(e) => updateField("tag", e.target.value.replace(/[^A-Za-z0-9_]/g, ""))}
                  className="w-full rounded-md border border-border bg-panel px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-soft"
                  placeholder="PalaceCorridor"
                />
              </div>
            </div>

            {selectedId !== "new" ? (
              <LocationReferenceGrid
                projectId={projectId}
                locationId={selectedId!}
                references={locations?.find((l) => l.id === selectedId)?.references ?? []}
                onChange={refresh}
              />
            ) : (
              <div className="mb-6 rounded-lg border border-dashed border-border bg-panel/40 px-4 py-3 text-xs text-text-muted">
                Save the location first, then upload reference images.
              </div>
            )}

            <div className="mb-6 grid grid-cols-2 gap-3">
              {FIELDS.map((f) => (
                <div key={f.key} className={f.multiline ? "col-span-2" : ""}>
                  <label className="mb-1 block text-xs text-text-muted">{f.label}</label>
                  <textarea
                    value={form[f.key]}
                    onChange={(e) => updateField(f.key, e.target.value)}
                    rows={f.multiline ? 3 : 1}
                    className="w-full resize-none rounded-md border border-border bg-panel px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-soft"
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 border-t border-border-subtle pt-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-soft disabled:opacity-50"
              >
                {saving ? "Saving…" : selectedId === "new" ? "Create Location" : "Save Changes"}
              </button>
              {selectedId !== "new" && (
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-1.5 rounded-md border border-status-danger/40 px-3 py-2 text-sm text-status-danger hover:bg-status-danger/10"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Delete
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
