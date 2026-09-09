"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { Plus, Trash2, Copy } from "lucide-react";
import { ShotCard } from "@/components/storyboard/shot-card";
import { PromptComposerPanel } from "@/components/storyboard/prompt-composer-panel";
import { GenerationPanel } from "@/components/storyboard/generation-panel";
import {
  SHOT_SIZES,
  CAMERA_ANGLES,
  CAMERA_MOVEMENTS,
  LENSES,
  DEPTH_OF_FIELD_OPTIONS,
  SHOT_STATUSES,
} from "@/components/storyboard/camera-options";
import {
  listScenes,
  listShots,
  createShot,
  updateShot,
  deleteShot,
  duplicateShot,
  reorderShots,
  listCharacters,
  listLocations,
  type Scene,
  type Shot,
  type Character,
  type Location,
} from "@/lib/api-client";

export default function StoryboardPage({ params }: { params: { id: string } }) {
  const projectId = params.id;
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [sceneId, setSceneId] = useState<string | null>(null);
  const [shots, setShots] = useState<Shot[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedShotId, setSelectedShotId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  useEffect(() => {
    Promise.all([listScenes(projectId), listCharacters(projectId), listLocations(projectId)])
      .then(([sceneList, characterList, locationList]) => {
        setScenes(sceneList);
        setCharacters(characterList);
        setLocations(locationList);
        if (sceneList.length > 0) setSceneId(sceneList[0].id);
        setLoading(false);
      })
      .catch((err) => {
        setError((err as Error).message);
        setLoading(false);
      });
  }, [projectId]);

  useEffect(() => {
    if (!sceneId) {
      setShots([]);
      return;
    }
    listShots(projectId, sceneId)
      .then(setShots)
      .catch((err) => setError((err as Error).message));
  }, [projectId, sceneId]);

  const selectedShot = useMemo(() => shots.find((s) => s.id === selectedShotId) ?? null, [shots, selectedShotId]);

  async function refreshShots() {
    if (!sceneId) return;
    const list = await listShots(projectId, sceneId);
    setShots(list);
    return list;
  }

  async function handleAddShot() {
    if (!sceneId) return;
    try {
      const created = await createShot(projectId, {
        sceneId,
        shotNumber: shots.length + 1,
        status: "DRAFT",
      });
      await refreshShots();
      setSelectedShotId(created.id);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleDuplicate(id: string) {
    try {
      const copy = await duplicateShot(projectId, id);
      await refreshShots();
      setSelectedShotId(copy.id);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this shot? This cannot be undone.")) return;
    try {
      await deleteShot(projectId, id);
      if (selectedShotId === id) setSelectedShotId(null);
      await refreshShots();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !sceneId) return;

    const oldIndex = shots.findIndex((s) => s.id === active.id);
    const newIndex = shots.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(shots, oldIndex, newIndex);
    setShots(reordered); // optimistic

    try {
      const updated = await reorderShots(
        projectId,
        sceneId,
        reordered.map((s) => s.id),
      );
      setShots(updated);
    } catch (err) {
      setError((err as Error).message);
      await refreshShots();
    }
  }

  async function patchSelectedShot(patch: Partial<Shot>) {
    if (!selectedShot) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateShot(projectId, selectedShot.id, patch as never);
      setShots((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function toggleCharacter(characterId: string) {
    if (!selectedShot) return;
    const has = selectedShot.characterIds.includes(characterId);
    const next = has
      ? selectedShot.characterIds.filter((id) => id !== characterId)
      : [...selectedShot.characterIds, characterId];
    patchSelectedShot({ characterIds: next });
  }

  if (loading) return <div className="px-8 py-10 text-sm text-text-muted">Loading…</div>;

  if (scenes.length === 0) {
    return (
      <div className="mx-auto max-w-md px-8 py-20 text-center text-sm text-text-muted">
        No scenes yet.{" "}
        <Link href={`/project/${projectId}/scenes`} className="text-accent-glow hover:underline">
          Create a scene first
        </Link>
        , then come back to build its storyboard.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border-subtle px-6 py-3">
        <label className="text-xs text-text-muted">Scene</label>
        <select
          value={sceneId ?? ""}
          onChange={(e) => {
            setSceneId(e.target.value);
            setSelectedShotId(null);
          }}
          className="rounded-md border border-border bg-panel px-2.5 py-1.5 text-sm text-text-primary outline-none focus:border-accent-soft"
        >
          {scenes.map((s) => (
            <option key={s.id} value={s.id}>
              Scene {s.sceneNumber} {s.intExt ? `— ${s.intExt}` : ""}
            </option>
          ))}
        </select>
        <button
          onClick={handleAddShot}
          className="ml-auto flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-soft"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          Add Shot
        </button>
      </div>

      {error && (
        <div className="mx-6 mt-3 rounded-md border border-status-danger/30 bg-status-danger/10 px-4 py-2 text-sm text-status-danger">
          {error}
        </div>
      )}

      {/* Film strip */}
      <div className="border-b border-border-subtle bg-panel/30 px-6 py-4">
        {shots.length === 0 ? (
          <p className="text-sm text-text-muted">No shots in this scene yet — add one above.</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={shots.map((s) => s.id)} strategy={horizontalListSortingStrategy}>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {shots.map((shot) => (
                  <ShotCard
                    key={shot.id}
                    shot={shot}
                    active={shot.id === selectedShotId}
                    onClick={() => setSelectedShotId(shot.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Detail panel */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {!selectedShot && (
          <div className="mx-auto max-w-md pt-16 text-center text-sm text-text-muted">
            Select a shot above to edit its details.
          </div>
        )}

        {selectedShot && (
          <div className="mx-auto max-w-3xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-text-primary">
                  Shot {selectedShot.shotNumber}
                  {selectedShot.name ? ` — ${selectedShot.name}` : ""}
                </h2>
                {saving && <span className="text-xs text-text-muted">Saving…</span>}
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedShot.status}
                  onChange={(e) => patchSelectedShot({ status: e.target.value as Shot["status"] })}
                  className="rounded-md border border-border bg-panel px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-accent-soft"
                >
                  {SHOT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => handleDuplicate(selectedShot.id)}
                  title="Duplicate"
                  className="rounded-md border border-border p-2 text-text-secondary hover:border-accent-soft hover:text-text-primary"
                >
                  <Copy className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
                <button
                  onClick={() => handleDelete(selectedShot.id)}
                  title="Delete"
                  className="rounded-md border border-status-danger/40 p-2 text-status-danger hover:bg-status-danger/10"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
              </div>
            </div>

            {selectedShot.status === "LOCKED" && (
              <div className="mb-4 rounded-md border border-accent-soft/30 bg-accent/5 px-4 py-2 text-xs text-accent-glow">
                This shot is locked. Change its status to edit prompt/reference fields.
              </div>
            )}

            <fieldset disabled={selectedShot.status === "LOCKED"} className="space-y-5 disabled:opacity-60">
              <div>
                <label className="mb-1 block text-xs text-text-muted">Description</label>
                <textarea
                  defaultValue={selectedShot.description ?? ""}
                  onBlur={(e) => patchSelectedShot({ description: e.target.value })}
                  rows={2}
                  className="w-full resize-none rounded-md border border-border bg-panel px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-soft"
                />
              </div>

              {/* Virtual camera controls */}
              <div>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
                  Camera
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <SelectField
                    label="Shot Size"
                    value={selectedShot.cameraShotSize ?? ""}
                    options={SHOT_SIZES}
                    onChange={(v) => patchSelectedShot({ cameraShotSize: v })}
                  />
                  <SelectField
                    label="Angle"
                    value={selectedShot.cameraAngle ?? ""}
                    options={CAMERA_ANGLES}
                    onChange={(v) => patchSelectedShot({ cameraAngle: v })}
                  />
                  <SelectField
                    label="Movement"
                    value={selectedShot.cameraMovement ?? ""}
                    options={CAMERA_MOVEMENTS}
                    onChange={(v) => patchSelectedShot({ cameraMovement: v })}
                  />
                  <SelectField
                    label="Lens"
                    value={selectedShot.lens ?? ""}
                    options={LENSES}
                    onChange={(v) => patchSelectedShot({ lens: v })}
                  />
                  <SelectField
                    label="Depth of Field"
                    value={selectedShot.depthOfField ?? ""}
                    options={DEPTH_OF_FIELD_OPTIONS}
                    onChange={(v) => patchSelectedShot({ depthOfField: v })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-text-muted">Lighting</label>
                  <input
                    defaultValue={selectedShot.lighting ?? ""}
                    onBlur={(e) => patchSelectedShot({ lighting: e.target.value })}
                    className="w-full rounded-md border border-border bg-panel px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-soft"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-text-muted">Mood</label>
                  <input
                    defaultValue={selectedShot.mood ?? ""}
                    onBlur={(e) => patchSelectedShot({ mood: e.target.value })}
                    className="w-full rounded-md border border-border bg-panel px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-soft"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-text-muted">Color Grade</label>
                  <input
                    defaultValue={selectedShot.colorGrade ?? ""}
                    onBlur={(e) => patchSelectedShot({ colorGrade: e.target.value })}
                    className="w-full rounded-md border border-border bg-panel px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-soft"
                  />
                </div>
              </div>

              {/* References */}
              <div>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
                  Characters
                </h3>
                {characters.length === 0 ? (
                  <p className="text-xs text-text-muted">
                    No characters yet —{" "}
                    <Link href={`/project/${projectId}/characters`} className="text-accent-glow hover:underline">
                      add some
                    </Link>
                    .
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {characters.map((c) => {
                      const active = selectedShot.characterIds.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          onClick={() => toggleCharacter(c.id)}
                          className={`rounded-full border px-3 py-1 text-xs ${
                            active
                              ? "border-accent-soft bg-accent/10 text-accent-glow"
                              : "border-border text-text-secondary hover:border-accent-soft/50"
                          }`}
                        >
                          @{c.tag}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs text-text-muted">Location</label>
                <select
                  value={selectedShot.locationId ?? ""}
                  onChange={(e) => patchSelectedShot({ locationId: e.target.value || undefined })}
                  className="w-full rounded-md border border-border bg-panel px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-soft"
                >
                  <option value="">No location set</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} (@{l.tag})
                    </option>
                  ))}
                </select>
              </div>

              {/* Prompt Composer */}
              <PromptComposerPanel
                projectId={projectId}
                shotId={selectedShot.id}
                prompt={selectedShot.prompt ?? ""}
                negativePrompt={selectedShot.negativePrompt ?? ""}
                locked={selectedShot.status === "LOCKED"}
                mentionTags={[
                  ...characters.map((c) => ({ tag: c.tag, label: c.name })),
                  ...locations.map((l) => ({ tag: l.tag, label: l.name })),
                ]}
                onApply={(patch) => patchSelectedShot(patch)}
              />
            </fieldset>

            {/* Generation actions — capability-gated per §23/§24 */}
            <GenerationPanel
              projectId={projectId}
              shotId={selectedShot.id}
              hasPrompt={Boolean(selectedShot.prompt)}
              locked={selectedShot.status === "LOCKED"}
              onSelectImage={(assetId) => patchSelectedShot({ selectedImageAssetId: assetId })}
              onSelectVideo={(assetId) => patchSelectedShot({ selectedVideoAssetId: assetId })}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-text-muted">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-border bg-panel px-2.5 py-2 text-sm text-text-primary outline-none focus:border-accent-soft"
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
