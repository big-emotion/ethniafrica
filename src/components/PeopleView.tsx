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
  Users,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { normalizeString, getNormalizedFirstLetter } from "@/lib/normalize";
import type { PeopleSummary, LanguageFamilyId } from "@/types/afrik-frontend";
import { getAllPeoples } from "@/lib/afrikLoader";

interface PeopleViewProps {
  language: Language;
  onPeopleSelect: (people: PeopleSummary) => void;
  hideSearchAndAlphabet?: boolean;
  selectedPeopleId?: string | null;
  languageFamilyId?: LanguageFamilyId;
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export const PeopleView = ({
  language,
  onPeopleSelect,
  hideSearchAndAlphabet = false,
  selectedPeopleId = null,
  languageFamilyId,
}: PeopleViewProps) => {
  const t = getTranslation(language);
  const isMobile = useIsMobile();
  const [search, setSearch] = useState<string>("");
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [peoples, setPeoples] = useState<PeopleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const itemsPerPage = 10;
  const maxItemsMobile = 10;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const loadPeoples = async () => {
      // Minimum loading time for UX
      const minLoadingTime = Promise.all([
        new Promise((resolve) => setTimeout(resolve, 300)),
        (async () => {
          try {
            const data = await getAllPeoples();
            if (!cancelled) {
              setPeoples(data);
            }
          } catch (err) {
            if (!cancelled) {
              console.error("Error fetching peoples:", err);
              setError(
                language === "en"
                  ? "Failed to load peoples"
                  : language === "fr"
                    ? "Échec du chargement des peuples"
                    : language === "es"
                      ? "Error al cargar pueblos"
                      : "Falha ao carregar povos"
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

    loadPeoples();

    return () => {
      cancelled = true;
    };
  }, [language]);

  const filteredPeoples = useMemo(() => {
    const normalizedSearch = normalizeString(search);
    return peoples.filter((people) => {
      // Filter by language family if provided
      if (languageFamilyId && people.languageFamilyId !== languageFamilyId) {
        return false;
      }

      const matchesSearch =
        normalizeString(people.nameMain).includes(normalizedSearch) ||
        normalizeString(people.id).includes(normalizedSearch) ||
        (people.selfAppellation &&
          normalizeString(people.selfAppellation).includes(normalizedSearch));

      if (selectedLetter) {
        const normalizedFirstLetter = getNormalizedFirstLetter(people.nameMain);
        return matchesSearch && normalizedFirstLetter === selectedLetter;
      }

      return matchesSearch;
    });
  }, [peoples, search, selectedLetter, languageFamilyId]);

  const paginatedPeoples = useMemo(() => {
    if (isMobile) {
      return filteredPeoples.slice(0, maxItemsMobile);
    }
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPeoples.slice(start, start + itemsPerPage);
  }, [filteredPeoples, currentPage, isMobile, maxItemsMobile]);

  const totalPages = Math.ceil(filteredPeoples.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedLetter, search, languageFamilyId]);

  const availableLetters = useMemo(() => {
    const letters = new Set<string>();
    // Use filtered list (by language family) for available letters
    const listToCheck = languageFamilyId
      ? peoples.filter((p) => p.languageFamilyId === languageFamilyId)
      : peoples;

    listToCheck.forEach((people) => {
      const normalizedFirstLetter = getNormalizedFirstLetter(people.nameMain);
      if (/[A-Z]/.test(normalizedFirstLetter)) {
        letters.add(normalizedFirstLetter);
      }
    });
    return Array.from(letters).sort();
  }, [peoples, languageFamilyId]);

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
        return "Loading peoples...";
      case "fr":
        return "Chargement des peuples...";
      case "es":
        return "Cargando pueblos...";
      case "pt":
        return "Carregando povos...";
      default:
        return "Chargement des peuples...";
    }
  };

  const getNoResultsText = (): string => {
    switch (language) {
      case "en":
        return "No peoples found";
      case "fr":
        return "Aucun peuple trouvé";
      case "es":
        return "No se encontraron pueblos";
      case "pt":
        return "Nenhum povo encontrado";
      default:
        return "Aucun peuple trouvé";
    }
  };

  const getCountriesLabel = (count: number): string => {
    switch (language) {
      case "en":
        return count === 1 ? "country" : "countries";
      case "fr":
        return count === 1 ? "pays" : "pays";
      case "es":
        return count === 1 ? "país" : "países";
      case "pt":
        return count === 1 ? "país" : "países";
      default:
        return "pays";
    }
  };

  const getPopulationLabel = (): string => {
    switch (language) {
      case "en":
        return "population";
      case "fr":
        return "population";
      case "es":
        return "población";
      case "pt":
        return "população";
      default:
        return "population";
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

  const renderPeopleCard = (people: PeopleSummary) => (
    <Card
      key={people.id}
      className={`p-4 hover:shadow-md cursor-pointer transition-all group ${
        hideSearchAndAlphabet ? "mx-0" : ""
      } ${selectedPeopleId === people.id ? "border-2 border-primary" : ""}`}
      onClick={() => onPeopleSelect(people)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-base group-hover:text-primary transition-colors">
              {people.nameMain}
            </h3>
          </div>
          {people.selfAppellation &&
            people.selfAppellation !== people.nameMain && (
              <p className="text-xs text-muted-foreground italic mb-2">
                {people.selfAppellation}
              </p>
            )}
          <div className="space-y-1 text-sm text-muted-foreground">
            {people.languageFamilyName && (
              <div className="text-xs">{people.languageFamilyName}</div>
            )}
            {people.totalPopulation !== undefined && (
              <div>
                {formatNumber(people.totalPopulation)} {getPopulationLabel()}
              </div>
            )}
            {people.countryCount !== undefined && people.countryCount > 0 && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {people.countryCount} {getCountriesLabel(people.countryCount)}
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

      {/* Peoples list */}
      {isMobile ? (
        <div
          className={`space-y-2 ${
            hideSearchAndAlphabet ? "px-0" : "px-4"
          } pb-4`}
        >
          {paginatedPeoples.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">{getNoResultsText()}</p>
            </div>
          ) : (
            paginatedPeoples.map(renderPeopleCard)
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
            {paginatedPeoples.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">{getNoResultsText()}</p>
              </div>
            ) : (
              paginatedPeoples.map(renderPeopleCard)
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
