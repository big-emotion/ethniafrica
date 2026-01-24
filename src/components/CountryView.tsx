"use client";

import { useState, useMemo, useEffect } from "react";
import { Language } from "@/types/ethnicity";
import { getTranslation } from "@/lib/translations";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Loader2,
  Users,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { normalizeString, getNormalizedFirstLetter } from "@/lib/normalize";
import type { CountrySummary } from "@/types/afrik-frontend";
import { getAllCountries } from "@/lib/afrikLoader";

interface CountryViewProps {
  language: Language;
  onCountrySelect: (country: CountrySummary) => void;
  hideSearchAndAlphabet?: boolean;
  selectedCountryId?: string | null;
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export const CountryView = ({
  language,
  onCountrySelect,
  hideSearchAndAlphabet = false,
  selectedCountryId = null,
}: CountryViewProps) => {
  const t = getTranslation(language);
  const isMobile = useIsMobile();
  const [search, setSearch] = useState<string>("");
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [countries, setCountries] = useState<CountrySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const itemsPerPage = 10;
  const maxItemsMobile = 10;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const loadCountries = async () => {
      // Minimum loading time for UX
      const minLoadingTime = Promise.all([
        new Promise((resolve) => setTimeout(resolve, 300)),
        (async () => {
          try {
            const data = await getAllCountries();
            if (!cancelled) {
              setCountries(data);
            }
          } catch (err) {
            if (!cancelled) {
              console.error("Error fetching countries:", err);
              setError(
                language === "en"
                  ? "Failed to load countries"
                  : language === "fr"
                    ? "Échec du chargement des pays"
                    : language === "es"
                      ? "Error al cargar países"
                      : "Falha ao carregar países"
              );
            }
          }
        })(),
      ]);

      await minLoadingTime;
      if (!cancelled) {
        setLoading(false);
      }
    };

    loadCountries();

    return () => {
      cancelled = true;
    };
  }, [language]);

  const filteredCountries = useMemo(() => {
    const normalizedSearch = normalizeString(search);
    return countries.filter((country) => {
      const matchesSearch =
        normalizeString(country.nameFr).includes(normalizedSearch) ||
        normalizeString(country.id).includes(normalizedSearch) ||
        (country.nameOfficial &&
          normalizeString(country.nameOfficial).includes(normalizedSearch));

      if (selectedLetter) {
        const normalizedFirstLetter = getNormalizedFirstLetter(country.nameFr);
        return matchesSearch && normalizedFirstLetter === selectedLetter;
      }

      return matchesSearch;
    });
  }, [countries, search, selectedLetter]);

  const paginatedCountries = useMemo(() => {
    if (isMobile) {
      return filteredCountries.slice(0, maxItemsMobile);
    }
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCountries.slice(start, start + itemsPerPage);
  }, [filteredCountries, currentPage, isMobile, maxItemsMobile]);

  const totalPages = Math.ceil(filteredCountries.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedLetter, search]);

  const availableLetters = useMemo(() => {
    const letters = new Set<string>();
    countries.forEach((country) => {
      const normalizedFirstLetter = getNormalizedFirstLetter(country.nameFr);
      if (/[A-Z]/.test(normalizedFirstLetter)) {
        letters.add(normalizedFirstLetter);
      }
    });
    return Array.from(letters).sort();
  }, [countries]);

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

  const getLoadingText = (): string => {
    switch (language) {
      case "en":
        return "Loading countries...";
      case "fr":
        return "Chargement des pays...";
      case "es":
        return "Cargando países...";
      case "pt":
        return "Carregando países...";
      default:
        return "Chargement des pays...";
    }
  };

  const getNoResultsText = (): string => {
    switch (language) {
      case "en":
        return "No countries found";
      case "fr":
        return "Aucun pays trouvé";
      case "es":
        return "No se encontraron países";
      case "pt":
        return "Nenhum país encontrado";
      default:
        return "Aucun pays trouvé";
    }
  };

  const getMajorPeoplesLabel = (): string => {
    switch (language) {
      case "en":
        return "major peoples";
      case "fr":
        return "peuples majeurs";
      case "es":
        return "pueblos principales";
      case "pt":
        return "povos principais";
      default:
        return "peuples majeurs";
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 py-8">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm font-medium">
          {getLoadingText()}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 py-8">
        <p className="text-destructive text-sm font-medium">{error}</p>
      </div>
    );
  }

  const renderCountryCard = (country: CountrySummary) => (
    <Card
      key={country.id}
      className={`p-4 hover:shadow-md cursor-pointer transition-all group ${
        hideSearchAndAlphabet ? "mx-0" : ""
      } ${selectedCountryId === country.id ? "border-2 border-primary" : ""}`}
      onClick={() => onCountrySelect(country)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-base group-hover:text-primary transition-colors">
              {country.nameFr}
            </h3>
            <span className="text-xs text-muted-foreground">
              ({country.id})
            </span>
          </div>
          <div className="space-y-1 text-sm text-muted-foreground">
            {country.population !== undefined && (
              <div>Population: {formatNumber(country.population)}</div>
            )}
            {country.majorPeoplesCount !== undefined &&
              country.majorPeoplesCount > 0 && (
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {country.majorPeoplesCount} {getMajorPeoplesLabel()}
                </div>
              )}
          </div>
        </div>
      </div>
    </Card>
  );

  return (
    <div
      className={`space-y-4 ${
        hideSearchAndAlphabet ? "h-full flex flex-col" : ""
      }`}
    >
      {/* Alphabetical navigation */}
      {!hideSearchAndAlphabet && (
        <>
          <div className="px-4 pt-4">
            <div className="flex flex-wrap gap-1 justify-center">
              <Button
                variant={selectedLetter === null ? "default" : "outline"}
                size="sm"
                className="h-8 w-8 p-0 text-xs"
                onClick={() => setSelectedLetter(null)}
              >
                {language === "en" ? "All" : "Tous"}
              </Button>
              {ALPHABET.map((letter) => (
                <Button
                  key={letter}
                  variant={selectedLetter === letter ? "default" : "outline"}
                  size="sm"
                  className={`h-8 w-8 p-0 text-xs ${
                    availableLetters.includes(letter)
                      ? ""
                      : "opacity-30 cursor-not-allowed"
                  }`}
                  onClick={() =>
                    availableLetters.includes(letter) &&
                    setSelectedLetter(letter)
                  }
                  disabled={!availableLetters.includes(letter)}
                >
                  {letter}
                </Button>
              ))}
            </div>
          </div>

          {/* Search bar */}
          <div className="relative px-4">
            <Search className="absolute left-7 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </>
      )}

      {/* Countries list */}
      {isMobile ? (
        <div
          className={`space-y-2 ${
            hideSearchAndAlphabet ? "px-0" : "px-4"
          } pb-4`}
        >
          {paginatedCountries.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">{getNoResultsText()}</p>
            </div>
          ) : (
            paginatedCountries.map(renderCountryCard)
          )}
        </div>
      ) : (
        <ScrollArea
          className={
            hideSearchAndAlphabet ? "flex-1 min-h-0" : "h-[calc(100vh-24rem)]"
          }
        >
          <div
            className={`space-y-2 ${
              hideSearchAndAlphabet ? "px-0" : "px-4"
            } pb-4`}
          >
            {paginatedCountries.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">{getNoResultsText()}</p>
              </div>
            ) : (
              paginatedCountries.map(renderCountryCard)
            )}
          </div>
        </ScrollArea>
      )}

      {/* Pagination - desktop only */}
      {!isMobile && totalPages > 1 && (
        <div
          className={`flex items-center justify-center gap-2 ${
            hideSearchAndAlphabet ? "px-0" : "px-4"
          } pb-4 flex-shrink-0`}
        >
          <Button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            variant="outline"
            size="sm"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {currentPage} / {totalPages}
          </span>
          <Button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            variant="outline"
            size="sm"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
