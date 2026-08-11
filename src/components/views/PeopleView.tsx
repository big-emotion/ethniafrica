"use client";

import { useDeferredValue, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Language } from "@/types/shared";
import { getTranslation } from "@/lib/translations";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import type { PeopleSummary, LanguageFamilyId } from "@/types/afrik-frontend";
import { getPeoples } from "@/lib/afrikLoader";
import { AutonymExonymHeading } from "@/components/ui/AutonymExonymHeading";
import { ConfidenceChip } from "@/components/source-transparency/ConfidenceChip";
import { ClassificationBadge } from "@/components/ui/classification-badge";
import { cn } from "@/lib/utils";
import { CHARTER_HOVER_LIFT } from "@/components/ui/charter-motion";

interface PeopleViewProps {
  language: Language;
  onPeopleSelect: (people: PeopleSummary) => void;
  hideSearchAndAlphabet?: boolean;
  selectedPeopleId?: string | null;
  languageFamilyId?: LanguageFamilyId;
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const PEOPLES_PER_PAGE = 10;

export const PeopleView = ({
  language,
  onPeopleSelect,
  hideSearchAndAlphabet = false,
  selectedPeopleId = null,
  languageFamilyId,
}: PeopleViewProps) => {
  const t = getTranslation(language);
  const isMobile = useIsMobile();
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search.trim());

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1);
  }, [languageFamilyId]);

  const { data, isLoading, error } = useQuery({
    queryKey: [
      "peoples",
      currentPage,
      deferredSearch,
      selectedLetter,
      languageFamilyId,
    ],
    queryFn: () =>
      getPeoples({
        page: currentPage,
        perPage: PEOPLES_PER_PAGE,
        search: deferredSearch || undefined,
        letter: selectedLetter || undefined,
        languageFamilyId,
      }),
    placeholderData: (previousData) => previousData,
    staleTime: 5 * 60 * 1000,
  });
  const paginatedPeoples = data?.data ?? [];
  const totalPages = data?.meta.totalPages ?? 0;

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleLetterChange = (letter: string | null) => {
    setSelectedLetter(letter);
    setCurrentPage(1);
  };

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
      className={cn(
        "cursor-pointer group rounded-afh-xl p-4",
        CHARTER_HOVER_LIFT,
        hideSearchAndAlphabet && "mx-0",
        selectedPeopleId === people.id &&
          "border-2 border-[color:var(--accent)]"
      )}
      onClick={() => onPeopleSelect(people)}
    >
      <div className="space-y-2">
        <AutonymExonymHeading
          variant="compact"
          exonym={people.nameMain}
          autonym={people.selfAppellation}
          className="group-hover:[&_h2]:text-primary [&_h2]:transition-colors"
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
                variant="ghost"
                size="icon"
                className={cn(
                  "h-11 w-11 rounded-full text-xs",
                  selectedLetter === null
                    ? "bg-[color:var(--accent)] text-white"
                    : "bg-[color:var(--accent-tint)] text-afh-text"
                )}
                onClick={() => handleLetterChange(null)}
              >
                Tous
              </Button>
              {ALPHABET.map((letter) => (
                <Button
                  key={letter}
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-11 w-11 rounded-full text-xs",
                    selectedLetter === letter
                      ? "bg-[color:var(--accent)] text-white"
                      : "bg-[color:var(--accent-tint)] text-afh-text"
                  )}
                  onClick={() => handleLetterChange(letter)}
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
              onChange={(e) => handleSearchChange(e.target.value)}
              className="rounded-full pl-9"
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

      {totalPages > 1 && (
        <div
          className={`flex items-center justify-center gap-2 ${
            hideSearchAndAlphabet ? "px-0" : "px-4"
          } pb-4 flex-shrink-0`}
        >
          <Button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            variant="outline"
            size="icon"
            aria-label="Page précédente"
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
            size="icon"
            aria-label="Page suivante"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
