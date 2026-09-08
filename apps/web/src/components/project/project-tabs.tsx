"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const TABS: { key: string; label: string; disabled?: boolean }[] = [
  { key: "", label: "Overview" },
  { key: "characters", label: "Characters" },
  { key: "locations", label: "Locations" },
  { key: "style", label: "Style Bible" },
  { key: "scenes", label: "Scenes" },
  { key: "storyboard", label: "Storyboard" },
  { key: "timeline", label: "Timeline", disabled: true },
  { key: "assets", label: "Assets" },
  { key: "workflows", label: "Workflows", disabled: true },
];

export function ProjectTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const base = `/project/${projectId}`;

  return (
    <nav className="flex flex-1 gap-1 px-6">
      {TABS.map((tab) => {
        const href = tab.key ? `${base}/${tab.key}` : base;
        const active = pathname === href;
        if (tab.disabled) {
          return (
            <span
              key={tab.key || "overview"}
              title="Planned for a later phase"
              className="cursor-not-allowed px-3 py-3 text-sm text-text-muted/50"
            >
              {tab.label}
            </span>
          );
        }
        return (
          <Link
            key={tab.key || "overview"}
            href={href}
            className={clsx(
              "border-b-2 px-3 py-3 text-sm transition-colors",
              active
                ? "border-accent text-text-primary"
                : "border-transparent text-text-secondary hover:text-text-primary",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
