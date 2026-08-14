"use client";

import * as React from "react";
import { useCallback, useMemo, useState } from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { AutonymExonymHeading } from "@/components/ui/AutonymExonymHeading";
import { ConfidenceChip } from "@/components/source-transparency/ConfidenceChip";
import {
  RelationTypeBadge,
  RELATION_TYPE_LABELS,
} from "@/components/relations/RelationTypeBadge";
import type {
  RelationBadgeType,
  RelationListItem,
} from "@/lib/relationsDataTransformer";

const FILTERABLE_TYPES: RelationBadgeType[] = [
  "linguistic",
  "migratory",
  "commercial",
  "religious",
];

const URL_PARAM = "types";

export interface RelationsListProps {
  items: RelationListItem[];
  /** Opens `SourceChainSheet` for the given relation id (owned by the caller — UX-DR48). */
  onOpenRelation: (relationId: string) => void;
  /** Initial filter state, e.g. parsed by the page (RSC) from its `searchParams`. */
  initialActiveTypes?: RelationBadgeType[];
  className?: string;
}

/**
 * Mirrors the active filter types into the URL via `history.replaceState`
 * — deliberately not `next/navigation`'s `useRouter`/`useSearchParams`,
 * which require an App Router context that Storybook's
 * `@storybook/react-vite` framework does not provide (project-context.md's
 * Storybook constraint; see NamesAtlasView for the precedent).
 */
function syncUrl(activeTypes: RelationBadgeType[]) {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  if (activeTypes.length > 0) {
    params.set(URL_PARAM, activeTypes.join(","));
  } else {
    params.delete(URL_PARAM);
  }
  const query = params.toString();
  const url = query
    ? `${window.location.pathname}?${query}`
    : window.location.pathname;
  window.history.replaceState(window.history.state, "", url);
}

function rowAriaLabel(item: RelationListItem): string {
  const parts = [RELATION_TYPE_LABELS[item.type], item.neighbor.nameMain];
  if (item.period?.label) parts.push(item.period.label);
  if (item.derived) {
    parts.push(
      "lien dérivé de la hiérarchie AFRIK, non sourcé individuellement"
    );
  } else if (item.confidence?.sourceCount != null) {
    parts.push(`${item.confidence.sourceCount} sources`);
  }
  return parts.join(", ");
}

/**
 * Text-first equivalent of the relations ego-network graph (Epic 11, FR72,
 * FR75, UX-DR32, UX-DR48). SSR-first: renders complete markup on the server,
 * hydrates for filter interactivity. Carries the same data the graph shows,
 * including derived links — the graph never shows anything this list lacks.
 */
// @req REQ-097
export function RelationsList({
  items,
  onOpenRelation,
  initialActiveTypes = [],
  className,
}: RelationsListProps) {
  const [activeTypes, setActiveTypes] =
    useState<RelationBadgeType[]>(initialActiveTypes);

  const toggleType = useCallback((type: RelationBadgeType) => {
    setActiveTypes((current) => {
      const next = current.includes(type)
        ? current.filter((t) => t !== type)
        : [...current, type];
      syncUrl(next);
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setActiveTypes([]);
    syncUrl([]);
  }, []);

  const filteredItems = useMemo(
    () =>
      activeTypes.length === 0
        ? items
        : items.filter((item) => activeTypes.includes(item.type)),
    [items, activeTypes]
  );

  const hasDerivedOnly =
    filteredItems.length > 0 && filteredItems.every((item) => item.derived);

  return (
    <div className={cn("flex flex-col gap-afh-md", className)}>
      <div
        role="group"
        aria-label="filtrer par type de lien"
        className="flex flex-wrap items-center gap-2"
      >
        {FILTERABLE_TYPES.map((type) => {
          const isActive = activeTypes.includes(type);
          return (
            <button
              key={type}
              type="button"
              aria-pressed={isActive}
              onClick={() => toggleType(type)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium motion-safe:transition-colors",
                isActive
                  ? "border-afh-gold bg-afh-gold-bg text-afh-text"
                  : "border-afh-border bg-afh-surface text-afh-text-soft"
              )}
            >
              {RELATION_TYPE_LABELS[type]}
            </button>
          );
        })}
      </div>

      {activeTypes.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {activeTypes.map((type) => (
            <span
              key={type}
              className="inline-flex items-center gap-1 rounded-full bg-afh-bg-warm px-2 py-0.5 text-afh-text-soft"
            >
              {RELATION_TYPE_LABELS[type]}
              <button
                type="button"
                aria-label={`retirer le filtre ${RELATION_TYPE_LABELS[type]}`}
                onClick={() => toggleType(type)}
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={clearFilters}
            className="text-afh-text-soft underline underline-offset-2 hover:text-afh-text"
          >
            tout effacer
          </button>
        </div>
      )}

      {filteredItems.length === 0 ? (
        <EmptyState message="Aucune relation documentée pour le moment." />
      ) : (
        <>
          {hasDerivedOnly && (
            <p className="text-sm text-afh-text-soft">
              Seuls des liens de proximité linguistique, dérivés de la
              hiérarchie AFRIK, sont disponibles pour l&apos;instant.
            </p>
          )}
          <ul className="flex flex-col gap-afh-sm">
            {filteredItems.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-2 rounded-afh-lg border border-afh-border bg-afh-surface p-afh-sm"
                aria-label={rowAriaLabel(item)}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <RelationTypeBadge type={item.type} derived={item.derived} />
                  <AutonymExonymHeading
                    autonym={item.neighbor.nameMain}
                    variant="inline"
                  />
                </div>
                {item.period?.label && (
                  <p className="text-xs text-afh-text-soft">
                    {item.period.label}
                  </p>
                )}
                {item.description && (
                  <p className="text-sm text-afh-text">{item.description}</p>
                )}
                {item.derived ? (
                  <p className="text-xs italic text-afh-text-soft">
                    dérivé de la hiérarchie AFRIK
                  </p>
                ) : (
                  <ConfidenceChip
                    confidenceScore={item.confidence?.score ?? null}
                    sourceCount={item.confidence?.sourceCount ?? null}
                    lastHumanAuditAt={null}
                    onOpen={() => onOpenRelation(item.id)}
                  />
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default RelationsList;
