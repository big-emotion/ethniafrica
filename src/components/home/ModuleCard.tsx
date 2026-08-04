import Link from "next/link";
import {
  BookOpen,
  GitCompare,
  Globe,
  History,
  Info,
  Link2,
  Network,
  Search,
  Tag,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { HomeModule } from "@/lib/accessModeHubs";

const ILLUSTRATIONS: Record<string, LucideIcon> = {
  users: Users,
  globe: Globe,
  network: Network,
  search: Search,
  tag: Tag,
  "book-open": BookOpen,
  info: Info,
  history: History,
  "link-2": Link2,
  "git-compare": GitCompare,
};

interface ModuleCardProps {
  module: HomeModule;
}

// @req FR92
export function ModuleCard({ module }: ModuleCardProps) {
  const Icon = ILLUSTRATIONS[module.illustration] ?? Info;
  const accent = `var(--afh-cat-${module.accent})`;
  const accentTint = `var(--afh-cat-${module.accent}-tint)`;

  const card = (
    <div
      data-testid={`module-card-${module.id}`}
      data-state={module.state}
      className="flex h-full flex-col gap-3 rounded-[14px] border p-6"
      style={{ borderColor: accent, backgroundColor: accentTint }}
    >
      <span
        data-testid="module-icon"
        aria-hidden="true"
        className="inline-flex h-10 w-10 items-center justify-center rounded-full"
        style={{ backgroundColor: "var(--afh-surface)", color: accent }}
      >
        <Icon size={20} />
      </span>
      <h2
        className="text-base font-semibold"
        style={{ color: "var(--afh-text)" }}
      >
        {module.title}
      </h2>
      {module.state === "soon" && (
        <span
          className="inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-medium"
          style={{
            backgroundColor: "var(--afh-surface)",
            color: "var(--afh-text-soft)",
          }}
        >
          Bientôt
        </span>
      )}
    </div>
  );

  if (module.state === "live" && module.href) {
    return (
      <Link href={module.href} className="block h-full no-underline">
        {card}
      </Link>
    );
  }

  return card;
}
