"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, X, Loader2 } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageLayout } from "@/components/layout/PageLayout";
import { CHARTER_FOCUS_RING } from "@/components/ui/charter-motion";
import {
  getSearchEntityLabel,
  SearchEntityMark,
} from "@/components/search/searchEntityAccent";
import { useLanguage } from "@/hooks/use-language";
import { getLocalizedRoute } from "@/lib/routing";
import { cn } from "@/lib/utils";
import { classificationLabels } from "@/lib/translations";
import {
  buildSearchParams,
  mapSearchEnvelope,
} from "@/lib/search/searchEnvelope";
import type { ClassificationStatus } from "@/types/afrik";
import type { SearchEntityType, SearchResult } from "@/types/afrik-frontend";

// ── constants ─────────────────────────────────────────────────────────────────

const REGIONS: Record<string, { label: string; countries: string[] }> = {
  west: {
    label: "Afrique de l'Ouest",
    countries: [
      "NGA",
      "GHA",
      "SEN",
      "MLI",
      "CIV",
      "GIN",
      "BFA",
      "BEN",
      "NER",
      "TGO",
      "SLE",
      "LBR",
      "GMB",
      "CPV",
      "GNB",
      "MRT",
    ],
  },
  east: {
    label: "Afrique de l'Est",
    countries: [
      "KEN",
      "TZA",
      "ETH",
      "UGA",
      "RWA",
      "BDI",
      "SOM",
      "DJI",
      "ERI",
      "COM",
      "SYC",
      "MDG",
      "MUS",
    ],
  },
  central: {
    label: "Afrique Centrale",
    countries: ["COD", "COG", "CMR", "CAF", "GAB", "GNQ", "TCD", "AGO"],
  },
  southern: {
    label: "Afrique Australe",
    countries: ["ZAF", "ZWE", "ZMB", "MWI", "MOZ", "BWA", "NAM", "LSO", "SWZ"],
  },
  north: {
    label: "Afrique du Nord",
    countries: ["MAR", "DZA", "TUN", "LBY", "EGY", "SDN", "SSD"],
  },
};

const CONFIDENCE_OPTIONS = [
  { value: "0.5", label: "Confiance > 50 %" },
  { value: "0.7", label: "Confiance > 70 %" },
  { value: "0.9", label: "Confiance > 90 %" },
];

const ALL_FILTER_VALUES = "__all__";

type SortKey = "relevance" | "az" | "za" | "pop-desc" | "pop-asc";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "relevance", label: "Pertinence" },
  { value: "az", label: "A → Z" },
  { value: "za", label: "Z → A" },
  { value: "pop-desc", label: "Population ↓" },
  { value: "pop-asc", label: "Population ↑" },
];

// ── types ─────────────────────────────────────────────────────────────────────

// The page renders exactly what the shared envelope adapter emits; it used to
// declare a parallel hit shape, which is how its reader drifted off-contract.
type SearchHit = SearchResult;

// ── helpers ───────────────────────────────────────────────────────────────────

function getFilterParam(
  searchParams: { get(name: string): string | null },
  name: string
): string {
  const value = searchParams.get(name) ?? "";
  return value === ALL_FILTER_VALUES ? "" : value;
}

// ── component ─────────────────────────────────────────────────────────────────

// @req REQ-002
export function RecherchePageContent() {
  const { language, setLanguage } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  const [inputValue, setInputValue] = useState(searchParams.get("q") ?? "");
  const [committedQuery, setCommittedQuery] = useState(
    searchParams.get("q") ?? ""
  );
  const [classificationStatus, setClassificationStatus] = useState(
    getFilterParam(searchParams, "classificationStatus")
  );
  const [minConfidence, setMinConfidence] = useState(
    getFilterParam(searchParams, "minConfidence")
  );
  const [region, setRegion] = useState(getFilterParam(searchParams, "region"));
  const [sort, setSort] = useState<SortKey>(
    (searchParams.get("sort") as SortKey) ?? "relevance"
  );

  const [results, setResults] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(!!searchParams.get("q"));
  const [suggestions, setSuggestions] = useState<SearchHit[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // ── URL sync ────────────────────────────────────────────────────────────────

  const syncURL = useCallback(
    (q: string, cs: string, mc: string, r: string, s: SortKey) => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (cs) params.set("classificationStatus", cs);
      if (mc) params.set("minConfidence", mc);
      if (r) params.set("region", r);
      if (s !== "relevance") params.set("sort", s);
      const route = getLocalizedRoute(language, "search");
      const url = params.toString() ? `${route}?${params}` : route;
      router.replace(url, { scroll: false });
    },
    [language, router]
  );

  // ── main search ─────────────────────────────────────────────────────────────

  const performSearch = useCallback(
    async (q: string, cs: string, mc: string) => {
      if (!q.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);
      setHasSearched(true);
      try {
        const params = buildSearchParams(q, {
          limit: 20,
          classificationStatus: cs,
          minConfidence: mc,
        });
        const res = await fetch(`/api/v2/search?${params}`);
        if (!res.ok) {
          setResults([]);
          return;
        }
        setResults(mapSearchEnvelope(await res.json()));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // On mount: if URL has a query, search immediately.
  useEffect(() => {
    if (committedQuery) {
      performSearch(committedQuery, classificationStatus, minConfidence);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-search when filters change (only if a query has already been committed).
  useEffect(() => {
    if (!committedQuery) return;
    performSearch(committedQuery, classificationStatus, minConfidence);
    syncURL(committedQuery, classificationStatus, minConfidence, region, sort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classificationStatus, minConfidence, region, sort]);

  // ── auto-suggest (debounced, fires on input change) ─────────────────────────

  useEffect(() => {
    if (inputValue.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/v2/search?${buildSearchParams(inputValue, { limit: 6 })}`
        );
        if (!res.ok) return;
        const hits = mapSearchEnvelope(await res.json());
        setSuggestions(hits);
        setShowSuggestions(hits.length > 0);
      } catch {
        // ignore suggest errors silently
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [inputValue]);

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
    setShowSuggestions(false);
    syncURL(q, classificationStatus, minConfidence, region, sort);
    performSearch(q, classificationStatus, minConfidence);
  };

  const handleSuggestionClick = (s: SearchHit) => {
    setInputValue(s.name);
    setCommittedQuery(s.name);
    setShowSuggestions(false);
    syncURL(s.name, classificationStatus, minConfidence, region, sort);
    performSearch(s.name, classificationStatus, minConfidence);
  };

  const clearAllFilters = () => {
    setClassificationStatus("");
    setMinConfidence("");
    setRegion("");
    setSort("relevance");
    syncURL(committedQuery, "", "", "", "relevance");
  };

  // ── derived state ───────────────────────────────────────────────────────────

  const hasActiveFilters = !!(classificationStatus || minConfidence || region);

  const filteredResults = region
    ? results.filter((r) =>
        r.countryIds?.some((id) => REGIONS[region]?.countries.includes(id))
      )
    : results;

  const sortedResults = [...filteredResults].sort((a, b) => {
    switch (sort) {
      case "az":
        return a.name.localeCompare(b.name, "fr");
      case "za":
        return b.name.localeCompare(a.name, "fr");
      case "pop-desc":
        return (b.population ?? 0) - (a.population ?? 0);
      case "pop-asc":
        return (a.population ?? 0) - (b.population ?? 0);
      default:
        return 0;
    }
  });

  const classStatusLabel = classificationStatus
    ? classificationLabels[classificationStatus as ClassificationStatus]?.label
    : "";
  const confidenceLabel = minConfidence
    ? (CONFIDENCE_OPTIONS.find((o) => o.value === minConfidence)?.label ?? "")
    : "";
  const regionLabel = region ? (REGIONS[region]?.label ?? "") : "";

  const formatNumber = (n: number) =>
    new Intl.NumberFormat("fr-FR").format(Math.round(n));

  // ── render ──────────────────────────────────────────────────────────────────

  return (
    <PageLayout
      language={language}
      onLanguageChange={setLanguage}
      title="Recherche"
      subtitle="Rechercher des peuples, familles linguistiques et pays"
    >
      <div className="space-y-6 max-w-4xl mx-auto px-4">
        {/* ── search form ── */}
        <form
          onSubmit={handleSubmit}
          role="search"
          aria-label="Formulaire de recherche"
          className="flex flex-col sm:flex-row gap-2"
        >
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-afh-text-muted pointer-events-none"
              aria-hidden="true"
            />
            <Input
              ref={inputRef}
              type="search"
              role="searchbox"
              aria-label="Rechercher un peuple, une famille linguistique ou un pays"
              placeholder="Rechercher un peuple, une famille ou un pays..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              className="pl-10 h-12 text-base"
              autoComplete="off"
            />
            {/* auto-suggest dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <ul
                role="listbox"
                aria-label="Suggestions de recherche"
                className="absolute z-50 w-full bg-afh-surface border border-afh-border rounded-afh-lg shadow-afh-2 mt-1 overflow-hidden"
              >
                {suggestions.map((s) => (
                  <li
                    key={s.id}
                    role="option"
                    aria-selected={false}
                    className="px-4 py-2 hover:bg-afh-bg-warm cursor-pointer text-sm"
                    onMouseDown={() => handleSuggestionClick(s)}
                  >
                    {s.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Button type="submit" className="h-12 px-6 shrink-0">
            Rechercher
          </Button>
        </form>

        {/* ── filter selects ── */}
        <div className="flex flex-wrap gap-3">
          <Select
            value={classificationStatus || ALL_FILTER_VALUES}
            onValueChange={(value) =>
              setClassificationStatus(value === ALL_FILTER_VALUES ? "" : value)
            }
          >
            <SelectTrigger
              className="w-[210px]"
              aria-label="Filtrer par classification"
            >
              <SelectValue placeholder="Classification" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FILTER_VALUES}>
                Toutes les classifications
              </SelectItem>
              <SelectItem value="consensual">Consensuel</SelectItem>
              <SelectItem value="contested">Contesté</SelectItem>
              <SelectItem value="colonial-legacy">Héritage colonial</SelectItem>
              <SelectItem value="reconstructive">Reconstructif</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={minConfidence || ALL_FILTER_VALUES}
            onValueChange={(value) =>
              setMinConfidence(value === ALL_FILTER_VALUES ? "" : value)
            }
          >
            <SelectTrigger
              className="w-[190px]"
              aria-label="Filtrer par confiance minimale"
            >
              <SelectValue placeholder="Confiance min." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FILTER_VALUES}>Toute confiance</SelectItem>
              {CONFIDENCE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={region || ALL_FILTER_VALUES}
            onValueChange={(value) =>
              setRegion(value === ALL_FILTER_VALUES ? "" : value)
            }
          >
            <SelectTrigger
              className="w-[210px]"
              aria-label="Filtrer par région"
            >
              <SelectValue placeholder="Région" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FILTER_VALUES}>
                Toutes les régions
              </SelectItem>
              {Object.entries(REGIONS).map(([key, r]) => (
                <SelectItem key={key} value={key}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* ── filter chip row (always visible) ── */}
        <div
          data-testid="filter-chip-row"
          role="group"
          className="flex flex-wrap items-center gap-2 min-h-[2rem]"
          aria-label="Filtres actifs"
        >
          {classificationStatus && classStatusLabel && (
            <Badge
              variant="secondary"
              className="flex items-center gap-1 px-3 py-1 text-sm"
            >
              {classStatusLabel}
              <button
                type="button"
                aria-label={`Supprimer le filtre ${classStatusLabel}`}
                onClick={() => setClassificationStatus("")}
                className={cn("ml-1 rounded-full", CHARTER_FOCUS_RING)}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </Badge>
          )}
          {minConfidence && confidenceLabel && (
            <Badge
              variant="secondary"
              className="flex items-center gap-1 px-3 py-1 text-sm"
            >
              {confidenceLabel}
              <button
                type="button"
                aria-label={`Supprimer le filtre ${confidenceLabel}`}
                onClick={() => setMinConfidence("")}
                className={cn("ml-1 rounded-full", CHARTER_FOCUS_RING)}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </Badge>
          )}
          {region && regionLabel && (
            <Badge
              variant="secondary"
              className="flex items-center gap-1 px-3 py-1 text-sm"
            >
              {regionLabel}
              <button
                type="button"
                aria-label={`Supprimer le filtre ${regionLabel}`}
                onClick={() => setRegion("")}
                className={cn("ml-1 rounded-full", CHARTER_FOCUS_RING)}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </Badge>
          )}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-sm text-afh-text-muted hover:text-afh-text underline underline-offset-2 ml-auto"
            >
              Tout effacer
            </button>
          )}
        </div>

        {/* ── sort + results count ── */}
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-afh-text-soft" aria-live="polite">
            {hasSearched && !loading && sortedResults.length > 0
              ? `${sortedResults.length} résultat${sortedResults.length > 1 ? "s" : ""}`
              : null}
          </p>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger
              className="w-[180px]"
              aria-label="Trier les résultats"
            >
              <SelectValue placeholder="Trier par" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* ── loading indicator ── */}
        {loading && (
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

        {/* ── results list ── */}
        {!loading && sortedResults.length > 0 && (
          <ul className="space-y-3" aria-label="Résultats de recherche">
            {sortedResults.map((result, i) => (
              <li key={`${result.type}-${result.id}-${i}`}>
                <Card className="p-4 hover:shadow-afh-2 motion-safe:transition-shadow motion-safe:duration-[170ms]">
                  <h3 className="font-semibold text-base mb-1">
                    {result.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="flex items-center gap-1.5">
                      <SearchEntityMark
                        type={result.type as SearchEntityType}
                      />
                      <Badge variant="secondary" className="text-xs">
                        {getSearchEntityLabel(result.type as SearchEntityType)}
                      </Badge>
                    </span>
                    {result.languageFamilyName && (
                      <Badge variant="outline" className="text-xs">
                        {result.languageFamilyName}
                      </Badge>
                    )}
                  </div>
                  {result.snippet && (
                    <p className="text-sm text-afh-text-soft line-clamp-2">
                      {result.snippet}
                    </p>
                  )}
                  {result.population !== undefined && (
                    <p className="text-sm text-afh-text-soft mt-1">
                      Population : {formatNumber(result.population)}
                    </p>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}

        {/* ── empty state (post-search, no results) ── */}
        {!loading && hasSearched && sortedResults.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[16rem] gap-4 px-6 py-10 bg-afh-bg-warm rounded-afh-lg text-center">
            <p className="text-base text-afh-text-soft max-w-sm">
              Aucun résultat pour « {committedQuery} ».
            </p>
            <p className="text-sm text-afh-text-soft">
              Vérifiez l&apos;orthographe ou essayez un autre terme.
            </p>
            <div className="flex flex-col gap-2 text-sm">
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
