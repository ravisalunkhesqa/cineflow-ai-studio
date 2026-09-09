"use client";

import { useEffect, useState } from "react";
import { ChevronUp, ChevronDown, Loader2, CheckCircle2, XCircle, Ban, X } from "lucide-react";
import { streamJobs, cancelJob, type GenerationJob } from "@/lib/api-client";

const STATUS_ICON: Record<string, typeof Loader2> = {
  QUEUED: Loader2,
  PROCESSING: Loader2,
  SUCCEEDED: CheckCircle2,
  FAILED: XCircle,
  CANCELLED: Ban,
};

const STATUS_COLOR: Record<string, string> = {
  QUEUED: "text-text-muted",
  PROCESSING: "text-accent-glow",
  SUCCEEDED: "text-status-success",
  FAILED: "text-status-danger",
  CANCELLED: "text-text-muted",
};

function jobLabel(type: string): string {
  return type
    .toLowerCase()
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

export function JobTray({ projectId }: { projectId: string }) {
  const [expanded, setExpanded] = useState(false);
  const [active, setActive] = useState<GenerationJob[]>([]);
  const [recentlyFinished, setRecentlyFinished] = useState<GenerationJob[]>([]);

  useEffect(() => {
    const close = streamJobs(projectId, (data) => {
      setActive(data.active);
      setRecentlyFinished(data.recentlyFinished);
    });
    return close;
  }, [projectId]);

  const allJobs = [...active, ...recentlyFinished];
  if (allJobs.length === 0) return null;

  async function handleCancel(jobId: string) {
    try {
      await cancelJob(jobId);
    } catch {
      // The route already explains why cancellation isn't possible (e.g. already
      // processing) — surfacing a toast here is a nice-to-have, not essential.
    }
  }

  return (
    <div className="border-t border-border bg-panel">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-2 text-xs text-text-secondary hover:text-text-primary"
      >
        <span className="flex items-center gap-2">
          {active.length > 0 && <Loader2 className="h-3.5 w-3.5 animate-spin text-accent-glow" strokeWidth={2} />}
          {active.length > 0 ? `${active.length} job${active.length > 1 ? "s" : ""} running` : "Recent jobs"}
        </span>
        {expanded ? <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} /> : <ChevronUp className="h-3.5 w-3.5" strokeWidth={2} />}
      </button>

      {expanded && (
        <div className="max-h-40 overflow-y-auto border-t border-border-subtle px-4 py-2">
          {allJobs.map((job) => {
            const Icon = STATUS_ICON[job.status] ?? Loader2;
            const spinning = job.status === "QUEUED" || job.status === "PROCESSING";
            return (
              <div key={job.id} className="flex items-center gap-2 py-1.5 text-xs">
                <Icon className={`h-3.5 w-3.5 ${STATUS_COLOR[job.status]} ${spinning ? "animate-spin" : ""}`} strokeWidth={2} />
                <span className="text-text-secondary">{jobLabel(job.type)}</span>
                <span className={STATUS_COLOR[job.status]}>{job.status}</span>
                {job.errorMessage && (
                  <span className="truncate text-text-muted" title={job.errorMessage}>
                    — {job.errorMessage}
                  </span>
                )}
                {job.status === "QUEUED" && (
                  <button onClick={() => handleCancel(job.id)} title="Cancel" className="ml-auto text-text-muted hover:text-status-danger">
                    <X className="h-3 w-3" strokeWidth={2} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
