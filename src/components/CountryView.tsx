"use client";

import { useState, useMemo, useEffect } from "react";
import { Language } from "@/types/ethnicity";
import { getTranslation } from "@/lib/translations";
import { getAllCountries } from "@/lib/datasetLoader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { normalizeString, getNormalizedFirstLetter } from "@/lib/normalize";

interface CountryViewProps {
  language: Language;
  onCountrySelect: (country: string, regionKey: string) => void;
  hideSearchAndAlphabet?: boolean;
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export const CountryView = ({
  language,
  onCountrySelect,
  hideSearchAndAlphabet = false,
}: CountryViewProps) => {
  const t = getTranslation(language);
  const isMobile = useIsMobile();
  const [search, setSearch] = useState<string>("");
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [countries, setCountries] = useState<
    Array<{
      name: string;
      region: string;
      regionName: string;
      data: {
        population: number;
        ethnicityCount: number;
      };
    }>
  >([]);
  const [loading, setLoading] = useState(true);

  const itemsPerPage = 10;
  const maxItemsMobile = 10;

  useEffect(() => {
    getAllCountries().then((data) => {
      setCountries(data);
      setLoading(false);
    });
  }, []);

  const filteredCountries = useMemo(() => {
    const normalizedSearch = normalizeString(search);
    return countries.filter((country) => {
      const matchesSearch =
        normalizeString(country.name).includes(normalizedSearch) ||
        normalizeString(country.regionName).includes(normalizedSearch);

      if (selectedLetter) {
        const normalizedFirstLetter = getNormalizedFirstLetter(country.name);
        return matchesSearch && normalizedFirstLetter === selectedLetter;
      }

      return matchesSearch;
    });
  }, [countries, search, selectedLetter]);

  const paginatedCountries = useMemo(() => {
    if (isMobile) {
      // En mobile, limiter à 10 cartes maximum
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
      const normalizedFirstLetter = getNormalizedFirstLetter(country.name);
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
    ).format(num);
  };

  return (
    <div
      className={`space-y-4 ${
        hideSearchAndAlphabet ? "h-full flex flex-col" : ""
      }`}
    >
      {/* Navigation alphabétique */}
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
                Tous
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

          {/* Barre de recherche */}
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

      {/* Liste des pays */}
      {isMobile ? (
        // En mobile, pas de ScrollArea, juste une div simple
        <div
          className={`space-y-2 ${
            hideSearchAndAlphabet ? "px-0" : "px-4"
          } pb-4`}
        >
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">Loading countries...</p>
            </div>
          ) : paginatedCountries.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">No countries found</p>
            </div>
          ) : (
            paginatedCountries.map((country) => (
              <Card
                key={country.name}
                className="p-4 hover:shadow-md cursor-pointer transition-all group"
                onClick={() => onCountrySelect(country.name, country.region)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-base group-hover:text-primary transition-colors mb-2">
                      {country.name}
                    </h3>
                    <Badge variant="secondary" className="text-xs mb-2">
                      {country.regionName}
                    </Badge>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>
                        {formatNumber(country.data.population)}{" "}
                        {language === "en" ? "inhabitants" : "habitants"}
                      </div>
                      <div>
                        {country.data.ethnicityCount}{" "}
                        {t.ethnicGroups.toLowerCase()}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))
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
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">Loading countries...</p>
              </div>
            ) : paginatedCountries.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">No countries found</p>
              </div>
            ) : (
              paginatedCountries.map((country) => (
                <Card
                  key={country.name}
                  className="p-4 hover:shadow-md cursor-pointer transition-all group"
                  onClick={() => onCountrySelect(country.name, country.region)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-base group-hover:text-primary transition-colors mb-2">
                        {country.name}
                      </h3>
                      <Badge variant="secondary" className="text-xs mb-2">
                        {country.regionName}
                      </Badge>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>
                          {formatNumber(country.data.population)}{" "}
                          {language === "en" ? "inhabitants" : "habitants"}
                        </div>
                        <div>
                          {country.data.ethnicityCount}{" "}
                          {t.ethnicGroups.toLowerCase()}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      )}

      {/* Pagination - seulement en desktop */}
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
