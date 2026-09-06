"use client";

import * as React from "react";
import { useCallback, useMemo, useState } from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { AutonymExonymHeading } from "@/components/ui/AutonymExonymHeading";
import { ConfidenceChip } from "@/components/source-transparency/ConfidenceChip";
import { RelationTypeBadge } from "@/components/relations/RelationTypeBadge";
import { RELATION_TYPE_LABELS } from "@/lib/glossaire/vocabularies";
import type {
  RelationBadgeType,
  RelationListItem,
} from "@/lib/relationsDataTransformer";
import { relationsCopy } from "@/lib/i18n/copy/relations";
import type { Language } from "@/types/shared";

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
  language?: Language;
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

function rowAriaLabel(item: RelationListItem, language: Language): string {
  const copy = relationsCopy[language];
  const parts = [
    RELATION_TYPE_LABELS[language][item.type],
    item.neighbor.nameMain,
  ];
  if (item.period?.label) parts.push(item.period.label);
  if (item.derived) {
    parts.push(copy.graph.derived);
  } else if (item.confidence?.sourceCount != null) {
    parts.push(copy.graph.sources(item.confidence.sourceCount));
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
  language = "fr",
}: RelationsListProps) {
  const copy = relationsCopy[language];
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
        aria-label={copy.list.filterGroup}
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
                "rounded-full border px-3 py-1 text-afh-caption font-medium motion-safe:transition-colors",
                isActive
                  ? "border-afh-gold bg-afh-gold-bg text-afh-text"
                  : "border-afh-border bg-afh-surface text-afh-text-soft"
              )}
            >
              {RELATION_TYPE_LABELS[language][type]}
            </button>
          );
        })}
      </div>

      {activeTypes.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-afh-caption">
          {activeTypes.map((type) => (
            <span
              key={type}
              className="inline-flex items-center gap-1 rounded-full bg-afh-bg-warm px-2 py-0.5 text-afh-text-soft"
            >
              {RELATION_TYPE_LABELS[language][type]}
              <button
                type="button"
                aria-label={copy.list.removeFilter(
                  RELATION_TYPE_LABELS[language][type]
                )}
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
            {copy.list.clearFilters}
          </button>
        </div>
      )}

      {filteredItems.length === 0 ? (
        <EmptyState message={copy.list.empty} lang={language} />
      ) : (
        <>
          {copy.list.proseFallback ? (
            <p role="status" aria-label={copy.list.proseFallback}>
              {copy.list.proseFallback}
            </p>
          ) : null}
          {hasDerivedOnly && (
            <p className="text-afh-small text-afh-text-soft">
              {copy.list.derivedOnly}
            </p>
          )}
          <ul className="flex flex-col gap-afh-sm">
            {filteredItems.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-2 rounded-afh-lg border border-afh-border bg-afh-surface p-afh-sm"
                aria-label={rowAriaLabel(item, language)}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <RelationTypeBadge
                    type={item.type}
                    derived={item.derived}
                    language={language}
                  />
                  <AutonymExonymHeading
                    autonym={item.neighbor.nameMain}
                    variant="inline"
                  />
                </div>
                {item.period?.label && (
                  <p
                    className="text-afh-caption text-afh-text-soft"
                    data-relation-prose
                    lang={language === "en" ? "fr" : undefined}
                  >
                    {item.period.label}
                  </p>
                )}
                {item.description && (
                  <p
                    className="text-afh-small text-afh-text"
                    data-relation-prose
                    lang={language === "en" ? "fr" : undefined}
                  >
                    {item.description}
                  </p>
                )}
                {item.derived ? (
                  <p className="text-afh-caption italic text-afh-text-soft">
                    {copy.list.derived}
                  </p>
                ) : (
                  <ConfidenceChip
                    confidenceScore={item.confidence?.score ?? null}
                    sourceCount={item.confidence?.sourceCount ?? null}
                    lastHumanAuditAt={null}
                    onOpen={() => onOpenRelation(item.id)}
                    language={language}
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
