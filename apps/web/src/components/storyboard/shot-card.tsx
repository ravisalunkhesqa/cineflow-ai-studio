"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Lock, ImageIcon, GripVertical } from "lucide-react";
import clsx from "clsx";
import type { Shot } from "@/lib/api-client";

const STATUS_COLORS: Record<Shot["status"], string> = {
  DRAFT: "bg-text-muted/20 text-text-muted",
  READY: "bg-accent/20 text-accent-glow",
  GENERATING: "bg-status-warning/20 text-status-warning",
  REVIEW: "bg-status-warning/20 text-status-warning",
  APPROVED: "bg-status-success/20 text-status-success",
  LOCKED: "bg-accent-soft/30 text-accent-glow",
};

export function ShotCard({
  shot,
  active,
  onClick,
}: {
  shot: Shot;
  active: boolean;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: shot.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={clsx(
        "flex w-56 shrink-0 cursor-pointer flex-col overflow-hidden rounded-lg border bg-panel transition-colors",
        active ? "border-accent-soft shadow-glow" : "border-border hover:border-accent-soft/50",
      )}
    >
      <div className="flex h-28 items-center justify-center bg-panel-raised text-text-muted">
        <ImageIcon className="h-6 w-6" strokeWidth={1.5} />
      </div>
      <div className="flex items-center gap-1.5 border-t border-border-subtle px-2.5 py-2">
        <button
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="cursor-grab text-text-muted hover:text-text-secondary active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-3.5 w-3.5" strokeWidth={1.75} />
        </button>
        <span className="text-xs font-medium text-text-primary">Shot {shot.shotNumber}</span>
        {shot.status === "LOCKED" && <Lock className="h-3 w-3 text-accent-glow" strokeWidth={2} />}
        <span
          className={clsx(
            "ml-auto rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide",
            STATUS_COLORS[shot.status],
          )}
        >
          {shot.status}
        </span>
      </div>
      <div className="px-2.5 pb-2.5 text-[11px] text-text-muted">
        {[shot.cameraShotSize, shot.cameraMovement, shot.lens].filter(Boolean).join(" · ") || "No camera set"}
      </div>
    </div>
  );
}
