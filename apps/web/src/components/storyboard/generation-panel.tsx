"use client";

import { useEffect, useState } from "react";
import { Image as ImageIcon, Video, Check } from "lucide-react";
import {
  generateShotImage,
  generateShotVideo,
  listShotGenerations,
  getGenerationCapabilities,
  type Asset,
  type GenerationCapabilities,
} from "@/lib/api-client";

export function GenerationPanel({
  projectId,
  shotId,
  hasPrompt,
  locked,
  onSelectImage,
  onSelectVideo,
}: {
  projectId: string;
  shotId: string;
  hasPrompt: boolean;
  locked: boolean;
  onSelectImage: (assetId: string) => void;
  onSelectVideo: (assetId: string) => void;
}) {
  const [capabilities, setCapabilities] = useState<GenerationCapabilities | null>(null);
  const [generations, setGenerations] = useState<Asset[]>([]);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getGenerationCapabilities().then(setCapabilities);
  }, []);

  async function refreshGenerations() {
    const results = await listShotGenerations(projectId, shotId);
    setGenerations(results);
  }

  useEffect(() => {
    refreshGenerations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shotId]);

  async function handleGenerateImage() {
    setGeneratingImage(true);
    setError(null);
    try {
      await generateShotImage(projectId, shotId);
      setTimeout(refreshGenerations, 4000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGeneratingImage(false);
    }
  }

  async function handleGenerateVideo() {
    setGeneratingVideo(true);
    setError(null);
    try {
      await generateShotVideo(projectId, shotId);
      setTimeout(refreshGenerations, 4000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGeneratingVideo(false);
    }
  }

  const imageDisabledReason = locked
    ? "Shot is locked."
    : !hasPrompt
      ? "Add a prompt first."
      : !capabilities?.imageConfigured
        ? "No image-generation provider is configured."
        : null;

  const videoDisabledReason = locked
    ? "Shot is locked."
    : !hasPrompt
      ? "Add a prompt first."
      : !capabilities?.videoConfigured
        ? "No video-generation provider is configured."
        : null;

  return (
    <div className="mt-6 border-t border-border-subtle pt-4">
      <div className="flex items-center gap-2">
        <button
          onClick={handleGenerateImage}
          disabled={Boolean(imageDisabledReason) || generatingImage}
          title={imageDisabledReason ?? undefined}
          className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm text-text-secondary hover:border-accent-soft hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ImageIcon className="h-3.5 w-3.5" strokeWidth={1.75} />
          {generatingImage ? "Queuing…" : "Generate Image"}
        </button>
        <button
          onClick={handleGenerateVideo}
          disabled={Boolean(videoDisabledReason) || generatingVideo}
          title={videoDisabledReason ?? undefined}
          className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm text-text-secondary hover:border-accent-soft hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Video className="h-3.5 w-3.5" strokeWidth={1.75} />
          {generatingVideo ? "Queuing…" : "Generate Video"}
        </button>
        {capabilities && !capabilities.imageConfigured && !capabilities.videoConfigured && (
          <span className="text-xs text-text-muted">
            Enable a real provider, or set <code className="rounded bg-panel-raised px-1">ENABLE_MOCK_PROVIDERS=true</code> in
            dev to test this pipeline with placeholder output.
          </span>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-status-danger">{error}</p>}

      {generations.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-xs text-text-muted">Generated results — check the Job Tray for progress</p>
          <div className="flex flex-wrap gap-2">
            {generations.map((asset) => (
              <div key={asset.id} className="relative w-28 overflow-hidden rounded-md border border-border bg-panel">
                <div className="flex h-20 items-center justify-center bg-panel-raised">
                  {asset.type === "IMAGE" && asset.downloadUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={asset.downloadUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Video className="h-5 w-5 text-text-muted" strokeWidth={1.5} />
                  )}
                </div>
                {asset.tags.includes("mock") && (
                  <span className="absolute left-1 top-1 rounded bg-status-warning/90 px-1 text-[9px] font-medium text-black">
                    DEV MOCK
                  </span>
                )}
                <button
                  onClick={() => (asset.type === "IMAGE" ? onSelectImage(asset.id) : onSelectVideo(asset.id))}
                  className="flex w-full items-center justify-center gap-1 border-t border-border-subtle py-1 text-[10px] text-text-secondary hover:text-text-primary"
                >
                  <Check className="h-2.5 w-2.5" strokeWidth={2} />
                  Use
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
