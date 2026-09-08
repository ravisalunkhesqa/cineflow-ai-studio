"use client";

import { useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import {
  uploadFile,
  addCharacterReference,
  deleteCharacterReference,
  type CharacterReferenceItem,
  type ReferenceAngle,
} from "@/lib/api-client";

const ANGLES: ReferenceAngle[] = ["FRONT", "PROFILE", "THREE_QUARTER", "FULL_BODY", "COSTUME", "EXPRESSION"];
const ANGLE_LABELS: Record<ReferenceAngle, string> = {
  FRONT: "Front",
  PROFILE: "Profile",
  THREE_QUARTER: "3/4",
  FULL_BODY: "Full Body",
  COSTUME: "Costume",
  EXPRESSION: "Expression",
};

export function CharacterReferenceGrid({
  projectId,
  characterId,
  references,
  onChange,
}: {
  projectId: string;
  characterId: string;
  references: CharacterReferenceItem[];
  onChange: () => void;
}) {
  const [uploadingAngle, setUploadingAngle] = useState<ReferenceAngle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  async function handleUpload(angle: ReferenceAngle, file: File) {
    setUploadingAngle(angle);
    setError(null);
    try {
      const asset = await uploadFile(projectId, file, "REFERENCE");
      await addCharacterReference(projectId, characterId, asset.id, angle);
      onChange();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploadingAngle(null);
    }
  }

  async function handleDelete(refId: string) {
    await deleteCharacterReference(projectId, characterId, refId);
    onChange();
  }

  return (
    <div className="mb-6">
      <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-text-muted">
        Reference Images
      </label>
      {error && <p className="mb-2 text-xs text-status-danger">{error}</p>}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {ANGLES.map((angle) => {
          const existing = references.find((r) => r.angle === angle);
          return (
            <div key={angle} className="flex flex-col items-center gap-1">
              <div className="relative h-20 w-full overflow-hidden rounded-md border border-border bg-panel-raised">
                {existing ? (
                  <>
                    {existing.asset.downloadUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={existing.asset.downloadUrl}
                        alt={angle}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                    <button
                      onClick={() => handleDelete(existing.id)}
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-status-danger"
                    >
                      <X className="h-3 w-3" strokeWidth={2} />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => inputRefs.current[angle]?.click()}
                    disabled={uploadingAngle === angle}
                    className="flex h-full w-full items-center justify-center text-text-muted hover:text-text-primary disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                )}
                <input
                  ref={(el) => {
                    inputRefs.current[angle] = el;
                  }}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(angle, file);
                    e.target.value = "";
                  }}
                />
              </div>
              <span className="text-[10px] text-text-muted">{ANGLE_LABELS[angle]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
