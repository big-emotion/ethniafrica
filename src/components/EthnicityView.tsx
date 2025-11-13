"use client";

import { useState, useMemo, useEffect } from "react";
import { Language } from "@/types/ethnicity";
import { getTranslation } from "@/lib/translations";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ChevronLeft, ChevronRight, Users } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { normalizeString, getNormalizedFirstLetter } from "@/lib/normalize";

interface EthnicityViewProps {
  language: Language;
  onEthnicitySelect: (ethnicity: string) => void;
  hideSearchAndAlphabet?: boolean;
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export const EthnicityView = ({
  language,
  onEthnicitySelect,
  hideSearchAndAlphabet = false,
}: EthnicityViewProps) => {
  const t = getTranslation(language);
  const isMobile = useIsMobile();
  const [search, setSearch] = useState<string>("");
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [ethnicGroups, setEthnicGroups] = useState<
    Array<{
      name: string;
      totalPopulation: number;
      percentageInAfrica: number;
      countryCount: number;
    }>
  >([]);
  const [loading, setLoading] = useState(true);

  const itemsPerPage = 10;
  const maxItemsMobile = 10;

  useEffect(() => {
    const controller = new AbortController();

    const loadEthnicities = async () => {
      try {
        const response = await fetch("/api/ethnicities", {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to load ethnicities");
        }

        const payload = await response.json();
        setEthnicGroups(payload.ethnicities);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        console.error("Error fetching ethnicities:", error);
      } finally {
        setLoading(false);
      }
    };

    loadEthnicities();

    return () => {
      controller.abort();
    };
  }, []);

  const filteredGroups = useMemo(() => {
    const normalizedSearch = normalizeString(search);
    return ethnicGroups.filter((group) => {
      const matchesSearch = normalizeString(group.name).includes(
        normalizedSearch
      );

      if (selectedLetter) {
        const normalizedFirstLetter = getNormalizedFirstLetter(group.name);
        return matchesSearch && normalizedFirstLetter === selectedLetter;
      }

      return matchesSearch;
    });
  }, [ethnicGroups, search, selectedLetter]);

  const paginatedGroups = useMemo(() => {
    if (isMobile) {
      // En mobile, limiter à 10 cartes maximum
      return filteredGroups.slice(0, maxItemsMobile);
    }
    const start = (currentPage - 1) * itemsPerPage;
    return filteredGroups.slice(start, start + itemsPerPage);
  }, [filteredGroups, currentPage, isMobile, maxItemsMobile]);

  const totalPages = Math.ceil(filteredGroups.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedLetter, search]);

  const availableLetters = useMemo(() => {
    const letters = new Set<string>();
    ethnicGroups.forEach((group) => {
      const normalizedFirstLetter = getNormalizedFirstLetter(group.name);
      if (/[A-Z]/.test(normalizedFirstLetter)) {
        letters.add(normalizedFirstLetter);
      }
    });
    return Array.from(letters).sort();
  }, [ethnicGroups]);

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

  const formatPercent = (pct: number): string => {
    return `${pct.toFixed(2)}%`;
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

      {/* Liste des ethnies */}
      {isMobile ? (
        // En mobile, pas de ScrollArea, juste une div simple
        <div
          className={`space-y-2 ${
            hideSearchAndAlphabet ? "px-0" : "px-4"
          } pb-4`}
        >
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">Loading ethnicities...</p>
            </div>
          ) : paginatedGroups.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">No ethnicities found</p>
            </div>
          ) : (
            paginatedGroups.map((group) => (
              <Card
                key={group.name}
                className="p-4 hover:shadow-md cursor-pointer transition-all group mx-0"
                onClick={() => onEthnicitySelect(group.name)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold text-base group-hover:text-primary transition-colors">
                        {group.name}
                      </h3>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div>
                        Population: {formatNumber(group.totalPopulation)}
                      </div>
                      <div>
                        {group.countryCount}{" "}
                        {group.countryCount === 1
                          ? t.country.toLowerCase()
                          : t.countries.toLowerCase()}
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
                <p className="text-muted-foreground">Loading ethnicities...</p>
              </div>
            ) : paginatedGroups.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">No ethnicities found</p>
              </div>
            ) : (
              paginatedGroups.map((group) => (
                <Card
                  key={group.name}
                  className={`p-4 hover:shadow-md cursor-pointer transition-all group ${
                    hideSearchAndAlphabet ? "mx-0" : ""
                  }`}
                  onClick={() => onEthnicitySelect(group.name)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold text-base group-hover:text-primary transition-colors">
                          {group.name}
                        </h3>
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div>
                          Population: {formatNumber(group.totalPopulation)}
                        </div>
                        <div>
                          {group.countryCount}{" "}
                          {group.countryCount === 1
                            ? t.country.toLowerCase()
                            : t.countries.toLowerCase()}
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
