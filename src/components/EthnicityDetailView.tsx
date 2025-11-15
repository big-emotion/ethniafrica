"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Language, EthnicityGlobalData } from "@/types/ethnicity";
import {
  getTranslation,
  getCountryName,
  getRegionName,
} from "@/lib/translations";
import { getEthnicityKey, getCountryKey, getRegionKey } from "@/lib/entityKeys";
import { getEthnicityGlobalDetails } from "@/lib/datasetLoader";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Users, TrendingUp, Globe, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { ShareButton } from "@/components/ShareButton";

interface EthnicityDetailViewProps {
  ethnicityName: string;
  language: Language;
  onCountrySelect?: (countryKey: string, regionKey: string) => void;
  selectedCountryKey?: string | null;
  selectedRegionKey?: string | null;
}

export const EthnicityDetailView = ({
  ethnicityName,
  language,
  onCountrySelect,
  selectedCountryKey = null,
  selectedRegionKey = null,
}: EthnicityDetailViewProps) => {
  const t = getTranslation(language);
  const isMobile = useIsMobile();
  const [ethnicityData, setEthnicityData] =
    useState<EthnicityGlobalData | null>(null);
  const [loading, setLoading] = useState(true);
  const lastLoadedEthnicityRef = useRef<string | null>(null);

  useEffect(() => {
    // Éviter les rechargements inutiles si l'ethnie n'a pas changé
    if (lastLoadedEthnicityRef.current === ethnicityName) {
      return;
    }

    if (!ethnicityName) {
      console.log("[EthnicityDetailView] No ethnicity name provided");
      setLoading(false);
      setEthnicityData(null);
      return;
    }

    // Marquer cette ethnie comme en cours de chargement
    lastLoadedEthnicityRef.current = ethnicityName;
    setLoading(true);
    setEthnicityData(null);

    console.log("[EthnicityDetailView] Loading ethnicity:", ethnicityName);

    getEthnicityGlobalDetails(ethnicityName)
      .then((data) => {
        console.log(
          "[EthnicityDetailView] Received data:",
          data ? "OK" : "NULL"
        );
        // Ne mettre à jour que si l'ethnie n'a pas changé pendant le chargement
        if (lastLoadedEthnicityRef.current === ethnicityName) {
          if (data) {
            setEthnicityData(data);
          } else {
            console.warn(
              "[EthnicityDetailView] No data returned for:",
              ethnicityName
            );
            setEthnicityData(null);
          }
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error(
          "[EthnicityDetailView] Error loading ethnicity:",
          ethnicityName,
          error
        );
        // Ne mettre à jour que si l'ethnie n'a pas changé pendant le chargement
        if (lastLoadedEthnicityRef.current === ethnicityName) {
          setEthnicityData(null);
          setLoading(false);
          // Réinitialiser pour permettre un nouvel essai
          lastLoadedEthnicityRef.current = null;
        }
      });
  }, [ethnicityName]);

  const formatNumber = useCallback(
    (num: number): string => {
      return new Intl.NumberFormat(
        language === "en"
          ? "en-US"
          : language === "fr"
            ? "fr-FR"
            : language === "es"
              ? "es-ES"
              : "pt-PT"
      ).format(Math.round(num));
    },
    [language]
  );

  const formatPercent = (pct: number): string => {
    return `${pct.toFixed(2)}%`;
  };

  // Calculer les populations totales par région
  const regionPopulations = useMemo(() => {
    if (!ethnicityData) return new Map<string, number>();

    const regions = new Map<string, number>();
    ethnicityData.countries.forEach((item) => {
      const current = regions.get(item.region) || 0;
      regions.set(item.region, current + item.population);
    });

    return regions;
  }, [ethnicityData]);

  // Obtenir les informations des régions avec population totale et pourcentage correct
  const regionInfo = useMemo(() => {
    if (!ethnicityData || !ethnicityData.regions) {
      // Fallback: calculer depuis les données disponibles
      const infoMap = new Map<
        string,
        { population: number; totalPopulation: number }
      >();

      // On doit charger les données de région pour obtenir totalPopulation
      // Pour l'instant, on utilise les données déjà calculées si disponibles
      return null;
    }

    return ethnicityData.regions;
  }, [ethnicityData]);

  // Grouper les pays par région
  const countriesByRegion = useMemo(() => {
    if (!ethnicityData)
      return new Map<string, EthnicityGlobalData["countries"]>();

    const grouped = new Map<string, EthnicityGlobalData["countries"]>();
    ethnicityData.countries.forEach((item) => {
      if (!grouped.has(item.region)) {
        grouped.set(item.region, []);
      }
      grouped.get(item.region)!.push(item);
    });

    // Trier les pays par population décroissante dans chaque région
    grouped.forEach((countries) => {
      countries.sort((a, b) => b.population - a.population);
    });

    return grouped;
  }, [ethnicityData]);

  // Calculer la population totale par région
  const totalPopulationByRegion = Array.from(
    regionPopulations.entries()
  ).reduce((sum, [, pop]) => sum + pop, 0);

  // Générer le résumé
  const summary = useMemo(() => {
    if (!ethnicityData) return "";

    // Trouver la région principale (celle avec le plus de population)
    const mainRegionEntry = Array.from(regionPopulations.entries()).sort(
      (a, b) => b[1] - a[1]
    )[0];
    const mainRegionKey = mainRegionEntry
      ? getRegionKey(mainRegionEntry[0]) || mainRegionEntry[0]
      : "";
    const mainRegion = mainRegionKey
      ? getRegionName(mainRegionKey, language)
      : "";

    // Trouver les pays principaux (les 2-3 premiers par population)
    const sortedCountries = [...ethnicityData.countries].sort(
      (a, b) => b.population - a.population
    );
    const topCountries = sortedCountries.slice(0, 3);

    // Formater la liste des pays avec leurs populations
    const formatCountryWithPop = (
      country: EthnicityGlobalData["countries"][0]
    ) => {
      const popInMillions = country.population / 1000000;
      if (popInMillions >= 1) {
        // Utiliser le format selon la langue (virgule pour fr/es/pt, point pour en)
        const decimalSeparator =
          language === "fr" || language === "es" || language === "pt"
            ? ","
            : ".";
        const formatted = popInMillions
          .toFixed(1)
          .replace(".", decimalSeparator);
        const countryKey = getCountryKey(country.country) || country.country;
        const countryName = getCountryName(countryKey, language);
        return `${countryName} (${formatted} M)`;
      } else {
        const countryKey = getCountryKey(country.country) || country.country;
        const countryName = getCountryName(countryKey, language);
        return `${countryName} (${formatNumber(country.population)})`;
      }
    };

    // Déterminer le connecteur selon la langue
    const connector =
      language === "en"
        ? "and"
        : language === "es"
          ? "y"
          : language === "pt"
            ? "e"
            : "et";

    let countriesList = "";
    if (topCountries.length === 1) {
      countriesList = formatCountryWithPop(topCountries[0]);
    } else if (topCountries.length === 2) {
      countriesList = `${formatCountryWithPop(
        topCountries[0]
      )} ${connector} ${formatCountryWithPop(topCountries[1])}`;
    } else {
      const firstTwo = topCountries
        .slice(0, 2)
        .map(formatCountryWithPop)
        .join(` ${connector} `);
      countriesList = `${firstTwo}, ${connector} ${formatCountryWithPop(
        topCountries[2]
      )}`;
    }

    // Formater la population (en millions avec format selon la langue)
    const popInMillions = ethnicityData.totalPopulation / 1000000;
    const decimalSeparator =
      language === "fr" || language === "es" || language === "pt" ? "," : ".";
    const millionWord =
      language === "en"
        ? "million"
        : language === "es"
          ? "millón"
          : language === "pt"
            ? "milhão"
            : "million";
    const millionsWord =
      language === "en"
        ? "millions"
        : language === "es"
          ? "millones"
          : language === "pt"
            ? "milhões"
            : "millions";
    const personnesWord =
      language === "en"
        ? "people"
        : language === "es"
          ? "personas"
          : language === "pt"
            ? "pessoas"
            : "personnes";

    const populationFormatted =
      popInMillions >= 1
        ? `${popInMillions.toFixed(1).replace(".", decimalSeparator)} ${
            popInMillions >= 2 ? millionsWord : millionWord
          }`
        : `${formatNumber(ethnicityData.totalPopulation)} ${personnesWord}`;

    // Formater le pourcentage avec le bon séparateur décimal
    const percentFormatted = ethnicityData.percentageInAfrica
      .toFixed(2)
      .replace(".", decimalSeparator);

    // Générer le résumé
    return t.ethnicitySummary(
      ethnicityData.name,
      populationFormatted,
      percentFormatted,
      mainRegion,
      countriesList,
      ethnicityData.countries.length
    );
  }, [ethnicityData, regionPopulations, formatNumber, t, language]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">
          {language === "en"
            ? "Loading ethnicity data..."
            : language === "fr"
              ? "Chargement des données de l'ethnie..."
              : language === "es"
                ? "Cargando datos de la etnia..."
                : "Carregando dados da etnia..."}
        </p>
      </div>
    );
  }

  if (!ethnicityData) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">
          {language === "en"
            ? "Ethnicity data not found"
            : language === "fr"
              ? "Données de l'ethnie non trouvées"
              : language === "es"
                ? "Datos de la etnia no encontrados"
                : "Dados da etnia não encontrados"}
        </p>
      </div>
    );
  }

  const content = (
    <div className="space-y-6 p-4 md:p-6 w-full">
      {/* En-tête de l'ethnie */}
      <div>
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">
                <Users className="inline-block h-6 w-6 md:h-8 md:w-8 mr-2 text-primary" />
                {ethnicityData.name}
              </h2>
              <ShareButton
                type="ethnicity"
                name={getEthnicityKey(ethnicityData.name) || ethnicityData.name}
                language={language}
              />
            </div>
            {summary && (
              <p className="text-sm md:text-base text-muted-foreground md:max-w-md leading-relaxed">
                {summary}
              </p>
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* Population totale et pourcentage en Afrique */}
      <Card className="p-4 md:p-6">
        <h3 className="text-lg md:text-xl font-semibold mb-4 flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          {language === "en"
            ? "Total Population"
            : language === "fr"
              ? "Population Totale"
              : language === "es"
                ? "Población Total"
                : "População Total"}
        </h3>
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span className="text-sm md:text-base text-muted-foreground">
              {t.population}:
            </span>
            <span className="text-lg md:text-2xl font-bold">
              {formatNumber(ethnicityData.totalPopulation)}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span className="text-sm md:text-base text-muted-foreground">
              % {t.inAfrica}:
            </span>
            <span className="text-lg md:text-2xl font-bold text-primary">
              {formatPercent(ethnicityData.percentageInAfrica)}
            </span>
          </div>
        </div>
      </Card>

      <Separator />

      {/* Population par région */}
      <Card className="p-4 md:p-6">
        <h3 className="text-lg md:text-xl font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          {language === "en"
            ? "Population by Region"
            : language === "fr"
              ? "Population par Région"
              : language === "es"
                ? "Población por Región"
                : "População por Região"}
        </h3>
        <div className="space-y-3">
          {ethnicityData.regions && ethnicityData.regions.length > 0
            ? ethnicityData.regions.map((regionInfo) => (
                <div
                  key={regionInfo.name}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {regionInfo.name}
                    </Badge>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 gap-1">
                    <div className="text-sm">
                      <span className="text-muted-foreground">
                        {t.population}:{" "}
                      </span>
                      <span className="font-semibold">
                        {formatNumber(regionInfo.ethnicityPopulation)}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">
                        % {t.region}:{" "}
                      </span>
                      <span className="font-semibold">
                        {formatPercent(regionInfo.percentageInRegion)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            : Array.from(regionPopulations.entries()).map(
                ([regionName, population]) => {
                  // Fallback si regions n'est pas disponible
                  const percentageInRegion =
                    (population / ethnicityData.totalPopulation) * 100;
                  return (
                    <div
                      key={regionName}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {regionName}
                        </Badge>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 gap-1">
                        <div className="text-sm">
                          <span className="text-muted-foreground">
                            {t.population}:{" "}
                          </span>
                          <span className="font-semibold">
                            {formatNumber(population)}
                          </span>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">
                            % {t.region}:{" "}
                          </span>
                          <span className="font-semibold">
                            {formatPercent(percentageInRegion)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }
              )}
        </div>
      </Card>

      <Separator />

      {/* Liste des pays */}
      <Card className="p-4 md:p-6">
        <h3 className="text-lg md:text-xl font-semibold mb-4 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          {t.countries} ({ethnicityData.countries.length})
        </h3>
        <div className="space-y-4">
          {Array.from(countriesByRegion.entries()).map(
            ([regionName, countries]) => {
              const regionKey = getRegionKey(regionName) || regionName;
              const translatedRegionName = getRegionName(regionKey, language);
              return (
                <div key={regionName} className="space-y-3">
                  <h4 className="text-base md:text-lg font-medium text-muted-foreground">
                    {translatedRegionName}
                  </h4>
                  <div className="space-y-2 pl-2 md:pl-4">
                    {countries.map((country) => {
                      const countryKey =
                        getCountryKey(country.country) || country.country;
                      const countryName = getCountryName(countryKey, language);
                      return (
                        <div
                          key={`${country.country}-${country.region}`}
                          className={`p-3 md:p-4 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors`}
                          onClick={() =>
                            onCountrySelect?.(countryKey, regionKey)
                          }
                        >
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-base md:text-lg">
                                {countryName}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
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
                                  % {t.inCountry}:{" "}
                                </span>
                                <span className="font-medium">
                                  {formatPercent(country.percentageInCountry)}
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
                </div>
              );
            }
          )}
        </div>
      </Card>
    </div>
  );

  return <div className="w-full">{content}</div>;
};
