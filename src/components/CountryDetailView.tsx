"use client";

import { useState, useMemo, useEffect } from "react";
import { Language } from "@/types/ethnicity";
import { getTranslation, getEthnicityName } from "@/lib/translations";
import { getCountryKey, getEthnicityKey } from "@/lib/entityKeys";
import { getCountryDetails } from "@/lib/datasetLoader";
import { getLocalizedRoute } from "@/lib/routing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  MapPin,
  Users,
  TrendingUp,
  ExternalLink,
  FileText,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown, ChevronRight } from "lucide-react";
import { EthnicityWithSubgroups } from "@/types/ethnicity";
import { useIsMobile } from "@/hooks/use-mobile";
import { ShareButton } from "@/components/ShareButton";
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
    ethnicities: EthnicityWithSubgroups[];
    description?: string;
    ancientNames?: Array<{ period: string; names: string[] }>; // Max 3 entrées pour le résumé
    allAncientNames?: Array<{ period: string; names: string[] }>; // Toutes les entrées pour la section détaillée
    topEthnicities?: Array<{
      name: string;
      languages: string[];
    }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const itemsPerPage = 10;

  useEffect(() => {
    setLoading(true); // Remettre loading à true au début pour éviter d'afficher les anciennes données
    setCurrentPage(1); // Réinitialiser la pagination à chaque changement de pays
    setExpandedGroups(new Set()); // Réinitialiser les groupes expandés
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

  // Fonction pour toggle l'expand/collapse d'un groupe
  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupName)) {
        newSet.delete(groupName);
      } else {
        newSet.add(groupName);
      }
      return newSet;
    });
  };

  // Paginer uniquement sur les groupes parents, puis ajouter leurs sous-groupes
  const paginatedEthnicities = useMemo(() => {
    // Calculer la pagination sur les groupes parents uniquement
    const parentOnlyEthnicities = sortedEthnicities.filter((e) => e.isParent);
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedParents = parentOnlyEthnicities.slice(start, end);

    // Construire la liste avec les groupes parents de la page + leurs sous-groupes si expandés
    const result: Array<{
      ethnicity: EthnicityWithSubgroups;
      isSubgroup: boolean;
      parentName?: string;
    }> = [];

    for (const ethnicity of paginatedParents) {
      result.push({
        ethnicity,
        isSubgroup: false,
      });

      // Si c'est un groupe parent avec sous-groupes et qu'il est expandé, ajouter les sous-groupes
      if (
        ethnicity.subgroups &&
        ethnicity.subgroups.length > 0 &&
        expandedGroups.has(ethnicity.name)
      ) {
        for (const subgroup of ethnicity.subgroups) {
          result.push({
            ethnicity: {
              ...subgroup,
              isParent: false,
              percentageInAfrica: subgroup.percentageInAfrica,
            } as EthnicityWithSubgroups,
            isSubgroup: true,
            parentName: ethnicity.name,
          });
        }
      }
    }

    return result;
  }, [sortedEthnicities, expandedGroups, currentPage, itemsPerPage]);

  // Calculer le nombre total de pages basé uniquement sur les groupes parents
  const totalPages = useMemo(() => {
    const parentOnlyEthnicities = sortedEthnicities.filter((e) => e.isParent);
    return Math.ceil(parentOnlyEthnicities.length / itemsPerPage);
  }, [sortedEthnicities, itemsPerPage]);

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

      {/* 1. Résumé historique (description) */}
      {countryData.description && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {language === "fr"
                ? "Résumé historique"
                : language === "en"
                  ? "Historical Summary"
                  : language === "es"
                    ? "Resumen histórico"
                    : "Resumo histórico"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-line">
              {countryData.description}
            </p>
          </CardContent>
        </Card>
      )}

      {/* 2. Anciennes appellations */}
      <CountryDescriptionSection
        description={undefined}
        ancientNames={countryData.allAncientNames || countryData.ancientNames}
        language={language}
        countrySlug={getCountryKey(countryData.name) || countryName}
      />

      {/* 3. Tableau: Ethnies du pays */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">
          {t.ethnicGroups} ({sortedEthnicities.length})
        </h3>

        {isMobile ? (
          // Vue mobile : liste
          <div className="space-y-3">
            {paginatedEthnicities.map((item) => {
              const ethnicityKey =
                getEthnicityKey(item.ethnicity.name) || item.ethnicity.name;
              const hasSubgroups =
                item.ethnicity.isParent &&
                item.ethnicity.subgroups &&
                item.ethnicity.subgroups.length > 0;
              const isExpanded = expandedGroups.has(item.ethnicity.name);

              return (
                <div key={`${item.ethnicity.name}-${item.isSubgroup}`}>
                  <div
                    className={`p-4 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors ${
                      selectedEthnicityKey === ethnicityKey
                        ? "border-2 border-primary"
                        : ""
                    } ${item.isSubgroup ? "bg-muted/30 border-l-4 border-l-muted-foreground/30" : ""}`}
                    onClick={() => {
                      if (hasSubgroups && !item.isSubgroup) {
                        toggleGroup(item.ethnicity.name);
                      } else {
                        onEthnicitySelect?.(ethnicityKey);
                      }
                    }}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {hasSubgroups && !item.isSubgroup && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleGroup(item.ethnicity.name);
                            }}
                            className="p-1 hover:bg-muted rounded"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                        )}
                        {item.isSubgroup && (
                          <div className="w-6 flex items-center justify-center">
                            <div className="w-0.5 h-4 bg-muted-foreground/30" />
                          </div>
                        )}
                        <div className="font-semibold text-base">
                          {getEthnicityName(ethnicityKey, language)}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">
                            {t.population}:{" "}
                          </span>
                          <span className="font-medium">
                            {formatNumber(item.ethnicity.population)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            % {t.inCountry}:{" "}
                          </span>
                          <span className="font-medium">
                            {formatPercent(item.ethnicity.percentageInCountry)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            % {t.region}:{" "}
                          </span>
                          <span className="font-medium">
                            {formatPercent(item.ethnicity.percentageInRegion)}
                          </span>
                        </div>
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
                {paginatedEthnicities.map((item) => {
                  const ethnicityKey =
                    getEthnicityKey(item.ethnicity.name) || item.ethnicity.name;
                  const hasSubgroups =
                    item.ethnicity.isParent &&
                    item.ethnicity.subgroups &&
                    item.ethnicity.subgroups.length > 0;
                  const isExpanded = expandedGroups.has(item.ethnicity.name);

                  return (
                    <TableRow
                      key={`${item.ethnicity.name}-${item.isSubgroup}`}
                      className={`cursor-pointer hover:bg-muted/50 ${
                        selectedEthnicityKey === ethnicityKey
                          ? "border-l-4 border-primary"
                          : ""
                      } ${item.isSubgroup ? "bg-muted/20" : ""}`}
                      onClick={() => {
                        if (hasSubgroups && !item.isSubgroup) {
                          toggleGroup(item.ethnicity.name);
                        } else {
                          onEthnicitySelect?.(ethnicityKey);
                        }
                      }}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {hasSubgroups && !item.isSubgroup && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleGroup(item.ethnicity.name);
                              }}
                              className="p-1 hover:bg-muted rounded -ml-1"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                          )}
                          {item.isSubgroup && (
                            <div className="w-6 flex items-center justify-center">
                              <div className="w-0.5 h-4 bg-muted-foreground/30" />
                            </div>
                          )}
                          <span
                            className={
                              item.isSubgroup ? "text-muted-foreground" : ""
                            }
                          >
                            {getEthnicityName(ethnicityKey, language)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(item.ethnicity.population)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatPercent(item.ethnicity.percentageInCountry)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatPercent(item.ethnicity.percentageInRegion)}
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

  return <div className="w-full">{content}</div>;
};
