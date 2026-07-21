"use client";

import { useCallback } from "react";
import { Language } from "@/types/shared";
import { getTranslation } from "@/lib/translations";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { normalizeString } from "@/lib/normalize";
import type { PeopleSummary, LanguageFamilyId } from "@/types/afrik-frontend";
import { getAllPeoples } from "@/lib/afrikLoader";
import { useListView } from "@/hooks/use-list-view";
import { AutonymExonymHeading } from "@/components/ui/autonym-exonym-heading";
import { ConfidenceChip } from "@/components/source-transparency/ConfidenceChip";
import { ClassificationBadge } from "@/components/ui/classification-badge";

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

  const getDisplayName = useCallback(
    (people: PeopleSummary) => people.nameMain,
    []
  );

  const filterFn = useCallback(
    (people: PeopleSummary, normalizedSearch: string) => {
      if (languageFamilyId && people.languageFamilyId !== languageFamilyId) {
        return false;
      }
      return (
        normalizeString(people.nameMain).includes(normalizedSearch) ||
        normalizeString(people.id).includes(normalizedSearch) ||
        (people.selfAppellation
          ? normalizeString(people.selfAppellation).includes(normalizedSearch)
          : false)
      );
    },
    [languageFamilyId]
  );

  const {
    paginatedItems: paginatedPeoples,
    totalPages,
    currentPage,
    setCurrentPage,
    search,
    setSearch,
    selectedLetter,
    setSelectedLetter,
    availableLetters,
    isLoading,
    error,
  } = useListView<PeopleSummary>({
    queryKey: ["peoples"],
    queryFn: getAllPeoples,
    getDisplayName,
    filterFn,
    isMobile,
  });

  const formatNumber = (num: number): string =>
    new Intl.NumberFormat("fr-FR").format(Math.round(num));

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 py-8">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm font-medium">
          Chargement des peuples...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 py-8">
        <p className="text-destructive text-sm font-medium">
          Échec du chargement des peuples
        </p>
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
      <div className="space-y-2">
        <AutonymExonymHeading
          exonym={people.nameMain}
          autonym={people.selfAppellation}
          className="group-hover:[&_h3]:text-primary [&_h3]:transition-colors"
        />

        <div className="flex items-center gap-2 flex-wrap">
          {people.classificationStatus && (
            <ClassificationBadge status={people.classificationStatus} />
          )}
          <ConfidenceChip
            confidenceScore={null}
            sourceCount={null}
            lastHumanAuditAt={null}
            variant="inline"
            ariaSuffix={people.nameMain}
          />
        </div>

        <div className="space-y-1 text-sm text-muted-foreground">
          {people.languageFamilyName && (
            <div className="text-xs">{people.languageFamilyName}</div>
          )}
          {people.totalPopulation !== undefined && (
            <div>{formatNumber(people.totalPopulation)} population</div>
          )}
          {people.currentCountries && people.currentCountries.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {people.currentCountries.slice(0, 4).map((iso) => (
                <Badge
                  key={iso}
                  variant="secondary"
                  className="text-xs px-1.5 py-0"
                >
                  {iso}
                </Badge>
              ))}
              {people.currentCountries.length > 4 && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                  +{people.currentCountries.length - 4}
                </Badge>
              )}
            </div>
          )}
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

      {isMobile ? (
        <div
          className={`space-y-2 ${
            hideSearchAndAlphabet ? "px-0" : "px-4"
          } pb-4`}
        >
          {paginatedPeoples.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">Aucun peuple trouvé</p>
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
                <p className="text-muted-foreground">Aucun peuple trouvé</p>
              </div>
            ) : (
              paginatedPeoples.map(renderPeopleCard)
            )}
          </div>
        </ScrollArea>
      )}

      {!isMobile && totalPages > 1 && (
        <div
          className={`flex items-center justify-center gap-2 ${
            hideSearchAndAlphabet ? "px-0" : "px-4"
          } pb-4 flex-shrink-0`}
        >
          <Button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
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
            onClick={() =>
              setCurrentPage(Math.min(totalPages, currentPage + 1))
            }
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
