"use client";

import Link from "next/link";
import { Globe, Network, Users, type LucideIcon } from "lucide-react";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";
import { getLocalizedRoute, type PageType } from "@/lib/routing";
import type { Language } from "@/types/shared";
import type { CorpusCounts } from "@/lib/home/corpusCounts";

const VERB = "Explorer";

interface EntryPointDef {
  id: "peuples" | "pays" | "familles";
  name: string;
  icon: LucideIcon;
  accentClass: string;
  page: PageType;
  count: (counts: CorpusCounts) => number;
}

// Accent scope for home entry points (atlas-charter.md §2, "Home modules"
// row): peoples=ocre, countries=teal, families=terre.
//
// ETNI-1216/REQ-114: each entry point now opens its access mode's hub
// route rather than the resource page directly, so a module the hub
// groups (e.g. noms, comparer under peuples) is reachable within two
// clicks from home (home → hub → module) instead of being unreachable.
const ENTRY_POINT_DEFS: EntryPointDef[] = [
  {
    id: "peuples",
    name: "Peuples",
    icon: Users,
    accentClass: "afh-accent-ocre",
    page: "peoplesHub",
    count: (counts) => counts.peoples,
  },
  {
    id: "pays",
    name: "Pays",
    icon: Globe,
    accentClass: "afh-accent-teal",
    page: "countriesHub",
    count: (counts) => counts.countries,
  },
  {
    id: "familles",
    name: "Familles",
    icon: Network,
    accentClass: "afh-accent-terre",
    page: "familiesHub",
    count: (counts) => counts.families,
  },
];

export interface EntryPointsProps {
  language: Language;
  counts: CorpusCounts;
}

/**
 * Three entry points replacing the module grid (REQ-113): one per access
 * mode, each carrying a name, a live count and a single action verb — no
 * descriptive sentence. Reveal/glyph animation is gated by
 * usePrefersReducedMotion (REQ-112): under reduced motion the animation
 * classes are never applied, so glyphs render at their normal, legible
 * static state rather than mid-keyframe.
 */
// @req REQ-113
export function EntryPoints({ language, counts }: EntryPointsProps) {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <nav
      aria-label="Accès rapide"
      data-testid="entry-points"
      className="flex flex-col gap-3"
    >
      {ENTRY_POINT_DEFS.map((entry, index) => {
        const Icon = entry.icon;
        return (
          <Link
            key={entry.id}
            href={getLocalizedRoute(language, entry.page)}
            data-testid={`entry-point-${entry.id}`}
            className={cn(
              entry.accentClass,
              "flex min-h-[44px] w-full items-center gap-3 rounded-[14px] border p-4 no-underline",
              !reducedMotion && "entry-point-reveal"
            )}
            style={{
              borderColor: "var(--accent)",
              backgroundColor: "var(--accent-tint)",
              ...(reducedMotion ? {} : { animationDelay: `${index * 80}ms` }),
            }}
          >
            <span
              data-testid="entry-point-icon"
              aria-hidden="true"
              className={cn(
                "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
                !reducedMotion && "entry-point-glyph"
              )}
              style={{
                backgroundColor: "var(--afh-surface)",
                color: "var(--accent)",
              }}
            >
              <Icon size={22} />
            </span>
            <span className="flex flex-wrap items-baseline gap-x-2">
              <span
                data-testid={`entry-point-name-${entry.id}`}
                className="text-base font-semibold"
                style={{ color: "var(--afh-text)" }}
              >
                {entry.name}
              </span>
              <span
                data-testid={`entry-point-count-${entry.id}`}
                className="text-sm"
                style={{ color: "var(--afh-text-soft)" }}
              >
                {entry.count(counts)}
              </span>
              <span
                data-testid={`entry-point-verb-${entry.id}`}
                className="text-sm font-medium"
                style={{ color: "var(--accent)" }}
              >
                {VERB}
              </span>
            </span>
          </Link>
        );
      })}
      <style>{`
        @keyframes entry-point-reveal {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes entry-point-glyph {
          from { transform: scale(0.85); opacity: 0.6; }
          to { transform: scale(1); opacity: 1; }
        }
        .entry-point-reveal {
          animation: entry-point-reveal var(--afh-duration-pageload) var(--afh-ease-out) both;
        }
        .entry-point-glyph {
          animation: entry-point-glyph var(--afh-duration-slow) var(--afh-ease-out) both;
        }
      `}</style>
    </nav>
  );
}
