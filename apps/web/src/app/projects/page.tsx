"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Layers } from "lucide-react";
import { listProjects, type ProjectSummary } from "@/lib/api-client";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listProjects()
      .then(setProjects)
      .catch((err) => setError((err as Error).message));
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <h1 className="mb-6 text-xl font-semibold text-text-primary">All Projects</h1>

      {error && (
        <div className="mb-6 rounded-md border border-status-warning/30 bg-status-warning/10 px-4 py-3 text-sm text-status-warning">
          {error}
        </div>
      )}

      {projects === null && !error && <p className="text-sm text-text-muted">Loading…</p>}

      {projects?.length === 0 && !error && (
        <p className="text-sm text-text-muted">
          No projects yet. Create one from the Dashboard.
        </p>
      )}

      <div className="grid grid-cols-3 gap-4">
        {projects?.map((project) => (
          <Link
            key={project.id}
            href={`/project/${project.id}`}
            className="overflow-hidden rounded-lg border border-border bg-panel transition-colors hover:border-accent-soft"
          >
            <div className="flex h-32 items-center justify-center bg-panel-raised">
              <Layers className="h-6 w-6 text-text-muted" strokeWidth={1.5} />
            </div>
            <div className="p-3">
              <p className="truncate text-sm font-medium text-text-primary">{project.name}</p>
              <p className="mt-0.5 text-xs text-text-muted">
                {new Date(project.updatedAt).toLocaleDateString()} &middot; {project.aspectRatio}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
