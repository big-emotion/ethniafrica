"use client";

import { useState, useMemo, useEffect } from "react";
import { Language } from "@/types/ethnicity";
import { getTranslation, getEthnicityName } from "@/lib/translations";
import { getCountryKey, getEthnicityKey } from "@/lib/entityKeys";
import { getCountryDetails } from "@/lib/datasetLoader";
import { getLocalizedRoute } from "@/lib/routing";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { MapPin, Users, TrendingUp, ExternalLink } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { ShareButton } from "@/components/ShareButton";
import { TopEthnicitiesCard } from "@/components/TopEthnicitiesCard";
import { CountryDescriptionSection } from "@/components/CountryDescriptionSection";
import Link from "next/link";

interface CountryDetailViewProps {
  regionKey: string;
  countryName: string;
  language: Language;
  onEthnicitySelect?: (ethnicityKey: string) => void;
  selectedEthnicityKey?: string | null;
}

type SortField =
  | "name"
  | "population"
  | "percentageInCountry"
  | "percentageInRegion";
type SortDirection = "asc" | "desc";

export const CountryDetailView = ({
  regionKey,
  countryName,
  language,
  onEthnicitySelect,
  selectedEthnicityKey = null,
}: CountryDetailViewProps) => {
  const t = getTranslation(language);
  const isMobile = useIsMobile();
  const [countryData, setCountryData] = useState<{
    name: string;
    population: number;
    percentageInRegion: number;
    percentageInAfrica: number;
    ethnicities: Array<{
      name: string;
      population: number;
      percentageInCountry: number;
      percentageInRegion: number;
    }>;
    description?: string;
    ancientNames?: string[]; // Max 3 pour le résumé
    allAncientNames?: string[]; // Tous pour la section détaillée
    topEthnicities?: Array<{
      name: string;
      languages: string[];
    }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1); // Réinitialiser la pagination à chaque changement de pays
    getCountryDetails(regionKey, countryName).then((data) => {
      setCountryData(data);
      setLoading(false);
    });
  }, [regionKey, countryName]);

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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const sortedEthnicities = useMemo(() => {
    if (!countryData) return [];

    return [...countryData.ethnicities].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "population":
          comparison = a.population - b.population;
          break;
        case "percentageInCountry":
          comparison = a.percentageInCountry - b.percentageInCountry;
          break;
        case "percentageInRegion":
          comparison = a.percentageInRegion - b.percentageInRegion;
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [countryData, sortField, sortDirection]);

  const paginatedEthnicities = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedEthnicities.slice(start, start + itemsPerPage);
  }, [sortedEthnicities, currentPage]);

  const totalPages = Math.ceil(sortedEthnicities.length / itemsPerPage);

  const SortButton = ({
    field,
    currentField,
    currentDirection,
    onSort,
  }: {
    field: SortField;
    currentField: SortField;
    currentDirection: SortDirection;
    onSort: (field: SortField) => void;
  }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-auto p-0 font-normal"
      onClick={() => onSort(field)}
      title="Cliquer pour trier"
    >
      {currentField === field ? (
        currentDirection === "asc" ? (
          <ChevronUp className="h-4 w-4 text-primary" />
        ) : (
          <ChevronDown className="h-4 w-4 text-primary" />
        )
      ) : (
        <div className="flex flex-col h-4 w-4 items-center justify-center opacity-40 hover:opacity-100 transition-opacity">
          <ChevronUp className="h-2 w-2 -mb-0.5" />
          <ChevronDown className="h-2 w-2" />
        </div>
      )}
    </Button>
  );

  if (loading || !countryData) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading country data...</p>
      </div>
    );
  }

  const content = (
    <div className="space-y-6 p-4 md:p-6 w-full">
      {/* En-tête du pays */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <MapPin className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-3xl font-display font-bold text-foreground">
                {countryData.name}
              </h2>
              {(countryData.allAncientNames || countryData.ancientNames) &&
                (countryData.allAncientNames || countryData.ancientNames)!
                  .length > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {language === "en"
                      ? "Ancient names: "
                      : language === "fr"
                        ? "Anciennes appellations : "
                        : language === "es"
                          ? "Nombres antiguos: "
                          : "Nomes antigos: "}
                    {(countryData.allAncientNames || countryData.ancientNames)!
                      .slice(0, 3)
                      .join(", ")}
                  </p>
                )}
            </div>
          </div>
          <ShareButton
            type="country"
            name={getCountryKey(countryData.name) || countryData.name}
            language={language}
            regionKey={regionKey}
          />
        </div>

        <div
          className={`${
            isMobile ? "grid grid-cols-1" : "grid grid-cols-3"
          } gap-4 mt-4`}
        >
          <Card className="p-4 w-full">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">
                {t.population}
              </span>
            </div>
            <p className="text-2xl font-bold break-words">
              {formatNumber(countryData.population)}
            </p>
          </Card>

          <Card className="p-4 w-full">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">
                % {t.region}
              </span>
            </div>
            <p className="text-2xl font-bold break-words">
              {formatPercent(countryData.percentageInRegion)}
            </p>
          </Card>

          <Card className="p-4 w-full">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">
                % {t.inAfrica}
              </span>
            </div>
            <p className="text-2xl font-bold break-words">
              {formatPercent(countryData.percentageInAfrica)}
            </p>
          </Card>
        </div>
      </div>

      <Separator />

      {/* Top 5 ethnies principales */}
      {countryData.topEthnicities && countryData.topEthnicities.length > 0 && (
        <div className="relative">
          <TopEthnicitiesCard
            ethnicities={countryData.topEthnicities}
            language={language}
          />
          <Link
            href={`${getLocalizedRoute(language, "countries")}/${encodeURIComponent(
              getCountryKey(countryData.name) || countryName
            )}`}
            className="absolute top-4 right-4"
          >
            <Button variant="ghost" size="sm" className="gap-2">
              {language === "en"
                ? "See more"
                : language === "fr"
                  ? "Voir plus"
                  : language === "es"
                    ? "Ver más"
                    : "Ver mais"}
              <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      )}

      {/* Section description complète */}
      <CountryDescriptionSection
        description={countryData.description}
        ancientNames={countryData.allAncientNames || countryData.ancientNames}
        language={language}
      />

      {/* Tableau: Ethnies du pays */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">
          {t.ethnicGroups} ({sortedEthnicities.length})
        </h3>

        {isMobile ? (
          // Vue mobile : liste
          <div className="space-y-3">
            {paginatedEthnicities.map((ethnicity) => {
              const ethnicityKey =
                getEthnicityKey(ethnicity.name) || ethnicity.name;
              return (
                <div
                  key={ethnicity.name}
                  className={`p-4 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors ${
                    selectedEthnicityKey === ethnicityKey
                      ? "bg-accent border-2 border-primary"
                      : ""
                  }`}
                  onClick={() => onEthnicitySelect?.(ethnicityKey)}
                >
                  <div className="space-y-2">
                    <div className="font-semibold text-base">
                      {getEthnicityName(ethnicityKey, language)}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">
                          {t.population}:{" "}
                        </span>
                        <span className="font-medium">
                          {formatNumber(ethnicity.population)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          % {t.inCountry}:{" "}
                        </span>
                        <span className="font-medium">
                          {formatPercent(ethnicity.percentageInCountry)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          % {t.region}:{" "}
                        </span>
                        <span className="font-medium">
                          {formatPercent(ethnicity.percentageInRegion)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Vue desktop : tableau
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      {t.ethnicity}
                      <SortButton
                        field="name"
                        currentField={sortField}
                        currentDirection={sortDirection}
                        onSort={handleSort}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {t.population}
                      <SortButton
                        field="population"
                        currentField={sortField}
                        currentDirection={sortDirection}
                        onSort={handleSort}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      % {t.inCountry}
                      <SortButton
                        field="percentageInCountry"
                        currentField={sortField}
                        currentDirection={sortDirection}
                        onSort={handleSort}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      % {t.region}
                      <SortButton
                        field="percentageInRegion"
                        currentField={sortField}
                        currentDirection={sortDirection}
                        onSort={handleSort}
                      />
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedEthnicities.map((ethnicity, index) => {
                  const ethnicityKey =
                    getEthnicityKey(ethnicity.name) || ethnicity.name;
                  return (
                    <TableRow
                      key={ethnicity.name}
                      className={`cursor-pointer hover:bg-muted/50 ${
                        selectedEthnicityKey === ethnicityKey
                          ? "bg-accent border-l-4 border-primary"
                          : ""
                      }`}
                      onClick={() => onEthnicitySelect?.(ethnicityKey)}
                    >
                      <TableCell className="font-medium">
                        {getEthnicityName(ethnicityKey, language)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(ethnicity.population)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatPercent(ethnicity.percentageInCountry)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatPercent(ethnicity.percentageInRegion)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              ←
            </Button>
            <span className="text-sm text-muted-foreground">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              →
            </Button>
          </div>
        )}
      </Card>
    </div>
  );

  if (isMobile) {
    return <div className="w-full">{content}</div>;
  }

  return <ScrollArea className="h-[calc(100vh-12rem)]">{content}</ScrollArea>;
};
