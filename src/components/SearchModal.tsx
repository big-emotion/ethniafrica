"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, X, Users, MapPin, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Language } from "@/types/ethnicity";
import { getTranslation } from "@/lib/translations";
import { getAllCountries, getAllEthnicities } from "@/lib/datasetLoader";
import { normalizeString } from "@/lib/normalize";

interface SearchResult {
  type: "ethnicity" | "country";
  name: string;
  region?: string;
  regionName?: string;
  data?: {
    population?: number;
    percentageInAfrica?: number;
    countryCount?: number;
  };
}

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
  language: Language;
  onResultSelect: (result: SearchResult) => void;
}

export const SearchModal = ({
  open,
  onClose,
  language,
  onResultSelect,
}: SearchModalProps) => {
  const t = getTranslation(language);
  const [searchQuery, setSearchQuery] = useState("");
  const [countries, setCountries] = useState<
    Array<{
      name: string;
      region: string;
      regionName: string;
      data: {
        population: number;
        ethnicityCount: number;
      };
    }>
  >([]);
  const [ethnicities, setEthnicities] = useState<
    Array<{
      name: string;
      totalPopulation: number;
      percentageInAfrica: number;
      countryCount: number;
    }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      const loadData = async () => {
        setLoading(true);
        const [countriesData, ethnicitiesData] = await Promise.all([
          getAllCountries(),
          getAllEthnicities(),
        ]);
        setCountries(countriesData);
        setEthnicities(ethnicitiesData);
        setLoading(false);
      };
      loadData();
    }
  }, [open]);

  const results = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = normalizeString(searchQuery.trim());
    const results: SearchResult[] = [];

    // Rechercher dans les pays
    countries.forEach((country) => {
      const normalizedCountryName = normalizeString(country.name);
      const normalizedRegionName = normalizeString(country.regionName);

      if (
        normalizedCountryName.includes(query) ||
        normalizedRegionName.includes(query)
      ) {
        results.push({
          type: "country",
          name: country.name,
          region: country.region,
          regionName: country.regionName,
          data: {
            population: country.data.population,
            countryCount: country.data.ethnicityCount,
          },
        });
      }
    });

    // Rechercher dans les ethnies
    ethnicities.forEach((ethnicity) => {
      const normalizedEthnicityName = normalizeString(ethnicity.name);

      if (normalizedEthnicityName.includes(query)) {
        results.push({
          type: "ethnicity",
          name: ethnicity.name,
          data: {
            population: ethnicity.totalPopulation,
            percentageInAfrica: ethnicity.percentageInAfrica,
            countryCount: ethnicity.countryCount,
          },
        });
      }
    });

    // Trier : pays d'abord, puis ethnies
    return results.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "country" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }, [searchQuery, countries, ethnicities]);

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

  const handleResultClick = (result: SearchResult) => {
    onResultSelect(result);
    onClose();
    setSearchQuery("");
  };

  const dialogTitle =
    language === "en"
      ? "Search"
      : language === "fr"
      ? "Recherche"
      : language === "es"
      ? "Búsqueda"
      : "Pesquisa";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-[80vh] p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-xl font-semibold">
            {dialogTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pt-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder={
                language === "en"
                  ? "Search for an ethnicity or country..."
                  : language === "fr"
                  ? "Rechercher une ethnie ou un pays..."
                  : language === "es"
                  ? "Buscar una etnia o país..."
                  : "Pesquisar uma etnia ou país..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>
        </div>

        <ScrollArea className="flex-1 px-6 pb-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Search className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <p className="text-muted-foreground">
                {searchQuery.trim()
                  ? language === "en"
                    ? "No results found"
                    : language === "fr"
                    ? "Aucun résultat trouvé"
                    : language === "es"
                    ? "No se encontraron resultados"
                    : "Nenhum resultado encontrado"
                  : language === "en"
                  ? "Start typing to search..."
                  : language === "fr"
                  ? "Commencez à taper pour rechercher..."
                  : language === "es"
                  ? "Comience a escribir para buscar..."
                  : "Comece a digitar para pesquisar..."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {results.map((result, index) => (
                <Card
                  key={`${result.type}-${result.name}-${index}`}
                  className="p-4 hover:shadow-md cursor-pointer transition-all"
                  onClick={() => handleResultClick(result)}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {result.type === "country" ? (
                        <MapPin className="h-5 w-5 text-primary" />
                      ) : (
                        <Users className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base mb-1">
                        {result.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {result.type === "country" && result.regionName && (
                          <Badge variant="secondary" className="text-xs">
                            {result.regionName}
                          </Badge>
                        )}
                        {result.type === "ethnicity" && (
                          <Badge variant="secondary" className="text-xs">
                            {t.ethnicity}
                          </Badge>
                        )}
                      </div>
                      {result.data && (
                        <div className="text-sm text-muted-foreground space-y-1">
                          {result.data.population && (
                            <div>
                              {t.population}:{" "}
                              {formatNumber(result.data.population)}
                            </div>
                          )}
                          {result.data.countryCount !== undefined && (
                            <div>
                              {result.data.countryCount}{" "}
                              {result.data.countryCount === 1
                                ? t.country.toLowerCase()
                                : t.countries.toLowerCase()}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
