"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, X, Loader2 } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageLayout } from "@/components/layout/PageLayout";
import { CHARTER_FOCUS_RING } from "@/components/ui/charter-motion";
import { AutonymExonymHeading } from "@/components/ui/AutonymExonymHeading";
import { SearchResultCard } from "@/components/search/SearchResultCard";
import { SearchPeopleGroupCard } from "@/components/search/SearchPeopleGroupCard";
import { SearchPivotCard } from "@/components/search/SearchPivotCard";
import { DominantAnswerPanel } from "@/components/search/DominantAnswerPanel";
import { SourcedHighlightBlock } from "@/components/search/SourcedHighlightBlock";
import { SearchLensBar } from "@/components/search/SearchLensBar";
import { NoNameFicheNote } from "@/components/search/NoNameFicheNote";
import { NoResultsLeads } from "@/components/search/NoResultsLeads";
import { useLanguage } from "@/hooks/use-language";
import { useAutocomplete } from "@/hooks/use-autocomplete";
import { getLocalizedRoute } from "@/lib/routing";
import { cn } from "@/lib/utils";
import {
  compareByRelevance,
  EMPTY_SEARCH_LENS_COUNTS,
  type SearchLensCounts,
} from "@/lib/search/searchEnvelope";
import { search as searchCorpus, searchWithLeads } from "@/lib/afrikLoader";
import {
  readRelation,
  relationSearchParams,
  type SearchRelation,
} from "@/lib/search/relationSearch";
import { selectPivot } from "@/lib/search/pivot";
import {
  SEARCH_LABEL,
  SEARCH_PLACEHOLDER,
} from "@/lib/search/searchVocabulary";
import { groupPeopleResults } from "@/lib/search/groupPeopleResults";
import { getFrenchCountryCommonName } from "@/lib/countryNames";
import type {
  SearchEntityType,
  SearchLead,
  SearchResult,
} from "@/types/afrik-frontend";

// ── constants ─────────────────────────────────────────────────────────────────

/** Per-kind ceilings the route applies to each ranked query. */
const RESULTS_PER_SEARCH = 20;
const SUGGESTIONS_PER_KEYSTROKE = 6;

// ── types ─────────────────────────────────────────────────────────────────────

// The page renders exactly what the shared envelope adapter emits; it used to
// declare a parallel hit shape, which is how its reader drifted off-contract.
type SearchHit = SearchResult;

/**
 * Hoisted out of the component so its identity is stable: the hook re-arms
 * its debounce whenever the fetcher changes.
 */
const fetchSuggestionsFromCorpus = (query: string): Promise<SearchHit[]> =>
  searchCorpus(query, { limit: SUGGESTIONS_PER_KEYSTROKE });

/**
 * `idle` — nothing committed yet, the page shows its default head.
 * `loading` — a fetch for the committed query is in flight or has not run.
 * `loaded` — the fetch resolved (success or failure); results reflect it.
 *
 * A `?q=` on arrival used to initialise a `hasSearched` flag straight to
 * `true` before any fetch had run, so the empty-state block could paint on
 * the very first client render — the one SSR HTML is reconciled against —
 * ahead of the results it was supposed to describe (ETNI-1793). Starting in
 * `loading` whenever the URL already commits a query closes that gap: the
 * empty state is gated on `loaded`, which nothing reaches before the fetch
 * itself does.
 */
type SearchStatus = "idle" | "loading" | "loaded";

// ── component ─────────────────────────────────────────────────────────────────

// @req REQ-002
export function RecherchePageContent() {
  const { language, setLanguage } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  const initialQuery = searchParams.get("q") ?? "";
  const initialRelation = readRelation(searchParams);

  const [committedQuery, setCommittedQuery] = useState(initialQuery);
  const [relation, setRelation] = useState<SearchRelation | null>(
    initialRelation
  );

  const [results, setResults] = useState<SearchHit[]>([]);
  const [leads, setLeads] = useState<SearchLead[]>([]);
  const [counts, setCounts] = useState<SearchLensCounts>(
    EMPTY_SEARCH_LENS_COUNTS
  );
  const [activeLens, setActiveLens] = useState<SearchEntityType | "all">("all");
  const [status, setStatus] = useState<SearchStatus>(
    initialQuery || initialRelation ? "loading" : "idle"
  );

  // ── URL sync ────────────────────────────────────────────────────────────────

  const syncURL = useCallback(
    (q: string, rel: SearchRelation | null) => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (rel) params.set(rel.kind, rel.id);
      const route = getLocalizedRoute(language, "search");
      const url = params.toString() ? `${route}?${params}` : route;
      router.replace(url, { scroll: false });
    },
    [language, router]
  );

  // ── main search ─────────────────────────────────────────────────────────────

  const performSearch = useCallback(
    async (q: string, rel: SearchRelation | null) => {
      setActiveLens("all");
      // A relation on its own is a complete search: "the peoples of the Krou
      // family" asks something whole without any free text.
      if (!q.trim() && !rel) {
        setResults([]);
        setLeads([]);
        setCounts(EMPTY_SEARCH_LENS_COUNTS);
        setStatus("idle");
        return;
      }
      setStatus("loading");
      try {
        const {
          results: hits,
          leads: nearMisses,
          counts: lensCounts,
        } = await searchWithLeads(q, {
          limit: RESULTS_PER_SEARCH,
          ...relationSearchParams(rel),
        });
        setResults(hits);
        setLeads(nearMisses);
        setCounts(lensCounts);
      } catch {
        setResults([]);
        setLeads([]);
        setCounts(EMPTY_SEARCH_LENS_COUNTS);
      } finally {
        setStatus("loaded");
      }
    },
    []
  );

  // On mount: if the URL carries a query or a relation, search immediately.
  // Later relation changes (e.g. dismissing the chip) re-run the same search
  // and sync the URL — a single effect keyed on `relation` covers both, which
  // is what keeps a `?q=` arrival to exactly one fetch.
  const isFirstRelationRun = useRef(true);
  useEffect(() => {
    if (!committedQuery && !relation) {
      isFirstRelationRun.current = false;
      return;
    }
    performSearch(committedQuery, relation);
    if (!isFirstRelationRun.current) {
      syncURL(committedQuery, relation);
    }
    isFirstRelationRun.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relation]);

  // ── auto-suggest ────────────────────────────────────────────────────────────

  /**
   * The SERP's own field used to declare `role="searchbox"` over a
   * `role="listbox"` it did not own — a searchbox cannot own suggestions, so
   * under a screen reader the suggestions of the canonical search surface
   * simply did not exist. The shared hook carries the combobox contract the
   * accueil and the compare picker already honoured.
   */
  const suggest = useAutocomplete<SearchHit>({
    fetchSuggestions: fetchSuggestionsFromCorpus,
    onSelect: (hit) => handleSuggestionClick(hit),
    initialQuery,
    limit: SUGGESTIONS_PER_KEYSTROKE,
  });
  const inputValue = suggest.query;

  // ── keyboard shortcut: "/" → focus input (progressive enhancement) ──────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // ── event handlers ──────────────────────────────────────────────────────────

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = inputValue.trim();
    setCommittedQuery(q);
    suggest.dismiss();
    syncURL(q, relation);
    performSearch(q, relation);
  };

  function handleSuggestionClick(hit: SearchHit) {
    // `commit`, not `setQuery`: the name goes into the field as a resolved
    // query, so the panel does not reopen over the results it just asked for.
    suggest.commit(hit.name);
    setCommittedQuery(hit.name);
    syncURL(hit.name, relation);
    performSearch(hit.name, relation);
  }

  // ── derived state ───────────────────────────────────────────────────────────

  const hasActiveFilters = Boolean(relation);

  const lensFilteredResults =
    activeLens === "all"
      ? results
      : results.filter((r) => r.type === activeLens);

  // The envelope groups peoples, then countries, then families; relevance
  // alone is not comparable across kinds, so cross-kind ordering always goes
  // through `compareByRelevance`, which decides on `exactMatch` first.
  const sortedResults = [...lensFilteredResults].sort(compareByRelevance);

  // A relation-scoped list ("the peoples of the Krou family") has no single
  // answer, so it never gets a pivot.
  const pivot = relation ? null : selectPivot(sortedResults, committedQuery);
  const listResults = pivot
    ? sortedResults.filter((r) => r !== pivot)
    : sortedResults;

  // A name imposed from outside never stands alone where the self-appellation
  // exists — the same rule `SearchPivotCard` applies to its own heading.
  const pivotHasAutonym = Boolean(
    pivot?.autonym && pivot.autonym !== pivot.name
  );

  // A relation-scoped list ("the peoples of the Krou family") has no single
  // answer, so it never gets a pivot.
  const relationLabel = !relation
    ? ""
    : relation.kind === "country"
      ? `Peuples du pays ${getFrenchCountryCommonName(relation.id, relation.id)}`
      : `Peuples de la famille ${
          results.find((r) => r.languageFamilyId === relation.id)
            ?.languageFamilyName ?? relation.id
        }`;

  const resultCountLabel = `${sortedResults.length} résultat${
    sortedResults.length > 1 ? "s" : ""
  }${committedQuery ? ` pour « ${committedQuery} »` : ""}`;

  // Only once the fetch has resolved does the page know whether it is
  // answering with a pivot or a count — showing either ahead of that would
  // paint a wrong or stale head for one frame.
  const showQueryHead = status === "loaded";

  const heroHead = !showQueryHead ? undefined : pivot ? (
    <AutonymExonymHeading
      variant="hero"
      autonym={pivotHasAutonym ? pivot.autonym : pivot.name}
      exonym={pivotHasAutonym ? pivot.name : undefined}
    />
  ) : (
    // The brand gradient is scoped to the literal word "Recherche"
    // (brand charter §5.3); a pivot's name or a result count is corpus
    // content, not the brand lockup, so it never gets the gradient.
    <h1 className="afh-hero-title" style={{ fontWeight: 900 }}>
      {resultCountLabel}
    </h1>
  );

  // Named lenses (REQ-124) only mean something once counts have resolved,
  // and a corpus-wide zero would offer nothing but "Tout (0)".
  const showLensBar = status === "loaded" && counts.all > 0;
  const showNoNameFicheNote =
    status === "loaded" && counts.person > 0 && counts.patronyme === 0;

  const resultsList = status === "loaded" && listResults.length > 0 && (
    <ul
      data-testid="search-results-list"
      className="grid grid-cols-1 gap-afh-lg min-[760px]:grid-cols-2"
      aria-label="Résultats de recherche"
    >
      {groupPeopleResults(listResults).map((entry, i) =>
        entry.type === "peopleGroup" ? (
          <li key={`peopleGroup-${entry.peopleGroupId}-${i}`}>
            <SearchPeopleGroupCard group={entry} language={language} />
          </li>
        ) : (
          <li key={`${entry.type}-${entry.id}-${i}`}>
            <SearchResultCard result={entry} language={language} />
          </li>
        )
      )}
    </ul>
  );

  const refinements = (
    <>
      {showLensBar && (
        <SearchLensBar
          active={activeLens}
          counts={counts}
          showCounts
          onChange={setActiveLens}
        />
      )}
      {showNoNameFicheNote && <NoNameFicheNote />}
    </>
  );

  // ── render ──────────────────────────────────────────────────────────────────

  return (
    <PageLayout
      language={language}
      onLanguageChange={setLanguage}
      title={showQueryHead ? undefined : "Recherche"}
      subtitle={showQueryHead ? undefined : SEARCH_LABEL}
      heroHead={heroHead}
    >
      {/* The SERP's one page-level accent (brand charter §2): everything on
          this route that reads var(--accent) — the lens bar's active pill,
          in particular — resolves it from here rather than each needing its
          own scope. A result card can still narrow to its own entity-type
          accent (SEARCH_ENTITY_ACCENT), which wins locally by nesting. */}
      <div className="afh-shell afh-accent-ocre space-y-afh-5xl">
        {/* ── search form ── */}
        <form
          onSubmit={handleSubmit}
          role="search"
          aria-label="Formulaire de recherche"
          className="flex flex-col md:flex-row gap-afh-md"
        >
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-afh-text-muted pointer-events-none"
              aria-hidden="true"
            />
            <Input
              ref={inputRef}
              type="search"
              {...suggest.comboboxProps}
              aria-label={SEARCH_LABEL}
              placeholder={SEARCH_PLACEHOLDER}
              value={inputValue}
              onChange={(e) => suggest.setQuery(e.target.value)}
              onKeyDown={suggest.handleKeyDown}
              // The blur is delayed past the option's mousedown on purpose:
              // closing on focus loss alone retracts the panel out from under
              // the click that was landing on it.
              onBlur={() => setTimeout(() => suggest.dismiss(), 150)}
              className="pl-10 h-12 text-afh-small"
              autoComplete="off"
            />
            {/* auto-suggest dropdown */}
            {suggest.isOpen && (
              <ul
                id={suggest.listboxId}
                role="listbox"
                aria-label="Suggestions de recherche"
                className="absolute z-50 w-full bg-afh-surface border border-afh-border rounded-afh-lg shadow-afh-2 mt-afh-xs overflow-hidden"
              >
                {suggest.options.map((hit, index) => (
                  <li
                    key={hit.id}
                    {...suggest.getOptionProps(index)}
                    className={cn(
                      "px-afh-2xl py-afh-md hover:bg-afh-bg-warm cursor-pointer text-afh-small",
                      index === suggest.activeIndex && "bg-afh-bg-warm"
                    )}
                    onMouseDown={() => handleSuggestionClick(hit)}
                  >
                    {hit.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Button type="submit" className="h-12 px-6 shrink-0">
            Rechercher
          </Button>
        </form>

        {/* ── filter chip row (always visible) ── */}
        <div
          data-testid="filter-chip-row"
          role="group"
          className="flex flex-wrap items-center gap-afh-md min-h-[2rem]"
          aria-label="Filtres actifs"
        >
          {relation && (
            <Badge
              variant="secondary"
              className="flex items-center gap-afh-xs px-afh-lg py-afh-xs text-afh-small"
            >
              {relationLabel}
              <button
                type="button"
                aria-label={`Supprimer le filtre ${relationLabel}`}
                onClick={() => setRelation(null)}
                className={cn("ml-afh-xs rounded-full", CHARTER_FOCUS_RING)}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </Badge>
          )}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => setRelation(null)}
              className="text-afh-small text-afh-fg-muted hover:text-afh-text underline underline-offset-2 ml-auto"
            >
              Tout effacer
            </button>
          )}
        </div>

        {/* ── loading indicator ── */}
        {status === "loading" && (
          <div
            className="flex items-center justify-center h-32"
            aria-live="polite"
            aria-busy="true"
          >
            <Loader2
              className="h-6 w-6 animate-spin text-afh-text-muted"
              aria-label="Chargement en cours"
            />
          </div>
        )}

        {/* Split fiches of the same people (ETNI-1391) are grouped into one
            card here, at display time only — the underlying result order and
            count are unaffected. */}
        {status !== "loading" &&
          (pivot ? (
            <div
              data-testid="search-results-layout"
              className="grid grid-cols-1 gap-afh-5xl min-[760px]:grid-cols-[minmax(0,1fr)_minmax(18rem,20rem)] min-[760px]:items-start"
            >
              <div
                data-testid="search-results-main"
                className="min-w-0 space-y-afh-5xl"
              >
                <SearchPivotCard result={pivot} language={language} />
                <SourcedHighlightBlock result={pivot} />
                {refinements}
                {resultsList}
              </div>
              {/* Atlas charter §5: one component, two anchorings. Above
                  760px it sits beside the results as a side panel; below,
                  it stays in flow as a bottom sheet — a rule (border-t),
                  never a hidden block, so the facts survive at 430px. */}
              <div
                data-testid="dominant-answer-panel-wrapper"
                className="border-t border-afh-border pt-afh-lg min-[760px]:border-t-0 min-[760px]:pt-0 min-[760px]:self-start"
              >
                <DominantAnswerPanel result={pivot} language={language} />
              </div>
            </div>
          ) : (
            <div className="space-y-afh-5xl">
              {refinements}
              {resultsList}
            </div>
          ))}

        {/* ── empty state (post-search, no results) ── */}
        {status === "loaded" && results.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[16rem] gap-afh-2xl px-afh-5xl py-afh-7xl bg-afh-bg-warm rounded-afh-lg text-center">
            <p className="text-afh-small text-afh-text-soft max-w-sm">
              Aucun résultat pour « {committedQuery} ».
            </p>
            <p className="text-afh-small text-afh-text-soft">
              Vérifiez l&apos;orthographe ou essayez un autre terme.
            </p>
            <NoResultsLeads leads={leads} language={language} />
            <div className="flex flex-col gap-afh-md text-afh-small">
              <Link
                href={getLocalizedRoute(language, "families")}
                className="underline underline-offset-2 hover:text-afh-text transition-colors"
              >
                Parcourir par famille
              </Link>
              <Link
                href={`/${language}/contribute?q=${encodeURIComponent(committedQuery)}`}
                className="underline underline-offset-2 hover:text-afh-text transition-colors"
              >
                Signaler donnée manquante
              </Link>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
