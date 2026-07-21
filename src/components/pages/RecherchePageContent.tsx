"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, X, Loader2, Users, MapPin, Languages } from "lucide-react";
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
import { useLanguage } from "@/hooks/use-language";
import { getLocalizedRoute } from "@/lib/routing";
import { classificationLabels } from "@/lib/translations";
import type { ClassificationStatus } from "@/types/afrik";
import type { SearchEntityType } from "@/types/afrik-frontend";

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

type SortKey = "relevance" | "az" | "za" | "pop-desc" | "pop-asc";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "relevance", label: "Pertinence" },
  { value: "az", label: "A → Z" },
  { value: "za", label: "Z → A" },
  { value: "pop-desc", label: "Population ↓" },
  { value: "pop-asc", label: "Population ↑" },
];

// ── types ─────────────────────────────────────────────────────────────────────

interface SearchHit {
  id: string;
  type: string;
  name: string;
  snippet?: string;
  population?: number;
  languageFamilyName?: string;
  countryIds?: string[];
}

// ── helpers ───────────────────────────────────────────────────────────────────

function getTypeIcon(type: SearchEntityType) {
  switch (type) {
    case "languageFamily":
      return <Languages className="h-5 w-5 text-primary" aria-hidden="true" />;
    case "people":
      return <Users className="h-5 w-5 text-primary" aria-hidden="true" />;
    case "country":
      return <MapPin className="h-5 w-5 text-primary" aria-hidden="true" />;
    default:
      return <Search className="h-5 w-5 text-primary" aria-hidden="true" />;
  }
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    languageFamily: "Famille linguistique",
    people: "Peuple",
    country: "Pays",
    language: "Langue",
  };
  return labels[type] ?? type;
}

function mapApiResults(raw: Record<string, unknown>[]): SearchHit[] {
  return raw.map((item) => ({
    id: String(item.id),
    type: String(item.type),
    name: String(item.name),
    snippet: item.snippet as string | undefined,
    population: item.population as number | undefined,
    languageFamilyName: item.languageFamilyName as string | undefined,
    countryIds: item.countryIds as string[] | undefined,
  }));
}

// ── component ─────────────────────────────────────────────────────────────────

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
    searchParams.get("classificationStatus") ?? ""
  );
  const [minConfidence, setMinConfidence] = useState(
    searchParams.get("minConfidence") ?? ""
  );
  const [region, setRegion] = useState(searchParams.get("region") ?? "");
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
        const params = new URLSearchParams({ q, limit: "20" });
        if (cs) params.set("classificationStatus", cs);
        if (mc) params.set("minConfidence", mc);
        const res = await fetch(`/api/v2/search?${params}`);
        if (!res.ok) {
          setResults([]);
          return;
        }
        const data = await res.json();
        setResults(mapApiResults(data.data?.results ?? []));
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
          `/api/v2/search?q=${encodeURIComponent(inputValue)}&limit=6`
        );
        if (!res.ok) return;
        const data = await res.json();
        const hits = mapApiResults(data.data?.results ?? []);
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
              className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none"
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
                className="absolute z-50 w-full bg-background border rounded-md shadow-lg mt-1 overflow-hidden"
              >
                {suggestions.map((s) => (
                  <li
                    key={s.id}
                    role="option"
                    aria-selected={false}
                    className="px-4 py-2 hover:bg-muted cursor-pointer text-sm"
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
            value={classificationStatus}
            onValueChange={setClassificationStatus}
          >
            <SelectTrigger
              className="w-[210px]"
              aria-label="Filtrer par classification"
            >
              <SelectValue placeholder="Classification" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Toutes les classifications</SelectItem>
              <SelectItem value="consensual">Consensuel</SelectItem>
              <SelectItem value="contested">Contesté</SelectItem>
              <SelectItem value="colonial-legacy">Héritage colonial</SelectItem>
              <SelectItem value="reconstructive">Reconstructif</SelectItem>
            </SelectContent>
          </Select>

          <Select value={minConfidence} onValueChange={setMinConfidence}>
            <SelectTrigger
              className="w-[190px]"
              aria-label="Filtrer par confiance minimale"
            >
              <SelectValue placeholder="Confiance min." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Toute confiance</SelectItem>
              {CONFIDENCE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={region} onValueChange={setRegion}>
            <SelectTrigger
              className="w-[210px]"
              aria-label="Filtrer par région"
            >
              <SelectValue placeholder="Région" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Toutes les régions</SelectItem>
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
                className="ml-1 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                className="ml-1 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                className="ml-1 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </Badge>
          )}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 ml-auto"
            >
              Tout effacer
            </button>
          )}
        </div>

        {/* ── sort + results count ── */}
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground" aria-live="polite">
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
              className="h-6 w-6 animate-spin text-muted-foreground"
              aria-label="Chargement en cours"
            />
          </div>
        )}

        {/* ── results list ── */}
        {!loading && sortedResults.length > 0 && (
          <ul className="space-y-3" aria-label="Résultats de recherche">
            {sortedResults.map((result, i) => (
              <li key={`${result.type}-${result.id}-${i}`}>
                <Card className="p-4 hover:shadow-md transition-all">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {getTypeIcon(result.type as SearchEntityType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base mb-1">
                        {result.name}
                      </h3>
                      <div className="flex flex-wrap gap-2 mb-1">
                        <Badge variant="secondary" className="text-xs">
                          {getTypeLabel(result.type)}
                        </Badge>
                        {result.languageFamilyName && (
                          <Badge variant="outline" className="text-xs">
                            {result.languageFamilyName}
                          </Badge>
                        )}
                      </div>
                      {result.snippet && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {result.snippet}
                        </p>
                      )}
                      {result.population !== undefined && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Population : {formatNumber(result.population)}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}

        {/* ── empty state (post-search, no results) ── */}
        {!loading && hasSearched && sortedResults.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[16rem] gap-4 px-6 py-10 bg-afh-bg-warm rounded-md text-center">
            <p className="text-base text-afh-text-soft max-w-sm">
              Aucun résultat pour « {committedQuery} ».
            </p>
            <p className="text-sm text-afh-text-soft">
              Vérifiez l&apos;orthographe ou essayez un autre terme.
            </p>
            <div className="flex flex-col gap-2 text-sm">
              <Link
                href={getLocalizedRoute(language, "families")}
                className="underline underline-offset-2 hover:text-foreground transition-colors"
              >
                Parcourir par famille
              </Link>
              <Link
                href={`/${language}/contribute?q=${encodeURIComponent(committedQuery)}`}
                className="underline underline-offset-2 hover:text-foreground transition-colors"
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
