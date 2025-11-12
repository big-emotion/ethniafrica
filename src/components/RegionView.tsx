"use client";

import { useState, useMemo, useEffect } from "react";
import { Language } from "@/types/ethnicity";
import { getTranslation } from "@/lib/translations";
import { getRegions } from "@/lib/datasetLoader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Globe, ChevronLeft, ChevronRight } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface RegionViewProps {
  language: Language;
  onRegionSelect: (regionKey: string) => void;
  hideSearchAndAlphabet?: boolean;
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export const RegionView = ({
  language,
  onRegionSelect,
  hideSearchAndAlphabet = false,
}: RegionViewProps) => {
  const t = getTranslation(language);
  const isMobile = useIsMobile();
  const [search, setSearch] = useState<string>("");
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [regions, setRegions] = useState<
    Array<{
      key: string;
      name: string;
      totalPopulation: number;
      countryCount: number;
    }>
  >([]);
  const [loading, setLoading] = useState(true);

  const itemsPerPage = 10;
  const maxItemsMobile = 10;

  useEffect(() => {
    getRegions().then((data) => {
      setRegions(
        data.map(({ key, data: regionData }) => ({
          key,
          name: regionData.name,
          totalPopulation: regionData.totalPopulation,
          countryCount: Object.keys(regionData.countries).length,
        }))
      );
      setLoading(false);
    });
  }, []);

  const filteredRegions = useMemo(() => {
    return regions.filter((region) => {
      const matchesSearch =
        region.name.toLowerCase().includes(search.toLowerCase()) ||
        region.key.toLowerCase().includes(search.toLowerCase());

      if (selectedLetter) {
        const firstLetter = region.name.charAt(0).toUpperCase();
        return matchesSearch && firstLetter === selectedLetter;
      }

      return matchesSearch;
    });
  }, [regions, search, selectedLetter]);

  const paginatedRegions = useMemo(() => {
    if (isMobile) {
      // En mobile, limiter à 10 cartes maximum
      return filteredRegions.slice(0, maxItemsMobile);
    }
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRegions.slice(start, start + itemsPerPage);
  }, [filteredRegions, currentPage, isMobile, maxItemsMobile]);

  const totalPages = Math.ceil(filteredRegions.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedLetter, search]);

  const availableLetters = useMemo(() => {
    const letters = new Set<string>();
    regions.forEach((region) => {
      const firstLetter = region.name.charAt(0).toUpperCase();
      if (/[A-Z]/.test(firstLetter)) {
        letters.add(firstLetter);
      }
    });
    return Array.from(letters).sort();
  }, [regions]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading regions...</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${hideSearchAndAlphabet ? "h-full flex flex-col" : ""}`}>
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

      {/* Liste des régions */}
      {isMobile ? (
        // En mobile, pas de ScrollArea, juste une div simple
        <div className={`space-y-2 ${hideSearchAndAlphabet ? "px-0" : "px-4"} pb-4`}>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">Loading regions...</p>
            </div>
          ) : paginatedRegions.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">No regions found</p>
            </div>
          ) : (
            paginatedRegions.map((region) => (
              <Card
                key={region.key}
                className="p-4 hover:shadow-md cursor-pointer transition-all group mx-0"
                onClick={() => onRegionSelect(region.key)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Globe className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold text-base group-hover:text-primary transition-colors">
                        {region.name}
                      </h3>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div>
                        Population: {formatNumber(region.totalPopulation)}
                      </div>
                      <div>
                        {region.countryCount} {t.country.toLowerCase() + "s"}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      ) : (
        <ScrollArea className={hideSearchAndAlphabet ? "flex-1 min-h-0" : "h-[calc(100vh-24rem)]"}>
          <div className={`space-y-2 ${hideSearchAndAlphabet ? "px-0" : "px-4"} pb-4`}>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">Loading regions...</p>
              </div>
            ) : paginatedRegions.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">No regions found</p>
              </div>
            ) : (
              paginatedRegions.map((region) => (
                <Card
                  key={region.key}
                  className={`p-4 hover:shadow-md cursor-pointer transition-all group ${hideSearchAndAlphabet ? "mx-0" : ""}`}
                  onClick={() => onRegionSelect(region.key)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Globe className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold text-base group-hover:text-primary transition-colors">
                          {region.name}
                        </h3>
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div>
                          Population: {formatNumber(region.totalPopulation)}
                        </div>
                        <div>
                          {region.countryCount} {t.country.toLowerCase() + "s"}
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
        <div className={`flex items-center justify-center gap-2 ${hideSearchAndAlphabet ? "px-0" : "px-4"} pb-4 flex-shrink-0`}>
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
