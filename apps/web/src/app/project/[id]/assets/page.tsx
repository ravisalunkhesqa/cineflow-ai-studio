"use client";

import { useEffect, useRef, useState } from "react";
import {
  Upload,
  Star,
  CheckCircle2,
  Archive,
  Trash2,
  Image as ImageIcon,
  Video,
  Music,
  File as FileIcon,
} from "lucide-react";
import { listAssets, uploadFile, updateAsset, deleteAsset, requestThumbnail, requestFrameExtraction, type Asset, type AssetType } from "@/lib/api-client";

const TYPE_FILTERS: { label: string; value: AssetType | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "Images", value: "IMAGE" },
  { label: "Videos", value: "VIDEO" },
  { label: "Audio", value: "AUDIO" },
  { label: "References", value: "REFERENCE" },
];

function iconFor(type: AssetType) {
  if (type === "IMAGE" || type === "REFERENCE" || type === "MASK") return ImageIcon;
  if (type === "VIDEO") return Video;
  if (type === "AUDIO" || type === "VOICE" || type === "MUSIC" || type === "SFX") return Music;
  return FileIcon;
}

export default function AssetsPage({ params }: { params: { id: string } }) {
  const projectId = params.id;
  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [filter, setFilter] = useState<AssetType | "ALL">("ALL");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    try {
      const list = await listAssets(projectId, filter === "ALL" ? undefined : { type: filter });
      setAssets(list);
    } catch (err) {
      setError((err as Error).message);
      setAssets([]);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, filter]);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const type: AssetType = file.type.startsWith("video/")
          ? "VIDEO"
          : file.type.startsWith("audio/")
            ? "AUDIO"
            : "IMAGE";
        await uploadFile(projectId, file, type);
      }
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function toggleFavorite(asset: Asset) {
    const next = asset.approvalStatus === "FAVORITE" ? "GENERATED" : "FAVORITE";
    await updateAsset(projectId, asset.id, { approvalStatus: next });
    await refresh();
  }

  async function toggleApproved(asset: Asset) {
    const next = asset.approvalStatus === "APPROVED" ? "GENERATED" : "APPROVED";
    await updateAsset(projectId, asset.id, { approvalStatus: next });
    await refresh();
  }

  async function archive(asset: Asset) {
    await updateAsset(projectId, asset.id, { approvalStatus: "ARCHIVED" });
    await refresh();
  }

  async function handleDelete(asset: Asset) {
    if (!confirm(`Permanently delete "${asset.filename}"? This cannot be undone.`)) return;
    try {
      await deleteAsset(projectId, asset.id);
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleThumbnail(asset: Asset) {
    try {
      await requestThumbnail(projectId, asset.id);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleExtractFrame(asset: Asset, position: "first" | "last") {
    try {
      await requestFrameExtraction(projectId, asset.id, position);
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Assets</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Images, videos, audio, and references for this project, stored in MinIO.
          </p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,audio/mpeg,audio/wav"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-soft disabled:opacity-50"
          >
            <Upload className="h-3.5 w-3.5" strokeWidth={1.75} />
            {uploading ? "Uploading…" : "Upload"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-md border border-status-warning/30 bg-status-warning/10 px-4 py-3 text-sm text-status-warning">
          {error}
        </div>
      )}

      <div className="mb-6 flex gap-1">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-md px-3 py-1.5 text-xs ${
              filter === f.value
                ? "bg-panel-raised text-text-primary"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {assets === null && <p className="text-sm text-text-muted">Loading…</p>}

      {assets?.length === 0 && !error && (
        <div className="rounded-lg border border-dashed border-border bg-panel/50 px-6 py-16 text-center text-sm text-text-muted">
          No assets yet. Upload images, video, or audio to get started.
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        {assets?.map((asset) => {
          const Icon = iconFor(asset.type);
          return (
            <div key={asset.id} className="overflow-hidden rounded-lg border border-border bg-panel">
              <div className="flex h-32 items-center justify-center bg-panel-raised">
                {asset.type === "IMAGE" || asset.type === "REFERENCE" ? (
                  asset.downloadUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={asset.downloadUrl} alt={asset.filename} className="h-full w-full object-cover" />
                  ) : (
                    <Icon className="h-6 w-6 text-text-muted" strokeWidth={1.5} />
                  )
                ) : (
                  <Icon className="h-6 w-6 text-text-muted" strokeWidth={1.5} />
                )}
              </div>
              <div className="p-2.5">
                <p className="truncate text-xs text-text-primary">{asset.filename}</p>
                <p className="mt-0.5 text-[10px] text-text-muted">
                  {asset.type} &middot; {asset.approvalStatus}
                </p>
                <div className="mt-2 flex items-center gap-1">
                  <button
                    onClick={() => toggleFavorite(asset)}
                    title="Favorite"
                    className={`rounded p-1 ${asset.approvalStatus === "FAVORITE" ? "text-status-warning" : "text-text-muted hover:text-text-primary"}`}
                  >
                    <Star className="h-3.5 w-3.5" strokeWidth={1.75} fill={asset.approvalStatus === "FAVORITE" ? "currentColor" : "none"} />
                  </button>
                  <button
                    onClick={() => toggleApproved(asset)}
                    title="Approve"
                    className={`rounded p-1 ${asset.approvalStatus === "APPROVED" ? "text-status-success" : "text-text-muted hover:text-text-primary"}`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </button>
                  <button onClick={() => archive(asset)} title="Archive" className="rounded p-1 text-text-muted hover:text-text-primary">
                    <Archive className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </button>
                  <button
                    onClick={() => handleDelete(asset)}
                    title="Delete"
                    className="ml-auto rounded p-1 text-text-muted hover:text-status-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </button>
                </div>
                {(asset.type === "IMAGE" || asset.type === "VIDEO" || asset.type === "REFERENCE") && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    <button
                      onClick={() => handleThumbnail(asset)}
                      className="rounded border border-border-subtle px-1.5 py-0.5 text-[10px] text-text-secondary hover:border-accent-soft hover:text-text-primary"
                    >
                      Generate Thumbnail
                    </button>
                    {asset.type === "VIDEO" && (
                      <>
                        <button
                          onClick={() => handleExtractFrame(asset, "first")}
                          className="rounded border border-border-subtle px-1.5 py-0.5 text-[10px] text-text-secondary hover:border-accent-soft hover:text-text-primary"
                        >
                          First Frame
                        </button>
                        <button
                          onClick={() => handleExtractFrame(asset, "last")}
                          className="rounded border border-border-subtle px-1.5 py-0.5 text-[10px] text-text-secondary hover:border-accent-soft hover:text-text-primary"
                        >
                          Last Frame
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
