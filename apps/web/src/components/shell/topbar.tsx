"use client";

import { Undo2, Redo2, Sparkles, Download, SlidersHorizontal } from "lucide-react";

export function Topbar({ projectName }: { projectName?: string }) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-panel px-4">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-text-primary">
          {projectName ?? "No project open"}
        </span>
        <span className="flex items-center gap-1 text-xs text-text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-status-success" />
          Saved
        </span>
      </div>

      <div className="flex items-center gap-1">
        <IconButton icon={Undo2} label="Undo" />
        <IconButton icon={Redo2} label="Redo" />
        <div className="mx-2 h-5 w-px bg-border" />
        <button className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-text-secondary hover:border-accent-soft hover:text-text-primary">
          <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />
          AUTO model
        </button>
        <button className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-text-secondary hover:border-accent-soft hover:text-text-primary">
          <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.75} />
          16:9
        </button>
        <div className="mx-2 h-5 w-px bg-border" />
        <button className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-soft">
          <Download className="h-3.5 w-3.5" strokeWidth={1.75} />
          Export
        </button>
      </div>
    </header>
  );
}

function IconButton({ icon: Icon, label }: { icon: typeof Undo2; label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      className="rounded-md p-2 text-text-secondary hover:bg-panel-raised hover:text-text-primary"
    >
      <Icon className="h-4 w-4" strokeWidth={1.75} />
    </button>
  );
}
