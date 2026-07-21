"use client";

import { useCallback } from "react";
import { Language } from "@/types/shared";
import { getTranslation } from "@/lib/translations";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { normalizeString } from "@/lib/normalize";
import type { LanguageFamilySummary } from "@/types/afrik-frontend";
import { getAllLanguageFamilies } from "@/lib/afrikLoader";
import { useListView } from "@/hooks/use-list-view";
import { AutonymExonymHeading } from "@/components/ui/AutonymExonymHeading";
import { ConfidenceChip } from "@/components/source-transparency/ConfidenceChip";
import { ClassificationBadge } from "@/components/ui/classification-badge";

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

  const getDisplayName = useCallback(
    (family: LanguageFamilySummary) => family.nameFr,
    []
  );

  const filterFn = useCallback(
    (family: LanguageFamilySummary, normalizedSearch: string) =>
      normalizeString(family.nameFr).includes(normalizedSearch) ||
      normalizeString(family.id).includes(normalizedSearch),
    []
  );

  const {
    paginatedItems: paginatedFamilies,
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
  } = useListView<LanguageFamilySummary>({
    queryKey: ["language-families"],
    queryFn: getAllLanguageFamilies,
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
          Chargement des familles linguistiques...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 py-8">
        <p className="text-destructive text-sm font-medium">
          Échec du chargement des familles linguistiques
        </p>
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
      <div className="space-y-2">
        <AutonymExonymHeading
          variant="compact"
          exonym={family.nameFr}
          code={family.id}
          className="group-hover:[&_h3]:text-primary [&_h3]:transition-colors"
        />

        <div className="flex items-center gap-2 flex-wrap">
          {family.classificationStatus && (
            <ClassificationBadge status={family.classificationStatus} />
          )}
          <ConfidenceChip
            confidenceScore={null}
            sourceCount={null}
            lastHumanAuditAt={null}
            variant="inline"
            ariaSuffix={family.nameFr}
          />
        </div>

        <div className="space-y-0.5 text-sm text-muted-foreground">
          {family.peopleCount !== undefined && (
            <div>{family.peopleCount} peuples</div>
          )}
          {family.totalSpeakers !== undefined && (
            <div>{formatNumber(family.totalSpeakers)} locuteurs</div>
          )}
          {family.geographicArea && <div>{family.geographicArea}</div>}
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
          {paginatedFamilies.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">
                Aucune famille linguistique trouvée
              </p>
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
                <p className="text-muted-foreground">
                  Aucune famille linguistique trouvée
                </p>
              </div>
            ) : (
              paginatedFamilies.map(renderFamilyCard)
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
