"use client";

import Link from "next/link";

import { FACETS, getFacetRoute, type FacetKey } from "@/lib/hubs/facets";
import { cn } from "@/lib/utils";

export interface FacetSwitcherProps {
  active: FacetKey;
  className?: string;
}

/**
 * The facet switch: three anchors, and nothing else.
 *
 * Not a tab widget and not a `<select>` that navigates on change. The three
 * facets are three addresses, so the control that moves between them is the
 * one the web already has — which is what makes the switch work before
 * hydration, survive a middle-click, and be followed by a crawler that will
 * otherwise index one facet and never learn the other two exist.
 *
 * `aria-current="page"` rather than a disabled anchor: the current facet stays
 * a link, so a reader who lands on it from outside can still copy the address
 * of where they are.
 */
// @req REQ-114
export function FacetSwitcher({ active, className }: FacetSwitcherProps) {
  return (
    <nav aria-label="Facettes de l'atlas" data-testid="facet-switcher">
      <ul className={cn("flex flex-wrap gap-2", className)}>
        {FACETS.map((facet) => {
          const current = facet.key === active;
          return (
            <li key={facet.key}>
              <Link
                href={getFacetRoute("fr", facet.key)}
                aria-current={current ? "page" : undefined}
                data-facet={facet.key}
                data-active={current ? "true" : "false"}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-afh-lg border px-4 py-2 text-afh-body",
                  current
                    ? "border-transparent font-medium"
                    : "border-afh-border text-afh-text-soft"
                )}
                style={
                  current
                    ? {
                        backgroundColor: "var(--accent)",
                        color: "var(--accent-foreground)",
                      }
                    : undefined
                }
              >
                {facet.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default FacetSwitcher;
