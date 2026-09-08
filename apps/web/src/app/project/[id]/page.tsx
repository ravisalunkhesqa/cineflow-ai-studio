"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, MapPin, Palette, Clapperboard, Image as ImageIcon } from "lucide-react";
import { getProject, type ProjectDetail } from "@/lib/api-client";

export default function ProjectOverviewPage({ params }: { params: { id: string } }) {
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getProject(params.id)
      .then(setProject)
      .catch((err) => setError((err as Error).message));
  }, [params.id]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-8 py-10">
        <div className="rounded-md border border-status-danger/30 bg-status-danger/10 px-4 py-3 text-sm text-status-danger">
          {error}
        </div>
      </div>
    );
  }

  if (!project) {
    return <div className="px-8 py-10 text-sm text-text-muted">Loading…</div>;
  }

  const cards = [
    {
      label: "Story",
      icon: Clapperboard,
      value: project.tagline ? "Started" : "Not started",
      href: `/project/${project.id}`,
    },
    { label: "Characters", icon: Users, value: `${project.characters.length}`, href: `/project/${project.id}/characters` },
    { label: "Locations", icon: MapPin, value: `${project.locations.length}`, href: `/project/${project.id}/locations` },
    {
      label: "Style Bible",
      icon: Palette,
      value: project.styleBible?.locked ? "Locked" : project.styleBible?.visualStyle ? "Set" : "Not set",
      href: `/project/${project.id}/style`,
    },
    { label: "Scenes", icon: ImageIcon, value: `${project.scenes.length}`, href: `/project/${project.id}` },
  ];

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <header className="mb-8">
        <h1 className="text-xl font-semibold text-text-primary">{project.name}</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {project.aspectRatio} &middot; {project.templateKey ?? "custom"}
        </p>
      </header>

      <div className="grid grid-cols-3 gap-4 sm:grid-cols-5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className="flex flex-col gap-2 rounded-lg border border-border bg-panel p-4 transition-colors hover:border-accent-soft"
            >
              <Icon className="h-4 w-4 text-accent-glow" strokeWidth={1.75} />
              <span className="text-xs text-text-muted">{card.label}</span>
              <span className="text-lg font-medium text-text-primary">{card.value}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
