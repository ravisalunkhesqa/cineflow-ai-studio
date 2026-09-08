import Link from "next/link";
import {
  Home,
  FolderOpen,
  Image as ImageIcon,
  Users,
  MapPin,
  Palette,
  Workflow,
  Cpu,
  Settings,
  Clapperboard,
} from "lucide-react";
import clsx from "clsx";

const NAV_ITEMS = [
  { label: "Home", href: "/", icon: Home },
  { label: "Projects", href: "/projects", icon: FolderOpen },
  { label: "Assets", href: "/assets", icon: ImageIcon },
  { label: "Characters", href: "/characters", icon: Users },
  { label: "Locations", href: "/locations", icon: MapPin },
  { label: "Styles", href: "/styles", icon: Palette },
  { label: "Workflows", href: "/workflows", icon: Workflow },
  { label: "Models", href: "/settings/models", icon: Cpu },
  { label: "Settings", href: "/settings/general", icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="flex h-full w-[220px] flex-col border-r border-border bg-panel">
      <div className="flex items-center gap-2 px-5 py-5">
        <Clapperboard className="h-5 w-5 text-accent-glow" strokeWidth={1.75} />
        <span className="text-sm font-semibold tracking-wide text-text-primary">
          CineFlow
        </span>
      </div>
      <nav className="flex-1 space-y-0.5 px-3">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-text-secondary",
                "transition-colors hover:bg-panel-raised hover:text-text-primary",
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={1.75} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border-subtle px-5 py-3 text-[11px] text-text-muted">
        Local mode &middot; v0.1.0
      </div>
    </aside>
  );
}
