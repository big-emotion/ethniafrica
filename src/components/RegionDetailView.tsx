"use client";

import { useState, useMemo, useEffect } from "react";
import { Language } from "@/types/ethnicity";
import {
  getTranslation,
  getRegionName,
  getCountryName,
} from "@/lib/translations";
import { getCountryKey } from "@/lib/entityKeys";
import { getRegion } from "@/lib/datasetLoader";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Globe, Users, TrendingUp } from "lucide-react";
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

interface RegionDetailViewProps {
  regionKey: string;
  language: Language;
  onCountrySelect?: (countryKey: string, regionKey: string) => void;
  selectedCountryKey?: string | null;
  selectedEthnicityKey?: string | null;
}

type SortField =
  | "name"
  | "population"
  | "percentageInRegion"
  | "percentageInAfrica";
type SortDirection = "asc" | "desc";

export const RegionDetailView = ({
  regionKey,
  language,
  onCountrySelect,
  selectedCountryKey = null,
  selectedEthnicityKey = null,
}: RegionDetailViewProps) => {
  const t = getTranslation(language);
  const isMobile = useIsMobile();
  const [region, setRegion] = useState<{
    name: string;
    totalPopulation: number;
    countries: Record<
      string,
      {
        population: number;
        percentageInRegion: number;
        percentageInAfrica: number;
      }
    >;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // États pour le tri des pays
  const [countrySortField, setCountrySortField] = useState<SortField>("name");
  const [countrySortDirection, setCountrySortDirection] =
    useState<SortDirection>("asc");
  const [countryPage, setCountryPage] = useState(1);

  const itemsPerPage = 10;

  useEffect(() => {
    setCountryPage(1); // Réinitialiser la pagination à chaque changement de région
    const loadData = async () => {
      const regionData = await getRegion(regionKey);
      setRegion(regionData);
      setLoading(false);
    };
    loadData();
  }, [regionKey]);

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

  const handleCountrySort = (field: SortField) => {
    if (countrySortField === field) {
      setCountrySortDirection(countrySortDirection === "asc" ? "desc" : "asc");
    } else {
      setCountrySortField(field);
      setCountrySortDirection("asc");
    }
    setCountryPage(1);
  };

  const sortedCountries = useMemo(() => {
    if (!region) return [];

    const countries = Object.entries(region.countries).map(([name, data]) => ({
      name,
      ...data,
    }));

    return countries.sort((a, b) => {
      let comparison = 0;

      switch (countrySortField) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "population":
          comparison = a.population - b.population;
          break;
        case "percentageInRegion":
          comparison = a.percentageInRegion - b.percentageInRegion;
          break;
        case "percentageInAfrica":
          comparison = a.percentageInAfrica - b.percentageInAfrica;
          break;
      }

      return countrySortDirection === "asc" ? comparison : -comparison;
    });
  }, [region, countrySortField, countrySortDirection]);

  const paginatedCountries = useMemo(() => {
    const start = (countryPage - 1) * itemsPerPage;
    return sortedCountries.slice(start, start + itemsPerPage);
  }, [sortedCountries, countryPage]);

  const totalCountryPages = Math.ceil(sortedCountries.length / itemsPerPage);

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

  if (loading || !region) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading region data...</p>
      </div>
    );
  }

  const content = (
    <div className="space-y-6 p-4 md:p-6 w-full">
      {/* En-tête de la région */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary" />
            <h2 className="text-3xl font-display font-bold text-foreground">
              {getRegionName(regionKey, language)}
            </h2>
          </div>
          <ShareButton
            type="region"
            name={regionKey}
            language={language}
            regionKey={regionKey}
          />
        </div>

        <div
          className={`${
            isMobile ? "grid grid-cols-1" : "grid grid-cols-2"
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
              {formatNumber(region.totalPopulation)}
            </p>
          </Card>

          <Card className="p-4 w-full">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">{t.country}</span>
            </div>
            <p className="text-2xl font-bold break-words">
              {Object.keys(region.countries).length}
            </p>
          </Card>
        </div>
      </div>

      <Separator />

      {/* Tableau 1: Pays de la région */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">
          {t.country} ({sortedCountries.length})
        </h3>

        {isMobile ? (
          // Vue mobile : liste
          <div className="space-y-3">
            {paginatedCountries.map((country) => {
              const countryKey = getCountryKey(country.name) || country.name;
              return (
                <div
                  key={country.name}
                  className={`p-4 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors ${
                    selectedCountryKey === countryKey
                      ? "border-2 border-primary"
                      : ""
                  }`}
                  onClick={() => onCountrySelect?.(countryKey, regionKey)}
                >
                  <div className="space-y-2">
                    <div className="font-semibold text-base">
                      {getCountryName(countryKey, language)}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">
                          {t.population}:{" "}
                        </span>
                        <span className="font-medium">
                          {formatNumber(country.population)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          % {t.region}:{" "}
                        </span>
                        <span className="font-medium">
                          {formatPercent(country.percentageInRegion)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          % {t.inAfrica}:{" "}
                        </span>
                        <span className="font-medium">
                          {formatPercent(country.percentageInAfrica)}
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
                      {t.country}
                      <SortButton
                        field="name"
                        currentField={countrySortField}
                        currentDirection={countrySortDirection}
                        onSort={handleCountrySort}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {t.population}
                      <SortButton
                        field="population"
                        currentField={countrySortField}
                        currentDirection={countrySortDirection}
                        onSort={handleCountrySort}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      % {t.region}
                      <SortButton
                        field="percentageInRegion"
                        currentField={countrySortField}
                        currentDirection={countrySortDirection}
                        onSort={handleCountrySort}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      % {t.inAfrica}
                      <SortButton
                        field="percentageInAfrica"
                        currentField={countrySortField}
                        currentDirection={countrySortDirection}
                        onSort={handleCountrySort}
                      />
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCountries.map((country) => {
                  const countryKey =
                    getCountryKey(country.name) || country.name;
                  return (
                    <TableRow
                      key={country.name}
                      className={`cursor-pointer hover:bg-muted/50 ${
                        selectedCountryKey === countryKey
                          ? "border-l-4 border-primary"
                          : ""
                      }`}
                      onClick={() => onCountrySelect?.(countryKey, regionKey)}
                    >
                      <TableCell className="font-medium">
                        {getCountryName(countryKey, language)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(country.population)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatPercent(country.percentageInRegion)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatPercent(country.percentageInAfrica)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {totalCountryPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCountryPage((p) => Math.max(1, p - 1))}
              disabled={countryPage === 1}
            >
              ←
            </Button>
            <span className="text-sm text-muted-foreground">
              {countryPage} / {totalCountryPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCountryPage((p) => Math.min(totalCountryPages, p + 1))
              }
              disabled={countryPage === totalCountryPages}
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
