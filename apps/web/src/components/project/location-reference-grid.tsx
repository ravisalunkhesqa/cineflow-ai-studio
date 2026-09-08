"use client";

import { useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import {
  uploadFile,
  addLocationReference,
  deleteLocationReference,
  type LocationReferenceItem,
} from "@/lib/api-client";

export function LocationReferenceGrid({
  projectId,
  locationId,
  references,
  onChange,
}: {
  projectId: string;
  locationId: string;
  references: LocationReferenceItem[];
  onChange: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const asset = await uploadFile(projectId, file, "REFERENCE");
      await addLocationReference(projectId, locationId, asset.id);
      onChange();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(refId: string) {
    await deleteLocationReference(projectId, locationId, refId);
    onChange();
  }

  return (
    <div className="mb-6">
      <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-text-muted">
        Reference Images
      </label>
      {error && <p className="mb-2 text-xs text-status-danger">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {references.map((ref) => (
          <div key={ref.id} className="relative h-20 w-20 overflow-hidden rounded-md border border-border bg-panel-raised">
            {ref.asset.downloadUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ref.asset.downloadUrl} alt="" className="h-full w-full object-cover" />
            )}
            <button
              onClick={() => handleDelete(ref.id)}
              className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-status-danger"
            >
              <X className="h-3 w-3" strokeWidth={2} />
            </button>
          </div>
        ))}
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex h-20 w-20 items-center justify-center rounded-md border border-dashed border-border text-text-muted hover:text-text-primary disabled:opacity-50"
        >
          <Plus className="h-4 w-4" strokeWidth={1.75} />
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
