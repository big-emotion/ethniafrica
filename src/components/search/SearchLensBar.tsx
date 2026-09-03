"use client";

import { cn } from "@/lib/utils";
import type { SearchLensCounts } from "@/lib/search/searchEnvelope";
import type { SearchEntityType } from "@/types/afrik-frontend";

interface SearchLensDef {
  value: SearchEntityType | "all";
  label: string;
}

// @req REQ-136
// @req REQ-126
// @req REQ-135
// ETNI-1807: fixed fallback order (brand charter §2) — "Tout" first, then the
// six kinds in descending corpus weight. A kind with zero results for the
// current query is filtered out below rather than reordered.
const SEARCH_LENSES: SearchLensDef[] = [
  { value: "all", label: "Tout" },
  { value: "people", label: "Peuples" },
  { value: "language", label: "Langues" },
  { value: "languageFamily", label: "Familles" },
  { value: "country", label: "Pays" },
  { value: "patronyme", label: "Noms" },
  { value: "person", label: "Personnes" },
];

interface SearchLensBarProps {
  active: SearchEntityType | "all";
  counts: SearchLensCounts;
  /** Counts are only meaningful once a search has resolved at least once. */
  showCounts: boolean;
  onChange: (value: SearchEntityType | "all") => void;
}

/**
 * Named lenses (REQ-124) that refine the search results list in place: each
 * chip carries the corpus-wide count for its type, replacing the tabs that
 * used to switch a `role="tab"` panel. Filtering a mixed result list is not
 * actually a tab-panel switch, so plain pressed buttons are the correct
 * semantics, not a borrowed Radix `Tabs` pattern.
 */
// @req REQ-124
export function SearchLensBar({
  active,
  counts,
  showCounts,
  onChange,
}: SearchLensBarProps) {
  return (
    <div
      role="group"
      aria-label="Filtrer les résultats par type"
      className="flex flex-wrap gap-2"
    >
      {SEARCH_LENSES.filter(
        (lens) => lens.value === "all" || (counts[lens.value] ?? 0) > 0
      ).map((lens) => {
        const count = counts[lens.value];
        const isActive = active === lens.value;
        const label = showCounts ? `${lens.label} (${count})` : lens.label;

        return (
          <button
            key={lens.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(lens.value)}
            className={cn(
              "rounded-full border border-afh-border px-4 min-h-11 text-sm font-medium transition-colors",
              isActive
                ? "border-transparent bg-[var(--accent-tint)]"
                : "bg-transparent"
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
