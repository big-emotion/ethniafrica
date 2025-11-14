"use client";

import { useState, useMemo, useEffect } from "react";
import { Language } from "@/types/ethnicity";
import { getTranslation, getRegionName } from "@/lib/translations";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  Globe,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { normalizeString, getNormalizedFirstLetter } from "@/lib/normalize";

interface RegionViewProps {
  language: Language;
  onRegionSelect: (regionKey: string) => void;
  hideSearchAndAlphabet?: boolean;
  selectedRegionKey?: string | null;
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export const RegionView = ({
  language,
  onRegionSelect,
  hideSearchAndAlphabet = false,
  selectedRegionKey = null,
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
    const controller = new AbortController();
    setLoading(true);

    const loadRegions = async () => {
      // Check cache first
      const { getCachedData, setCachedData, CACHE_KEYS } = await import(
        "@/lib/cache/clientCache"
      );
      const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

      // Délai minimum pour garantir la visibilité du loader
      const minLoadingTime = Promise.all([
        new Promise((resolve) => setTimeout(resolve, 300)), // 300ms minimum
        (async () => {
          try {
            // D'abord, récupérer la version du serveur
            const response = await fetch("/api/regions", {
              signal: controller.signal,
            });

            if (!response.ok) {
              throw new Error("Failed to load regions");
            }

            const payload = await response.json();
            const serverVersion = payload.dataVersion;

            // Maintenant, vérifier le cache avec la version du serveur
            // Si le cache n'a pas de version ou si la version diffère, getCachedData retournera null
            const cachedData = getCachedData<
              Array<{
                key: string;
                name: string;
                totalPopulation: number;
                countryCount: number;
              }>
            >(CACHE_KEYS.REGIONS, CACHE_TTL, serverVersion);

            // Si le cache est valide (version correspond), l'utiliser
            if (cachedData && serverVersion !== undefined) {
              // Récupérer la version du cache pour le log
              try {
                const cached = localStorage.getItem(CACHE_KEYS.REGIONS);
                if (cached) {
                  const entry = JSON.parse(cached);
                  if (entry.version === serverVersion) {
                    console.log(
                      `✓ Cache valide utilisé (version: ${serverVersion})`
                    );
                    setRegions(cachedData);
                    setLoading(false);
                    return;
                  }
                }
              } catch {
                // Ignore errors
              }
            }

            // Cache invalide ou absent : utiliser les nouvelles données
            // Vérifier pourquoi le cache a été invalidé pour le log
            try {
              const cached = localStorage.getItem(CACHE_KEYS.REGIONS);
              if (cached) {
                const entry = JSON.parse(cached);
                if (
                  entry.version === undefined &&
                  serverVersion !== undefined
                ) {
                  console.log(
                    `🔄 Cache invalidé automatiquement (ancien cache sans version détecté)`
                  );
                } else if (
                  entry.version !== undefined &&
                  serverVersion !== undefined &&
                  entry.version !== serverVersion
                ) {
                  console.log(
                    `🔄 Cache invalidé automatiquement (version serveur: ${serverVersion}, version cache: ${entry.version})`
                  );
                }
              }
            } catch {
              // Ignore errors
            }

            const regionsData = payload.regions.map(
              ({
                key,
                data: regionData,
              }: {
                key: string;
                data: {
                  name: string;
                  totalPopulation: number;
                  countries: Record<string, unknown>;
                };
              }) => ({
                key,
                name: regionData.name,
                totalPopulation: regionData.totalPopulation,
                countryCount: Object.keys(regionData.countries).length,
              })
            );
            setRegions(regionsData);
            // Cache the data with version for automatic invalidation
            setCachedData(
              CACHE_KEYS.REGIONS,
              regionsData,
              CACHE_TTL,
              serverVersion
            );
          } catch (error) {
            if (error instanceof DOMException && error.name === "AbortError") {
              return;
            }
            console.error("Error fetching regions:", error);
          }
        })(),
      ]);

      await minLoadingTime;
      setLoading(false);
    };

    loadRegions();

    return () => {
      controller.abort();
    };
  }, [language]);

  const filteredRegions = useMemo(() => {
    const normalizedSearch = normalizeString(search);
    return regions.filter((region) => {
      const regionName = getRegionName(region.key, language);
      const matchesSearch =
        normalizeString(regionName).includes(normalizedSearch) ||
        normalizeString(region.key).includes(normalizedSearch);

      if (selectedLetter) {
        const normalizedFirstLetter = getNormalizedFirstLetter(regionName);
        return matchesSearch && normalizedFirstLetter === selectedLetter;
      }

      return matchesSearch;
    });
  }, [regions, search, selectedLetter, language]);

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
      const regionName = getRegionName(region.key, language);
      const normalizedFirstLetter = getNormalizedFirstLetter(regionName);
      if (/[A-Z]/.test(normalizedFirstLetter)) {
        letters.add(normalizedFirstLetter);
      }
    });
    return Array.from(letters).sort();
  }, [regions, language]);

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
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 py-8">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm font-medium">
          {language === "en"
            ? "Loading regions..."
            : language === "fr"
              ? "Chargement des régions..."
              : language === "es"
                ? "Cargando regiones..."
                : "Carregando regiões..."}
        </p>
      </div>
    );
  }

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

      {/* Liste des régions */}
      {isMobile ? (
        // En mobile, pas de ScrollArea, juste une div simple
        <div
          className={`space-y-2 ${
            hideSearchAndAlphabet ? "px-0" : "px-4"
          } pb-4`}
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 py-8">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-muted-foreground text-sm font-medium">
                {language === "en"
                  ? "Loading regions..."
                  : language === "fr"
                    ? "Chargement des régions..."
                    : language === "es"
                      ? "Cargando regiones..."
                      : "Carregando regiões..."}
              </p>
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
                        {getRegionName(region.key, language)}
                      </h3>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div>
                        Population: {formatNumber(region.totalPopulation)}
                      </div>
                      <div>
                        {region.countryCount} {t.countries.toLowerCase()}
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
              <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 py-8">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground text-sm font-medium">
                  {language === "en"
                    ? "Loading regions..."
                    : language === "fr"
                      ? "Chargement des régions..."
                      : language === "es"
                        ? "Cargando regiones..."
                        : "Carregando regiões..."}
                </p>
              </div>
            ) : paginatedRegions.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">No regions found</p>
              </div>
            ) : (
              paginatedRegions.map((region) => (
                <Card
                  key={region.key}
                  className={`p-4 hover:shadow-md cursor-pointer transition-all group ${
                    hideSearchAndAlphabet ? "mx-0" : ""
                  } ${
                    selectedRegionKey === region.key
                      ? "bg-accent border-2 border-primary"
                      : ""
                  }`}
                  onClick={() => onRegionSelect(region.key)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Globe className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold text-base group-hover:text-primary transition-colors">
                          {getRegionName(region.key, language)}
                        </h3>
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div>
                          Population: {formatNumber(region.totalPopulation)}
                        </div>
                        <div>
                          {region.countryCount} {t.countries.toLowerCase()}
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
