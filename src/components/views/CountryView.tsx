"use client";

import { useCallback } from "react";
import { Language } from "@/types/shared";
import { getTranslation } from "@/lib/translations";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Users,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { normalizeString } from "@/lib/normalize";
import type { CountrySummary } from "@/types/afrik-frontend";
import { getAllCountries } from "@/lib/afrikLoader";
import { useListView } from "@/hooks/use-list-view";
import { AutonymExonymHeading } from "@/components/ui/AutonymExonymHeading";
import { ConfidenceChip } from "@/components/source-transparency/ConfidenceChip";
import { ClassificationBadge } from "@/components/ui/classification-badge";

interface CountryViewProps {
  language: Language;
  onCountrySelect: (country: CountrySummary) => void;
  hideSearchAndAlphabet?: boolean;
  selectedCountryId?: string | null;
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/** Returns a flag emoji for an ISO 3166-1 alpha-3 country code. */
function getFlagEmoji(iso3: string): string {
  // Map ISO-3 to ISO-2 for flag emoji generation (regional indicator letters).
  const map: Record<string, string> = {
    AGO: "AO",
    BEN: "BJ",
    BWA: "BW",
    BFA: "BF",
    BDI: "BI",
    CMR: "CM",
    CPV: "CV",
    CAF: "CF",
    TCD: "TD",
    COM: "KM",
    COD: "CD",
    COG: "CG",
    CIV: "CI",
    DJI: "DJ",
    EGY: "EG",
    GNQ: "GQ",
    ERI: "ER",
    SWZ: "SZ",
    ETH: "ET",
    GAB: "GA",
    GMB: "GM",
    GHA: "GH",
    GIN: "GN",
    GNB: "GW",
    KEN: "KE",
    LSO: "LS",
    LBR: "LR",
    LBY: "LY",
    MDG: "MG",
    MWI: "MW",
    MLI: "ML",
    MRT: "MR",
    MUS: "MU",
    MAR: "MA",
    MOZ: "MZ",
    NAM: "NA",
    NER: "NE",
    NGA: "NG",
    RWA: "RW",
    STP: "ST",
    SEN: "SN",
    SLE: "SL",
    SOM: "SO",
    ZAF: "ZA",
    SSD: "SS",
    SDN: "SD",
    TZA: "TZ",
    TGO: "TG",
    TUN: "TN",
    UGA: "UG",
    ZMB: "ZM",
    ZWE: "ZW",
    DZA: "DZ",
    SYC: "SC",
  };
  const iso2 = map[iso3.toUpperCase()];
  if (!iso2) return "";
  return Array.from(iso2)
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

export const CountryView = ({
  language,
  onCountrySelect,
  hideSearchAndAlphabet = false,
  selectedCountryId = null,
}: CountryViewProps) => {
  const t = getTranslation(language);
  const isMobile = useIsMobile();

  const getDisplayName = useCallback(
    (country: CountrySummary) => country.nameFr,
    []
  );

  const filterFn = useCallback(
    (country: CountrySummary, normalizedSearch: string) =>
      normalizeString(country.nameFr).includes(normalizedSearch) ||
      normalizeString(country.id).includes(normalizedSearch) ||
      (country.nameOfficial
        ? normalizeString(country.nameOfficial).includes(normalizedSearch)
        : false),
    []
  );

  const {
    paginatedItems: paginatedCountries,
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
  } = useListView<CountrySummary>({
    queryKey: ["countries"],
    queryFn: getAllCountries,
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
          Chargement des pays...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 py-8">
        <p className="text-destructive text-sm font-medium">
          Échec du chargement des pays
        </p>
      </div>
    );
  }

  const renderCountryCard = (country: CountrySummary) => {
    const flag = getFlagEmoji(country.id);
    return (
      <Card
        key={country.id}
        className={`p-4 hover:shadow-md cursor-pointer transition-all group ${
          hideSearchAndAlphabet ? "mx-0" : ""
        } ${selectedCountryId === country.id ? "border-2 border-primary" : ""}`}
        onClick={() => onCountrySelect(country)}
      >
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            {flag && (
              <span className="text-2xl leading-none mt-0.5" aria-hidden="true">
                {flag}
              </span>
            )}
            <AutonymExonymHeading
              variant="compact"
              exonym={country.nameFr}
              code={country.id}
              className="group-hover:[&_h3]:text-primary [&_h3]:transition-colors flex-1"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {country.classificationStatus && (
              <ClassificationBadge status={country.classificationStatus} />
            )}
            <ConfidenceChip
              confidenceScore={null}
              sourceCount={null}
              lastHumanAuditAt={null}
              variant="inline"
              ariaSuffix={country.nameFr}
            />
          </div>

          <div className="space-y-0.5 text-sm text-muted-foreground">
            {country.population !== undefined && (
              <div>Population : {formatNumber(country.population)}</div>
            )}
            {country.majorPeoplesCount !== undefined &&
              country.majorPeoplesCount > 0 && (
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {country.majorPeoplesCount} peuples majeurs
                </div>
              )}
          </div>
        </div>
      </Card>
    );
  };

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
          {paginatedCountries.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">Aucun pays trouvé</p>
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
                <p className="text-muted-foreground">Aucun pays trouvé</p>
              </div>
            ) : (
              paginatedCountries.map(renderCountryCard)
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
