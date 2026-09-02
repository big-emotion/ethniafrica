"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AutonymExonymHeading } from "@/components/ui/AutonymExonymHeading";
import { cn } from "@/lib/utils";
import { search as searchCorpus } from "@/lib/afrikLoader";
import type { SearchEntityType } from "@/types/afrik-frontend";
import { useAutocomplete } from "@/hooks/use-autocomplete";
import {
  useCompareSelection,
  type CompareCandidate,
  type CompareEntityType,
} from "@/hooks/use-compare-selection";
import { CompareStickyBar } from "./CompareStickyBar";

const TYPE_LABELS: Record<CompareEntityType, string> = {
  peoples: "peuples",
  countries: "pays",
  "language-families": "familles linguistiques",
};

const TYPE_ORDER: CompareEntityType[] = [
  "peoples",
  "countries",
  "language-families",
];

const MAX_SUGGESTIONS = 6;
const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;

const SEARCH_KIND_BY_TYPE: Record<CompareEntityType, SearchEntityType> = {
  peoples: "people",
  countries: "country",
  "language-families": "languageFamily",
};

/**
 * Every entity type is fetched from the same ranked search the search page
 * and quick-search modal use (`ftsSearchEntities`, DEC-027) — this used to be
 * the sole divergence: families were loaded once as a static roster and
 * filtered client-side, so the same input could rank differently here than
 * on those two other entry points.
 */
async function defaultFetchSuggestions(
  type: CompareEntityType,
  query: string
): Promise<CompareCandidate[]> {
  const hits = await searchCorpus(query, {
    limit: MAX_SUGGESTIONS,
    type: SEARCH_KIND_BY_TYPE[type],
  });

  return hits.map((hit) => ({ id: hit.id, type, exonym: hit.name }));
}

export interface EntityComparePickerProps {
  className?: string;
  onCompare?: (type: CompareEntityType, ids: string[]) => void;
  fetchSuggestions?: (
    type: CompareEntityType,
    query: string
  ) => Promise<CompareCandidate[]>;
}

// @req REQ-097
/**
 * Mobile-first entity picker for building a 2–3 entity comparison (FR59,
 * UX-DR29, UX-DR32). Stacked cards, never a wide table.
 */
export function EntityComparePicker({
  className,
  onCompare,
  fetchSuggestions = defaultFetchSuggestions,
}: EntityComparePickerProps) {
  const selection = useCompareSelection();
  const [type, setType] = useState<CompareEntityType>("peoples");
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  // Read through a ref so the fetcher's identity stays stable while still
  // seeing the current type and the current selection.
  const context = useRef({ type, selection, fetchSuggestions });
  useEffect(() => {
    context.current = { type, selection, fetchSuggestions };
  });

  /**
   * The already-picked entities are dropped here rather than after the fact:
   * the option a keystroke highlights has to be the option the reader sees,
   * and a list filtered downstream of the hook would number them differently.
   */
  const fetchUnpicked = useCallback(async (query: string) => {
    const {
      type: kind,
      selection: current,
      fetchSuggestions: fetch,
    } = context.current;
    const picked = new Set(current.selected.map((entity) => entity.id));
    const candidates = await fetch(kind, query);
    return candidates.filter((candidate) => !picked.has(candidate.id));
  }, []);

  const handleSelect = (candidate: CompareCandidate) => {
    selection.add(candidate);
    suggest.clear();
    inputRef.current?.focus();
  };

  const suggest = useAutocomplete<CompareCandidate>({
    fetchSuggestions: fetchUnpicked,
    onSelect: handleSelect,
    minLength: MIN_QUERY_LENGTH,
    debounceMs: DEBOUNCE_MS,
    limit: MAX_SUGGESTIONS,
  });

  const query = suggest.query;
  const suggestions = suggest.options;
  const activeIndex = suggest.activeIndex;
  const showListbox = suggest.isOpen && !selection.maxReached;

  const handleTypeChange = (nextType: CompareEntityType) => {
    if (selection.lockedType) return;
    setType(nextType);
    // A query asked of one kind means nothing asked of another.
    suggest.clear();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (selection.maxReached) return;
    suggest.handleKeyDown(event);
  };

  const handleCompare = () => {
    if (!selection.lockedType) return;
    onCompare?.(
      selection.lockedType,
      selection.selected.map((entity) => entity.id)
    );
  };

  return (
    <div className={cn("w-full space-y-4 overflow-x-hidden", className)}>
      <div role="status" aria-live="polite" className="sr-only">
        {selection.announcement}
      </div>

      <fieldset>
        <legend className="mb-2 text-afh-small font-medium text-afh-text">
          Type d&apos;entité à comparer
        </legend>
        <RadioGroup
          value={type}
          onValueChange={(value) =>
            handleTypeChange(value as CompareEntityType)
          }
          aria-label="Type d'entité à comparer"
          className="flex flex-wrap gap-4"
        >
          {TYPE_ORDER.map((candidateType) => (
            <label
              key={candidateType}
              className="flex items-center gap-2 text-afh-small text-afh-text"
            >
              <RadioGroupItem
                value={candidateType}
                disabled={
                  !!selection.lockedType &&
                  selection.lockedType !== candidateType
                }
              />
              {TYPE_LABELS[candidateType]}
            </label>
          ))}
        </RadioGroup>
      </fieldset>

      <div className="relative">
        <label htmlFor={inputId} className="sr-only">
          Rechercher {TYPE_LABELS[type]}
        </label>
        <Input
          id={inputId}
          ref={inputRef}
          {...suggest.comboboxProps}
          aria-expanded={showListbox}
          disabled={selection.maxReached}
          value={query}
          placeholder={`Rechercher ${TYPE_LABELS[type]}...`}
          onChange={(event) => suggest.setQuery(event.target.value)}
          onFocus={suggest.reopen}
          onKeyDown={handleKeyDown}
        />

        {selection.maxReached && (
          <p className="mt-1 text-afh-caption text-afh-text-soft">3 maximum</p>
        )}

        {showListbox && (
          <ul
            id={suggest.listboxId}
            role="listbox"
            aria-label={`Suggestions ${TYPE_LABELS[type]}`}
            className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-afh-lg border border-afh-border bg-afh-surface shadow-afh-1"
          >
            {suggestions.map((candidate, index) => (
              <li
                key={candidate.id}
                {...suggest.getOptionProps(index)}
                className={cn(
                  "cursor-pointer px-3 py-2 text-afh-small text-afh-text",
                  index === activeIndex && "bg-afh-bg-warm"
                )}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => suggest.highlight(index)}
                onClick={() => handleSelect(candidate)}
              >
                {candidate.exonym}
              </li>
            ))}
          </ul>
        )}
      </div>

      {selection.selected.length > 0 && (
        <ul className="space-y-2" aria-label="Entités sélectionnées">
          {selection.selected.map((candidate) => {
            const displayName = candidate.autonym ?? candidate.exonym;
            return (
              <li key={candidate.id}>
                <Card className="flex items-center justify-between gap-3 p-3">
                  <AutonymExonymHeading
                    variant="compact"
                    autonym={candidate.autonym}
                    exonym={candidate.exonym}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => selection.remove(candidate.id)}
                    aria-label={`retirer ${displayName}`}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <CompareStickyBar count={selection.count} onCompare={handleCompare} />
    </div>
  );
}

export default EntityComparePicker;
