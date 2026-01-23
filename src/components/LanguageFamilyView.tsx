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
  Languages,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { normalizeString, getNormalizedFirstLetter } from "@/lib/normalize";
import type { LanguageFamilySummary } from "@/types/afrik-frontend";
import { getAllLanguageFamilies } from "@/lib/afrikLoader";

interface LanguageFamilyViewProps {
  language: Language;
  onFamilySelect: (family: LanguageFamilySummary) => void;
  hideSearchAndAlphabet?: boolean;
  selectedFamilyId?: string | null;
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export const LanguageFamilyView = ({
  language,
  onFamilySelect,
  hideSearchAndAlphabet = false,
  selectedFamilyId = null,
}: LanguageFamilyViewProps) => {
  const t = getTranslation(language);
  const isMobile = useIsMobile();
  const [search, setSearch] = useState<string>("");
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [families, setFamilies] = useState<LanguageFamilySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const itemsPerPage = 10;
  const maxItemsMobile = 10;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const loadFamilies = async () => {
      // Minimum loading time for UX
      const minLoadingTime = Promise.all([
        new Promise((resolve) => setTimeout(resolve, 300)),
        (async () => {
          try {
            const data = await getAllLanguageFamilies();
            if (!cancelled) {
              setFamilies(data);
            }
          } catch (err) {
            if (!cancelled) {
              console.error("Error fetching language families:", err);
              setError(
                language === "en"
                  ? "Failed to load language families"
                  : language === "fr"
                    ? "Échec du chargement des familles linguistiques"
                    : language === "es"
                      ? "Error al cargar familias lingüísticas"
                      : "Falha ao carregar famílias linguísticas"
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

    loadFamilies();

    return () => {
      cancelled = true;
    };
  }, [language]);

  const getFamilyDisplayName = (family: LanguageFamilySummary): string => {
    if (language === "en" && family.nameEn) {
      return family.nameEn;
    }
    return family.nameFr;
  };

  const filteredFamilies = useMemo(() => {
    const normalizedSearch = normalizeString(search);
    return families.filter((family) => {
      const familyName = getFamilyDisplayName(family);
      const matchesSearch =
        normalizeString(familyName).includes(normalizedSearch) ||
        normalizeString(family.id).includes(normalizedSearch);

      if (selectedLetter) {
        const normalizedFirstLetter = getNormalizedFirstLetter(familyName);
        return matchesSearch && normalizedFirstLetter === selectedLetter;
      }

      return matchesSearch;
    });
  }, [families, search, selectedLetter, language]);

  const paginatedFamilies = useMemo(() => {
    if (isMobile) {
      return filteredFamilies.slice(0, maxItemsMobile);
    }
    const start = (currentPage - 1) * itemsPerPage;
    return filteredFamilies.slice(start, start + itemsPerPage);
  }, [filteredFamilies, currentPage, isMobile, maxItemsMobile]);

  const totalPages = Math.ceil(filteredFamilies.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedLetter, search]);

  const availableLetters = useMemo(() => {
    const letters = new Set<string>();
    families.forEach((family) => {
      const familyName = getFamilyDisplayName(family);
      const normalizedFirstLetter = getNormalizedFirstLetter(familyName);
      if (/[A-Z]/.test(normalizedFirstLetter)) {
        letters.add(normalizedFirstLetter);
      }
    });
    return Array.from(letters).sort();
  }, [families, language]);

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
        return "Loading language families...";
      case "fr":
        return "Chargement des familles linguistiques...";
      case "es":
        return "Cargando familias lingüísticas...";
      case "pt":
        return "Carregando famílias linguísticas...";
      default:
        return "Chargement des familles linguistiques...";
    }
  };

  const getNoResultsText = (): string => {
    switch (language) {
      case "en":
        return "No language families found";
      case "fr":
        return "Aucune famille linguistique trouvée";
      case "es":
        return "No se encontraron familias lingüísticas";
      case "pt":
        return "Nenhuma família linguística encontrada";
      default:
        return "Aucune famille linguistique trouvée";
    }
  };

  const getPeoplesLabel = (): string => {
    switch (language) {
      case "en":
        return "peoples";
      case "fr":
        return "peuples";
      case "es":
        return "pueblos";
      case "pt":
        return "povos";
      default:
        return "peuples";
    }
  };

  const getSpeakersLabel = (): string => {
    switch (language) {
      case "en":
        return "speakers";
      case "fr":
        return "locuteurs";
      case "es":
        return "hablantes";
      case "pt":
        return "falantes";
      default:
        return "locuteurs";
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

  const renderFamilyCard = (family: LanguageFamilySummary) => (
    <Card
      key={family.id}
      className={`p-4 hover:shadow-md cursor-pointer transition-all group ${
        hideSearchAndAlphabet ? "mx-0" : ""
      } ${selectedFamilyId === family.id ? "border-2 border-primary" : ""}`}
      onClick={() => onFamilySelect(family)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Languages className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-base group-hover:text-primary transition-colors">
              {getFamilyDisplayName(family)}
            </h3>
          </div>
          <div className="space-y-1 text-sm text-muted-foreground">
            {family.peopleCount !== undefined && (
              <div>
                {family.peopleCount} {getPeoplesLabel()}
              </div>
            )}
            {family.totalSpeakers !== undefined && (
              <div>
                {formatNumber(family.totalSpeakers)} {getSpeakersLabel()}
              </div>
            )}
            {family.geographicArea && <div>{family.geographicArea}</div>}
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

      {/* Families list */}
      {isMobile ? (
        <div
          className={`space-y-2 ${
            hideSearchAndAlphabet ? "px-0" : "px-4"
          } pb-4`}
        >
          {paginatedFamilies.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">{getNoResultsText()}</p>
            </div>
          ) : (
            paginatedFamilies.map(renderFamilyCard)
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
            {paginatedFamilies.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">{getNoResultsText()}</p>
              </div>
            ) : (
              paginatedFamilies.map(renderFamilyCard)
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
