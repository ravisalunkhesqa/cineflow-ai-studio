"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Film, Plus, Clock, Layers } from "lucide-react";
import { PROJECT_TEMPLATES } from "./templates";
import { createProject, listProjects, type ProjectSummary } from "@/lib/api-client";

export function Dashboard() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState<string | null>(null);

  async function refresh() {
    try {
      setProjects(await listProjects());
      setError(null);
    } catch (err) {
      setError(
        (err as Error).message +
          " — is the API running? See SETUP_WINDOWS.md (`pnpm dev` + `docker compose up -d`).",
      );
      setProjects([]);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleNewProject(templateKey: string, aspectRatio: string, name: string) {
    setCreating(templateKey);
    try {
      const project = await createProject({ name, templateKey, aspectRatio });
      router.push(`/project/${project.id}`);
    } catch (err) {
      setError((err as Error).message);
      setCreating(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <header className="mb-10">
        <h1 className="text-2xl font-semibold text-text-primary">CineFlow AI Studio</h1>
        <p className="mt-1 text-sm text-text-secondary">Imagine. Direct. Generate. Edit.</p>
      </header>

      {error && (
        <div className="mb-8 rounded-md border border-status-warning/30 bg-status-warning/10 px-4 py-3 text-sm text-status-warning">
          {error}
        </div>
      )}

      <section className="mb-12">
        <div className="mb-4 flex items-center gap-2">
          <Plus className="h-4 w-4 text-accent-glow" strokeWidth={1.75} />
          <h2 className="text-sm font-medium uppercase tracking-wide text-text-secondary">
            New Project
          </h2>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {PROJECT_TEMPLATES.map((tpl) => (
            <button
              key={tpl.key}
              disabled={creating !== null}
              onClick={() => handleNewProject(tpl.key, tpl.aspectRatio, `Untitled ${tpl.name}`)}
              className="group flex flex-col items-start gap-2 rounded-lg border border-border bg-panel p-4 text-left transition-colors hover:border-accent-soft hover:shadow-glow disabled:opacity-50"
            >
              <Film className="h-5 w-5 text-accent-glow" strokeWidth={1.5} />
              <span className="text-sm font-medium text-text-primary">
                {creating === tpl.key ? "Creating…" : tpl.name}
              </span>
              <span className="text-xs text-text-muted">{tpl.blurb}</span>
              <span className="mt-1 rounded border border-border-subtle px-1.5 py-0.5 text-[10px] text-text-muted">
                {tpl.aspectRatio}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4 text-text-secondary" strokeWidth={1.75} />
          <h2 className="text-sm font-medium uppercase tracking-wide text-text-secondary">
            Recent Projects
          </h2>
        </div>

        {projects === null && <p className="text-sm text-text-muted">Loading…</p>}

        {projects !== null && projects.length === 0 && !error && (
          <div className="rounded-lg border border-dashed border-border bg-panel/50 px-6 py-10 text-center text-sm text-text-muted">
            No projects yet. Start one from a template above.
          </div>
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
                  {new Date(project.updatedAt).toLocaleDateString()} &middot;{" "}
                  {project.aspectRatio} &middot; {project._count.scenes} scenes
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
