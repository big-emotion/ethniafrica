"use client";

import { useState, useMemo, useEffect } from "react";
import { Language } from "@/types/ethnicity";
import { getTranslation } from "@/lib/translations";
import { getCountryDetails } from "@/lib/datasetLoader";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { MapPin, Users, TrendingUp } from "lucide-react";
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

interface CountryDetailViewProps {
  regionKey: string;
  countryName: string;
  language: Language;
  onEthnicitySelect?: (ethnicity: string) => void;
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
}: CountryDetailViewProps) => {
  const t = getTranslation(language);
  const isMobile = useIsMobile();
  const [countryData, setCountryData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
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

  const SortButton = ({ field }: { field: SortField }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-auto p-0 font-normal"
      onClick={() => handleSort(field)}
    >
      {sortField === field &&
        (sortDirection === "asc" ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        ))}
    </Button>
  );

  if (loading || !countryData) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading country data...</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-12rem)]">
      <div className="space-y-6 p-6">
        {/* En-tête du pays */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="h-6 w-6 text-primary" />
            <h2 className="text-3xl font-display font-bold text-foreground">
              {countryData.name}
            </h2>
          </div>

          <div className={`${isMobile ? "grid grid-cols-1" : "grid grid-cols-3"} gap-4 mt-4`}>
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

        {/* Tableau: Ethnies du pays */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {t.ethnicGroups} ({sortedEthnicities.length})
          </h3>

          {isMobile ? (
            // Vue mobile : liste
            <div className="space-y-3">
              {paginatedEthnicities.map((ethnicity) => (
                <div
                  key={ethnicity.name}
                  className="p-4 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => onEthnicitySelect?.(ethnicity.name)}
                >
                  <div className="space-y-2">
                    <div className="font-semibold text-base">
                      {ethnicity.name}
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
              ))}
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
                        <SortButton field="name" />
                      </div>
                    </TableHead>
                    <TableHead className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {t.population}
                        <SortButton field="population" />
                      </div>
                    </TableHead>
                    <TableHead className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        % {t.inCountry}
                        <SortButton field="percentageInCountry" />
                      </div>
                    </TableHead>
                    <TableHead className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        % {t.region}
                        <SortButton field="percentageInRegion" />
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedEthnicities.map((ethnicity, index) => (
                    <TableRow
                      key={ethnicity.name}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => onEthnicitySelect?.(ethnicity.name)}
                    >
                      <TableCell className="font-medium">
                        {ethnicity.name}
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
                  ))}
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
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
              >
                →
              </Button>
            </div>
          )}
        </Card>
      </div>
    </ScrollArea>
  );
};
