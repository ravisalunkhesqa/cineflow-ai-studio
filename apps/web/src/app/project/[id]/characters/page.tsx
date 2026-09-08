"use client";

import { useEffect, useState } from "react";
import { Plus, Lock, Unlock, Trash2, User } from "lucide-react";
import { CharacterReferenceGrid } from "@/components/project/character-reference-grid";
import {
  listCharacters,
  createCharacter,
  updateCharacter,
  deleteCharacter,
  type Character,
} from "@/lib/api-client";

const BLANK_FORM = {
  name: "",
  tag: "",
  ageRange: "",
  appearance: "",
  faceDescription: "",
  hair: "",
  eyes: "",
  skin: "",
  wardrobe: "",
  accessories: "",
  personality: "",
  bodyType: "",
  visualStyle: "",
  continuityNotes: "",
  characterLock: false,
};

type FormState = typeof BLANK_FORM;

function toFormState(c: Character): FormState {
  return {
    name: c.name,
    tag: c.tag,
    ageRange: c.ageRange ?? "",
    appearance: c.appearance ?? "",
    faceDescription: c.faceDescription ?? "",
    hair: c.hair ?? "",
    eyes: c.eyes ?? "",
    skin: c.skin ?? "",
    wardrobe: c.wardrobe ?? "",
    accessories: c.accessories ?? "",
    personality: c.personality ?? "",
    bodyType: c.bodyType ?? "",
    visualStyle: c.visualStyle ?? "",
    continuityNotes: c.continuityNotes ?? "",
    characterLock: c.characterLock,
  };
}

const FIELD_GROUPS: { label: string; keys: (keyof FormState)[] }[] = [
  { label: "Identity", keys: ["ageRange", "bodyType", "visualStyle"] },
  { label: "Appearance", keys: ["appearance", "faceDescription", "hair", "eyes", "skin"] },
  { label: "Wardrobe & Props", keys: ["wardrobe", "accessories"] },
  { label: "Personality & Continuity", keys: ["personality", "continuityNotes"] },
];

const FIELD_LABELS: Record<string, string> = {
  ageRange: "Age range",
  bodyType: "Body type",
  visualStyle: "Visual style",
  appearance: "Appearance",
  faceDescription: "Face description",
  hair: "Hair",
  eyes: "Eyes",
  skin: "Skin",
  wardrobe: "Wardrobe",
  accessories: "Accessories",
  personality: "Personality",
  continuityNotes: "Continuity notes",
};

export default function CharactersPage({ params }: { params: { id: string } }) {
  const projectId = params.id;
  const [characters, setCharacters] = useState<Character[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<FormState>(BLANK_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function refresh() {
    try {
      const list = await listCharacters(projectId);
      setCharacters(list);
      return list;
    } catch (err) {
      setError((err as Error).message);
      setCharacters([]);
      return [];
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  function selectCharacter(c: Character) {
    setSelectedId(c.id);
    setForm(toFormState(c));
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
      const payload = {
        ...form,
        ageRange: form.ageRange || undefined,
        appearance: form.appearance || undefined,
        faceDescription: form.faceDescription || undefined,
        hair: form.hair || undefined,
        eyes: form.eyes || undefined,
        skin: form.skin || undefined,
        wardrobe: form.wardrobe || undefined,
        accessories: form.accessories || undefined,
        personality: form.personality || undefined,
        bodyType: form.bodyType || undefined,
        visualStyle: form.visualStyle || undefined,
        continuityNotes: form.continuityNotes || undefined,
      };
      if (selectedId === "new") {
        const created = await createCharacter(projectId, payload);
        await refresh();
        selectCharacterById(created.id);
      } else if (selectedId) {
        const updated = await updateCharacter(projectId, selectedId, payload);
        await refresh();
        selectCharacter(updated);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function selectCharacterById(id: string) {
    const list = await refresh();
    const found = list.find((c) => c.id === id);
    if (found) selectCharacter(found);
  }

  async function handleDelete() {
    if (selectedId === "new" || !selectedId) return;
    if (!confirm("Delete this character? This cannot be undone.")) return;
    try {
      await deleteCharacter(projectId, selectedId);
      setSelectedId(null);
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="flex h-full">
      {/* Character list */}
      <div className="w-72 shrink-0 border-r border-border bg-panel/50 p-3">
        <button
          onClick={startNew}
          className="mb-3 flex w-full items-center justify-center gap-1.5 rounded-md bg-accent px-3 py-2 text-xs font-medium text-white hover:bg-accent-soft"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          Add Character
        </button>

        {characters === null && <p className="text-xs text-text-muted">Loading…</p>}
        {characters?.length === 0 && (
          <p className="px-1 text-xs text-text-muted">No characters yet.</p>
        )}

        <div className="space-y-1">
          {characters?.map((c) => (
            <button
              key={c.id}
              onClick={() => selectCharacter(c)}
              className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors ${
                selectedId === c.id
                  ? "bg-panel-raised text-text-primary"
                  : "text-text-secondary hover:bg-panel-raised/60"
              }`}
            >
              <User className="h-3.5 w-3.5 shrink-0 text-text-muted" strokeWidth={1.75} />
              <span className="truncate">{c.name}</span>
              <span className="ml-auto text-[10px] text-text-muted">@{c.tag}</span>
              {c.characterLock && <Lock className="h-3 w-3 shrink-0 text-accent-glow" strokeWidth={2} />}
            </button>
          ))}
        </div>
      </div>

      {/* Detail / form */}
      <div className="flex-1 overflow-y-auto px-8 py-8">
        {!selectedId && (
          <div className="mx-auto max-w-md pt-20 text-center text-sm text-text-muted">
            Select a character on the left, or add a new one. Characters you tag as
            <code className="mx-1 rounded bg-panel-raised px-1 py-0.5">@tag</code>
            can be referenced from prompts across the project once the Prompt Composer
            (Phase 5) lands.
          </div>
        )}

        {selectedId && (
          <div className="mx-auto max-w-2xl">
            {error && (
              <div className="mb-4 rounded-md border border-status-danger/30 bg-status-danger/10 px-4 py-3 text-sm text-status-danger">
                {error}
              </div>
            )}

            <div className="mb-6 flex items-end justify-between gap-4">
              <div className="flex-1 space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-text-muted">Name</label>
                  <input
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    className="w-full rounded-md border border-border bg-panel px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-soft"
                    placeholder="Aarohi"
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
                    placeholder="Aarohi"
                  />
                </div>
              </div>
              <button
                onClick={() => updateField("characterLock", !form.characterLock)}
                title="Character Lock: auto-include stable descriptors in generation prompts"
                className={`flex items-center gap-1.5 rounded-md border px-3 py-2 text-xs ${
                  form.characterLock
                    ? "border-accent-soft bg-accent/10 text-accent-glow"
                    : "border-border text-text-secondary"
                }`}
              >
                {form.characterLock ? (
                  <Lock className="h-3.5 w-3.5" strokeWidth={2} />
                ) : (
                  <Unlock className="h-3.5 w-3.5" strokeWidth={2} />
                )}
                {form.characterLock ? "Locked" : "Lock"}
              </button>
            </div>

            <div className="mb-6">
              {selectedId !== "new" ? (
                <CharacterReferenceGrid
                  projectId={projectId}
                  characterId={selectedId!}
                  references={characters?.find((c) => c.id === selectedId)?.references ?? []}
                  onChange={refresh}
                />
              ) : (
                <div className="rounded-lg border border-dashed border-border bg-panel/40 px-4 py-3 text-xs text-text-muted">
                  Save the character first, then upload reference images (FRONT / PROFILE /
                  3-4 / FULL BODY / COSTUME / EXPRESSION).
                </div>
              )}
            </div>

            {FIELD_GROUPS.map((group) => (
              <div key={group.label} className="mb-6">
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
                  {group.label}
                </h3>
                <div className="space-y-3">
                  {group.keys.map((key) => (
                    <div key={key}>
                      <label className="mb-1 block text-xs text-text-muted">
                        {FIELD_LABELS[key]}
                      </label>
                      <textarea
                        value={form[key] as string}
                        onChange={(e) => updateField(key, e.target.value as FormState[typeof key])}
                        rows={key === "appearance" || key === "continuityNotes" ? 3 : 1}
                        className="w-full resize-none rounded-md border border-border bg-panel px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-soft"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="flex items-center gap-2 border-t border-border-subtle pt-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-soft disabled:opacity-50"
              >
                {saving ? "Saving…" : selectedId === "new" ? "Create Character" : "Save Changes"}
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
