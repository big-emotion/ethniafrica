"use client";

import { useState, useMemo, useEffect } from "react";
import { Language } from "@/types/ethnicity";
import { getTranslation } from "@/lib/translations";
import { getRegion, getEthnicitiesInRegion } from "@/lib/datasetLoader";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
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

interface RegionDetailViewProps {
  regionKey: string;
  language: Language;
  onCountrySelect?: (country: string, regionKey: string) => void;
}

type SortField = 'name' | 'population' | 'percentageInRegion' | 'percentageInAfrica';
type SortDirection = 'asc' | 'desc';

export const RegionDetailView = ({
  regionKey,
  language,
  onCountrySelect,
}: RegionDetailViewProps) => {
  const t = getTranslation(language);
  const isMobile = useIsMobile();
  const [region, setRegion] = useState<any>(null);
  const [ethnicities, setEthnicities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // États pour le tri des pays
  const [countrySortField, setCountrySortField] = useState<SortField>('name');
  const [countrySortDirection, setCountrySortDirection] = useState<SortDirection>('asc');
  const [countryPage, setCountryPage] = useState(1);
  
  // États pour le tri des ethnies
  const [ethnicitySortField, setEthnicitySortField] = useState<SortField>('name');
  const [ethnicitySortDirection, setEthnicitySortDirection] = useState<SortDirection>('asc');
  const [ethnicityPage, setEthnicityPage] = useState(1);

  const itemsPerPage = 10;

  useEffect(() => {
    const loadData = async () => {
      const regionData = await getRegion(regionKey);
      const ethnicitiesData = await getEthnicitiesInRegion(regionKey);
      setRegion(regionData);
      setEthnicities(ethnicitiesData);
      setLoading(false);
    };
    loadData();
  }, [regionKey]);

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat(
      language === "en" ? "en-US" : language === "fr" ? "fr-FR" : language === "es" ? "es-ES" : "pt-PT"
    ).format(Math.round(num));
  };

  const formatPercent = (pct: number): string => {
    return `${pct.toFixed(2)}%`;
  };

  const handleCountrySort = (field: SortField) => {
    if (countrySortField === field) {
      setCountrySortDirection(countrySortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setCountrySortField(field);
      setCountrySortDirection('asc');
    }
    setCountryPage(1);
  };

  const handleEthnicitySort = (field: SortField) => {
    if (ethnicitySortField === field) {
      setEthnicitySortDirection(ethnicitySortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setEthnicitySortField(field);
      setEthnicitySortDirection('asc');
    }
    setEthnicityPage(1);
  };

  const sortedCountries = useMemo(() => {
    if (!region) return [];
    
    const countries = Object.entries(region.countries).map(([name, data]: [string, any]) => ({
      name,
      ...data,
    }));

    return countries.sort((a, b) => {
      let comparison = 0;
      
      switch (countrySortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'population':
          comparison = a.population - b.population;
          break;
        case 'percentageInRegion':
          comparison = a.percentageInRegion - b.percentageInRegion;
          break;
        case 'percentageInAfrica':
          comparison = a.percentageInAfrica - b.percentageInAfrica;
          break;
      }
      
      return countrySortDirection === 'asc' ? comparison : -comparison;
    });
  }, [region, countrySortField, countrySortDirection]);

  const sortedEthnicities = useMemo(() => {
    return ethnicities.sort((a, b) => {
      let comparison = 0;
      
      switch (ethnicitySortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'population':
          comparison = a.totalPopulationInRegion - b.totalPopulationInRegion;
          break;
        case 'percentageInRegion':
          comparison = a.percentageInRegion - b.percentageInRegion;
          break;
        case 'percentageInAfrica':
          comparison = a.percentageInAfrica - b.percentageInAfrica;
          break;
      }
      
      return ethnicitySortDirection === 'asc' ? comparison : -comparison;
    });
  }, [ethnicities, ethnicitySortField, ethnicitySortDirection]);

  const paginatedCountries = useMemo(() => {
    const start = (countryPage - 1) * itemsPerPage;
    return sortedCountries.slice(start, start + itemsPerPage);
  }, [sortedCountries, countryPage]);

  const paginatedEthnicities = useMemo(() => {
    const start = (ethnicityPage - 1) * itemsPerPage;
    return sortedEthnicities.slice(start, start + itemsPerPage);
  }, [sortedEthnicities, ethnicityPage]);

  const totalCountryPages = Math.ceil(sortedCountries.length / itemsPerPage);
  const totalEthnicityPages = Math.ceil(sortedEthnicities.length / itemsPerPage);

  const SortButton = ({ field, currentField, currentDirection, onSort }: {
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
    >
      {currentField === field && (
        currentDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
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

  return (
    <ScrollArea className="h-[calc(100vh-12rem)]">
      <div className="space-y-6 p-6">
        {/* En-tête de la région */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Globe className="h-6 w-6 text-primary" />
            <h2 className="text-3xl font-display font-bold text-foreground">
              {region.name}
            </h2>
          </div>
          
          <div className={`${isMobile ? "grid grid-cols-1" : "grid grid-cols-2"} gap-4 mt-4`}>
            <Card className="p-4 w-full">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5 text-primary" />
                <span className="text-sm text-muted-foreground">{t.population}</span>
              </div>
              <p className="text-2xl font-bold break-words">{formatNumber(region.totalPopulation)}</p>
            </Card>
            
            <Card className="p-4 w-full">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span className="text-sm text-muted-foreground">{t.country}</span>
              </div>
              <p className="text-2xl font-bold break-words">{Object.keys(region.countries).length}</p>
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
              {paginatedCountries.map((country) => (
                <div
                  key={country.name}
                  className="p-4 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => onCountrySelect?.(country.name, regionKey)}
                >
                  <div className="space-y-2">
                    <div className="font-semibold text-base">{country.name}</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">{t.population}: </span>
                        <span className="font-medium">{formatNumber(country.population)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">% {t.region}: </span>
                        <span className="font-medium">{formatPercent(country.percentageInRegion)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">% {t.inAfrica}: </span>
                        <span className="font-medium">{formatPercent(country.percentageInAfrica)}</span>
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
                  {paginatedCountries.map((country) => (
                    <TableRow
                      key={country.name}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => onCountrySelect?.(country.name, regionKey)}
                    >
                      <TableCell className="font-medium">{country.name}</TableCell>
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
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {totalCountryPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCountryPage(p => Math.max(1, p - 1))}
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
                onClick={() => setCountryPage(p => Math.min(totalCountryPages, p + 1))}
                disabled={countryPage === totalCountryPages}
              >
                →
              </Button>
            </div>
          )}
        </Card>

        {/* Tableau 2: Ethnies de la région */}
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
                  className="p-4 rounded-lg border bg-card"
                >
                  <div className="space-y-2">
                    <div className="font-semibold text-base">{ethnicity.name}</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">% {t.region}: </span>
                        <span className="font-medium">{formatPercent(ethnicity.percentageInRegion)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">% {t.inAfrica}: </span>
                        <span className="font-medium">{formatPercent(ethnicity.percentageInAfrica)}</span>
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
                        <SortButton
                          field="name"
                          currentField={ethnicitySortField}
                          currentDirection={ethnicitySortDirection}
                          onSort={handleEthnicitySort}
                        />
                      </div>
                    </TableHead>
                    <TableHead className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        % {t.region}
                        <SortButton
                          field="percentageInRegion"
                          currentField={ethnicitySortField}
                          currentDirection={ethnicitySortDirection}
                          onSort={handleEthnicitySort}
                        />
                      </div>
                    </TableHead>
                    <TableHead className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        % {t.inAfrica}
                        <SortButton
                          field="percentageInAfrica"
                          currentField={ethnicitySortField}
                          currentDirection={ethnicitySortDirection}
                          onSort={handleEthnicitySort}
                        />
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedEthnicities.map((ethnicity) => (
                    <TableRow key={ethnicity.name}>
                      <TableCell className="font-medium">{ethnicity.name}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatPercent(ethnicity.percentageInRegion)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatPercent(ethnicity.percentageInAfrica)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {totalEthnicityPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEthnicityPage(p => Math.max(1, p - 1))}
                disabled={ethnicityPage === 1}
              >
                ←
              </Button>
              <span className="text-sm text-muted-foreground">
                {ethnicityPage} / {totalEthnicityPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEthnicityPage(p => Math.min(totalEthnicityPages, p + 1))}
                disabled={ethnicityPage === totalEthnicityPages}
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

