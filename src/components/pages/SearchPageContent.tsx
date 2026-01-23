"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Search,
  Users,
  MapPin,
  Loader2,
  Languages,
  Filter,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageLayout } from "@/components/PageLayout";
import { useLanguage } from "@/hooks/use-language";
import { getTranslation } from "@/lib/translations";
import { getLocalizedRoute } from "@/lib/routing";
import { search, getAllLanguageFamilies } from "@/lib/afrikLoader";
import type {
  SearchResult,
  SearchEntityType,
  LanguageFamilySummary,
} from "@/types/afrik-frontend";
import { Language } from "@/types/ethnicity";

const ITEMS_PER_PAGE = 20;

export const SearchPageContent = () => {
  const { language, setLanguage } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = getTranslation(language);

  // State from URL params
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [selectedType, setSelectedType] = useState<SearchEntityType | "all">(
    (searchParams.get("type") as SearchEntityType | "all") || "all"
  );
  const [selectedFamily, setSelectedFamily] = useState(
    searchParams.get("family") || ""
  );

  // Local state
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [families, setFamilies] = useState<LanguageFamilySummary[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Load families for filter
  useEffect(() => {
    const loadFamilies = async () => {
      try {
        const allFamilies = await getAllLanguageFamilies();
        setFamilies(allFamilies);
      } catch (error) {
        console.error("Failed to load families:", error);
      }
    };
    loadFamilies();
  }, []);

  // Update URL when filters change
  const updateURL = useCallback(
    (newQuery: string, newType: string, newFamily: string) => {
      const params = new URLSearchParams();
      if (newQuery) params.set("q", newQuery);
      if (newType && newType !== "all") params.set("type", newType);
      if (newFamily) params.set("family", newFamily);

      const searchRoute = getLocalizedRoute(language, "search");
      const newURL = params.toString()
        ? `${searchRoute}?${params.toString()}`
        : searchRoute;

      router.replace(newURL, { scroll: false });
    },
    [language, router]
  );

  // Perform search
  const performSearch = useCallback(async () => {
    if (!query.trim() && !selectedFamily) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const filters: { type?: SearchEntityType; languageFamilyId?: string } =
        {};
      if (selectedType !== "all") {
        filters.type = selectedType;
      }
      if (selectedFamily) {
        filters.languageFamilyId = selectedFamily;
      }

      const data = await search(query, filters);
      setResults(data);
      setHasMore(data.length >= ITEMS_PER_PAGE);
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query, selectedType, selectedFamily]);

  // Debounced search
  useEffect(() => {
    const debounce = setTimeout(() => {
      performSearch();
      updateURL(query, selectedType, selectedFamily);
    }, 300);

    return () => clearTimeout(debounce);
  }, [query, selectedType, selectedFamily, performSearch, updateURL]);

  // Format number
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat(
      language === "en"
        ? "en-US"
        : language === "fr"
          ? "fr-FR"
          : language === "es"
            ? "es-ES"
            : "pt-PT"
    ).format(Math.round(num));
  };

  // Get labels
  const getTypeLabel = (type: SearchEntityType) => {
    const labels: Record<Language, Record<SearchEntityType, string>> = {
      en: {
        languageFamily: "Language Family",
        people: "People",
        country: "Country",
        language: "Language",
      },
      fr: {
        languageFamily: "Famille linguistique",
        people: "Peuple",
        country: "Pays",
        language: "Langue",
      },
      es: {
        languageFamily: "Familia lingüística",
        people: "Pueblo",
        country: "País",
        language: "Idioma",
      },
      pt: {
        languageFamily: "Família linguística",
        people: "Povo",
        country: "País",
        language: "Língua",
      },
    };
    return labels[language][type] || type;
  };

  const getTypeIcon = (type: SearchEntityType) => {
    switch (type) {
      case "languageFamily":
        return <Languages className="h-5 w-5 text-primary" />;
      case "people":
        return <Users className="h-5 w-5 text-primary" />;
      case "country":
        return <MapPin className="h-5 w-5 text-primary" />;
      default:
        return <Search className="h-5 w-5 text-primary" />;
    }
  };

  const getFilterLabels = () => {
    return {
      all:
        language === "en"
          ? "All"
          : language === "fr"
            ? "Tout"
            : language === "es"
              ? "Todo"
              : "Tudo",
      families:
        language === "en"
          ? "Families"
          : language === "fr"
            ? "Familles"
            : language === "es"
              ? "Familias"
              : "Famílias",
      peoples:
        language === "en"
          ? "Peoples"
          : language === "fr"
            ? "Peuples"
            : language === "es"
              ? "Pueblos"
              : "Povos",
      countries:
        language === "en"
          ? "Countries"
          : language === "fr"
            ? "Pays"
            : language === "es"
              ? "Países"
              : "Países",
    };
  };

  const labels = getFilterLabels();

  // Handle result click
  const handleResultClick = (result: SearchResult) => {
    switch (result.type) {
      case "languageFamily":
        router.push(
          `${getLocalizedRoute(language, "families")}?family=${result.id}`
        );
        break;
      case "people":
        router.push(
          `${getLocalizedRoute(language, "peoples")}?people=${result.id}`
        );
        break;
      case "country":
        router.push(
          `${getLocalizedRoute(language, "countries")}?country=${result.id}`
        );
        break;
    }
  };

  // Clear filters
  const clearFilters = () => {
    setQuery("");
    setSelectedType("all");
    setSelectedFamily("");
    setResults([]);
  };

  const hasActiveFilters =
    query || selectedType !== "all" || selectedFamily !== "";

  const pageTitle =
    language === "en"
      ? "Search"
      : language === "fr"
        ? "Recherche"
        : language === "es"
          ? "Búsqueda"
          : "Pesquisa";

  const pageSubtitle =
    language === "en"
      ? "Search for language families, peoples, and countries"
      : language === "fr"
        ? "Rechercher des familles linguistiques, peuples et pays"
        : language === "es"
          ? "Buscar familias lingüísticas, pueblos y países"
          : "Pesquisar famílias linguísticas, povos e países";

  const placeholderText =
    language === "en"
      ? "Type to search..."
      : language === "fr"
        ? "Tapez pour rechercher..."
        : language === "es"
          ? "Escriba para buscar..."
          : "Digite para pesquisar...";

  const filterByFamilyText =
    language === "en"
      ? "Filter by family"
      : language === "fr"
        ? "Filtrer par famille"
        : language === "es"
          ? "Filtrar por familia"
          : "Filtrar por família";

  const allFamiliesText =
    language === "en"
      ? "All families"
      : language === "fr"
        ? "Toutes les familles"
        : language === "es"
          ? "Todas las familias"
          : "Todas as famílias";

  const clearFiltersText =
    language === "en"
      ? "Clear filters"
      : language === "fr"
        ? "Effacer les filtres"
        : language === "es"
          ? "Limpiar filtros"
          : "Limpar filtros";

  const resultsText =
    language === "en"
      ? "results"
      : language === "fr"
        ? "résultats"
        : language === "es"
          ? "resultados"
          : "resultados";

  const noResultsText =
    language === "en"
      ? "No results found"
      : language === "fr"
        ? "Aucun résultat trouvé"
        : language === "es"
          ? "No se encontraron resultados"
          : "Nenhum resultado encontrado";

  const startSearchText =
    language === "en"
      ? "Start typing to search..."
      : language === "fr"
        ? "Commencez à taper pour rechercher..."
        : language === "es"
          ? "Comience a escribir para buscar..."
          : "Comece a digitar para pesquisar...";

  return (
    <PageLayout
      language={language}
      onLanguageChange={setLanguage}
      title={pageTitle}
      subtitle={pageSubtitle}
    >
      <div className="space-y-6">
        {/* Search Input */}
        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder={placeholderText}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-11 h-12 text-base"
            autoFocus
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 justify-center">
          {/* Type filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <div className="flex gap-1">
              <Button
                variant={selectedType === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedType("all")}
              >
                {labels.all}
              </Button>
              <Button
                variant={
                  selectedType === "languageFamily" ? "default" : "outline"
                }
                size="sm"
                onClick={() => setSelectedType("languageFamily")}
              >
                {labels.families}
              </Button>
              <Button
                variant={selectedType === "people" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedType("people")}
              >
                {labels.peoples}
              </Button>
              <Button
                variant={selectedType === "country" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedType("country")}
              >
                {labels.countries}
              </Button>
            </div>
          </div>

          {/* Family filter */}
          <Select value={selectedFamily} onValueChange={setSelectedFamily}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={filterByFamilyText} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{allFamiliesText}</SelectItem>
              {families.map((family) => (
                <SelectItem key={family.id} value={family.id}>
                  {family.nameFr}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Clear filters */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              {clearFiltersText}
            </Button>
          )}
        </div>

        {/* Results count */}
        {results.length > 0 && (
          <p className="text-center text-muted-foreground">
            {results.length} {resultsText}
          </p>
        )}

        {/* Results */}
        <div className="max-w-4xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Search className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <p className="text-muted-foreground">
                {query.trim() || selectedFamily
                  ? noResultsText
                  : startSearchText}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((result, index) => (
                <Card
                  key={`${result.type}-${result.id}-${index}`}
                  className="p-4 hover:shadow-md cursor-pointer transition-all"
                  onClick={() => handleResultClick(result)}
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-1">{getTypeIcon(result.type)}</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg mb-1">
                        {result.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge variant="secondary">
                          {getTypeLabel(result.type)}
                        </Badge>
                        {result.languageFamilyName && (
                          <Badge variant="outline">
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
                          {t.population}: {formatNumber(result.population)}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
};

export default SearchPageContent;
