"use client";

import { useState, useEffect } from "react";
import { Language } from "@/types/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MapPin,
  BookOpen,
  History,
  Globe,
  AlertTriangle,
  Users,
  Crown,
  Calendar,
  ExternalLink,
} from "lucide-react";
import type { CountryDetail } from "@/types/afrik-frontend";
import { getCountry } from "@/lib/afrikLoader";

interface CountryDetailViewV2Props {
  countryId: string; // ISO 3166-1 alpha-3 code
  language: Language;
  onPeopleClick?: (peopleId: string) => void;
}

export const CountryDetailViewV2 = ({
  countryId,
  language,
  onPeopleClick,
}: CountryDetailViewV2Props) => {
  const [country, setCountry] = useState<CountryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const loadCountry = async () => {
      try {
        const data = await getCountry(countryId);
        if (!cancelled) {
          if (data) {
            setCountry(data);
          } else {
            setError(getNotFoundText());
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Error fetching country:", err);
          setError(getErrorText());
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadCountry();

    return () => {
      cancelled = true;
    };
  }, [countryId, language]);

  const getNotFoundText = (): string => {
    switch (language) {
      case "en":
        return "Country not found";
      case "fr":
        return "Pays non trouvé";
      case "es":
        return "País no encontrado";
      case "pt":
        return "País não encontrado";
      default:
        return "Pays non trouvé";
    }
  };

  const getErrorText = (): string => {
    switch (language) {
      case "en":
        return "Failed to load country";
      case "fr":
        return "Échec du chargement du pays";
      case "es":
        return "Error al cargar el país";
      case "pt":
        return "Falha ao carregar o país";
      default:
        return "Échec du chargement du pays";
    }
  };

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

  const getTabLabels = () => {
    switch (language) {
      case "en":
        return {
          general: "General",
          history: "History",
          peoples: "Peoples",
          kingdoms: "Kingdoms",
          culture: "Culture",
          facts: "Historical Facts",
          sources: "Sources",
        };
      case "es":
        return {
          general: "General",
          history: "Historia",
          peoples: "Pueblos",
          kingdoms: "Reinos",
          culture: "Cultura",
          facts: "Hechos históricos",
          sources: "Fuentes",
        };
      case "pt":
        return {
          general: "Geral",
          history: "História",
          peoples: "Povos",
          kingdoms: "Reinos",
          culture: "Cultura",
          facts: "Fatos históricos",
          sources: "Fontes",
        };
      default:
        return {
          general: "Général",
          history: "Histoire",
          peoples: "Peuples",
          kingdoms: "Royaumes",
          culture: "Culture",
          facts: "Faits historiques",
          sources: "Sources",
        };
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (error || !country) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-3 p-6">
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <p className="text-destructive text-sm font-medium">
          {error || getNotFoundText()}
        </p>
      </div>
    );
  }

  const tabLabels = getTabLabels();

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <MapPin className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">{country.nameFr}</h1>
          </div>
          {country.nameOfficial && country.nameOfficial !== country.nameFr && (
            <p className="text-lg text-muted-foreground">
              {country.nameOfficial}
            </p>
          )}
          <p className="text-sm text-muted-foreground">{country.id}</p>

          {/* Quick stats */}
          <div className="flex flex-wrap gap-2 mt-4">
            {country.majorPeoples && country.majorPeoples.length > 0 && (
              <Badge variant="secondary" className="gap-1">
                <Users className="h-3 w-3" />
                {country.majorPeoples.length}{" "}
                {language === "en" ? "major peoples" : "peuples majeurs"}
              </Badge>
            )}
            {country.kingdoms && country.kingdoms.length > 0 && (
              <Badge variant="outline" className="gap-1">
                <Crown className="h-3 w-3" />
                {country.kingdoms.length}{" "}
                {language === "en" ? "kingdoms" : "royaumes"}
              </Badge>
            )}
          </div>
        </div>

        {/* Etymology section (if exists) */}
        {country.etymology && (
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-blue-700 dark:text-blue-400">
                <BookOpen className="h-4 w-4" />
                {language === "en" ? "Etymology" : "Étymologie"}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>{country.etymology}</p>
              {country.nameOriginActor && (
                <p className="text-muted-foreground">
                  <strong>
                    {language === "en" ? "Named by:" : "Nommé par :"}
                  </strong>{" "}
                  {country.nameOriginActor}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tabs for sections */}
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-1 justify-start">
            <TabsTrigger value="general" className="text-xs">
              {tabLabels.general}
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs">
              {tabLabels.history}
            </TabsTrigger>
            <TabsTrigger value="peoples" className="text-xs">
              {tabLabels.peoples}
            </TabsTrigger>
            <TabsTrigger value="kingdoms" className="text-xs">
              {tabLabels.kingdoms}
            </TabsTrigger>
            <TabsTrigger value="culture" className="text-xs">
              {tabLabels.culture}
            </TabsTrigger>
            <TabsTrigger value="facts" className="text-xs">
              {tabLabels.facts}
            </TabsTrigger>
            <TabsTrigger value="sources" className="text-xs">
              {tabLabels.sources}
            </TabsTrigger>
          </TabsList>

          {/* General Info Tab */}
          <TabsContent value="general" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  {language === "en"
                    ? "General Information"
                    : "Informations générales"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">
                    {language === "en" ? "Country Name" : "Nom du pays"}
                  </h4>
                  <p className="font-semibold">{country.nameFr}</p>
                </div>
                {country.nameOfficial && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">
                      {language === "en" ? "Official Name" : "Nom officiel"}
                    </h4>
                    <p>{country.nameOfficial}</p>
                  </div>
                )}
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">
                    {language === "en" ? "ISO Code" : "Code ISO"}
                  </h4>
                  <Badge variant="outline">{country.id}</Badge>
                </div>
                {country.demographics?.peoples &&
                  country.demographics.peoples.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-2">
                        {language === "en" ? "Demographics" : "Démographie"}
                      </h4>
                      <div className="space-y-2">
                        {country.demographics.peoples
                          .slice(0, 5)
                          .map((people, idx) => (
                            <div
                              key={idx}
                              className="flex justify-between items-center py-1 border-b"
                            >
                              <span>{people.name}</span>
                              <span className="text-sm text-muted-foreground">
                                {people.population
                                  ? formatNumber(people.population)
                                  : people.percentageInCountry
                                    ? `${people.percentageInCountry}%`
                                    : "—"}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Historical Names Tab */}
          <TabsContent value="history" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  {language === "en" ? "Historical Names" : "Noms historiques"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {country.historicalNames ? (
                  <>
                    {country.historicalNames.antiquity && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">
                          {language === "en" ? "Antiquity" : "Antiquité"}
                        </h4>
                        <p>{country.historicalNames.antiquity}</p>
                      </div>
                    )}
                    {country.historicalNames.middleAges && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">
                          {language === "en" ? "Middle Ages" : "Moyen Âge"}
                        </h4>
                        <p>{country.historicalNames.middleAges}</p>
                      </div>
                    )}
                    {country.historicalNames.precolonial && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">
                          {language === "en"
                            ? "Pre-colonial Period"
                            : "Période précoloniale"}
                        </h4>
                        <p>{country.historicalNames.precolonial}</p>
                      </div>
                    )}
                    {country.historicalNames.colonization && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">
                          {language === "en"
                            ? "Colonial Period"
                            : "Période coloniale"}
                        </h4>
                        <p>{country.historicalNames.colonization}</p>
                      </div>
                    )}
                    {country.historicalNames.contemporary && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">
                          {language === "en"
                            ? "Contemporary Period"
                            : "Période contemporaine"}
                        </h4>
                        <p>{country.historicalNames.contemporary}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {language === "en"
                      ? "No historical names available"
                      : "Aucun nom historique disponible"}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Peoples Tab */}
          <TabsContent value="peoples" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {language === "en" ? "Major Peoples" : "Peuples majeurs"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {country.majorPeoples && country.majorPeoples.length > 0 ? (
                  <div className="space-y-4">
                    {country.majorPeoples.map((people, idx) => (
                      <div
                        key={idx}
                        className={`p-4 border rounded-lg ${
                          people.peopleId && onPeopleClick
                            ? "cursor-pointer hover:bg-muted transition-colors"
                            : ""
                        }`}
                        onClick={() => {
                          if (people.peopleId && onPeopleClick) {
                            onPeopleClick(people.peopleId);
                          }
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold flex items-center gap-2">
                            {people.name}
                            {people.peopleId && onPeopleClick && (
                              <ExternalLink className="h-3 w-3" />
                            )}
                          </h4>
                          {people.languageFamily && (
                            <Badge variant="secondary" className="text-xs">
                              {people.languageFamily}
                            </Badge>
                          )}
                        </div>
                        {people.selfAppellation &&
                          people.selfAppellation !== people.name && (
                            <p className="text-sm text-muted-foreground italic mt-1">
                              {language === "en"
                                ? "Self-appellation:"
                                : "Auto-appellation :"}{" "}
                              {people.selfAppellation}
                            </p>
                          )}
                        {people.mainRegion && (
                          <p className="text-sm mt-1">
                            <MapPin className="h-3 w-3 inline mr-1" />
                            {people.mainRegion}
                          </p>
                        )}
                        {people.languages && people.languages.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {people.languages.map((lang, langIdx) => (
                              <Badge
                                key={langIdx}
                                variant="outline"
                                className="text-xs"
                              >
                                {lang}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {people.exonyms && people.exonyms.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-2">
                            {language === "en"
                              ? "Also known as:"
                              : "Aussi connu comme :"}{" "}
                            {people.exonyms.join(", ")}
                          </p>
                        )}
                        {people.appellationRemarks && (
                          <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950/20 rounded text-xs">
                            <AlertTriangle className="h-3 w-3 inline mr-1 text-amber-600" />
                            {people.appellationRemarks}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {language === "en"
                      ? "No major peoples listed"
                      : "Aucun peuple majeur répertorié"}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Kingdoms Tab */}
          <TabsContent value="kingdoms" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5" />
                  {language === "en"
                    ? "Kingdoms & Civilizations"
                    : "Royaumes et civilisations"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {country.kingdoms && country.kingdoms.length > 0 ? (
                  <div className="space-y-4">
                    {country.kingdoms.map((kingdom, idx) => (
                      <div key={idx} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold">{kingdom.name}</h4>
                          {kingdom.period && (
                            <Badge variant="outline" className="text-xs">
                              <Calendar className="h-3 w-3 mr-1" />
                              {kingdom.period}
                            </Badge>
                          )}
                        </div>
                        {kingdom.historicalRole && (
                          <p className="text-sm mt-2">
                            {kingdom.historicalRole}
                          </p>
                        )}
                        {kingdom.dominantPeoples &&
                          kingdom.dominantPeoples.length > 0 && (
                            <div className="mt-2">
                              <span className="text-sm text-muted-foreground">
                                {language === "en"
                                  ? "Dominant peoples:"
                                  : "Peuples dominants :"}
                              </span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {kingdom.dominantPeoples.map((people, pIdx) => (
                                  <Badge
                                    key={pIdx}
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {people}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        {kingdom.politicalCenters &&
                          kingdom.politicalCenters.length > 0 && (
                            <div className="mt-2">
                              <span className="text-sm text-muted-foreground">
                                {language === "en"
                                  ? "Political centers:"
                                  : "Centres politiques :"}
                              </span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {kingdom.politicalCenters.map(
                                  (center, cIdx) => (
                                    <Badge
                                      key={cIdx}
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      <MapPin className="h-3 w-3 mr-1" />
                                      {center}
                                    </Badge>
                                  )
                                )}
                              </div>
                            </div>
                          )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {language === "en"
                      ? "No kingdoms listed"
                      : "Aucun royaume répertorié"}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Culture Tab */}
          <TabsContent value="culture" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  {language === "en"
                    ? "Culture & Society"
                    : "Culture et société"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {country.culture ? (
                  <>
                    {country.culture.mainLanguages &&
                      country.culture.mainLanguages.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground">
                            {language === "en"
                              ? "Main Languages"
                              : "Langues principales"}
                          </h4>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {country.culture.mainLanguages.map((lang, idx) => (
                              <Badge key={idx} variant="secondary">
                                {lang.name}
                                {lang.isoCode && (
                                  <span className="text-xs ml-1 opacity-70">
                                    ({lang.isoCode})
                                  </span>
                                )}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    {country.culture.culturalTraditions && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">
                          {language === "en"
                            ? "Cultural Traditions"
                            : "Traditions culturelles"}
                        </h4>
                        <p>{country.culture.culturalTraditions}</p>
                      </div>
                    )}
                    {country.culture.dominantReligions && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">
                          {language === "en"
                            ? "Dominant Religions"
                            : "Religions dominantes"}
                        </h4>
                        <p>{country.culture.dominantReligions}</p>
                      </div>
                    )}
                    {country.culture.lifestyles && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">
                          {language === "en" ? "Lifestyles" : "Modes de vie"}
                        </h4>
                        <p>{country.culture.lifestyles}</p>
                      </div>
                    )}
                    {country.culture.socialOrganization && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">
                          {language === "en"
                            ? "Social Organization"
                            : "Organisation sociale"}
                        </h4>
                        <p>{country.culture.socialOrganization}</p>
                      </div>
                    )}
                    {country.culture.regionalRelations && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">
                          {language === "en"
                            ? "Regional Relations"
                            : "Relations régionales"}
                        </h4>
                        <p>{country.culture.regionalRelations}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {language === "en"
                      ? "No culture data available"
                      : "Aucune donnée culturelle disponible"}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Historical Facts Tab */}
          <TabsContent value="facts" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  {language === "en"
                    ? "Major Historical Facts"
                    : "Faits historiques majeurs"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {country.historicalFacts ? (
                  <>
                    {country.historicalFacts.ancientPeriods && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">
                          {language === "en"
                            ? "Ancient Periods"
                            : "Périodes anciennes"}
                        </h4>
                        <p>{country.historicalFacts.ancientPeriods}</p>
                      </div>
                    )}
                    {country.historicalFacts.middleAges && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">
                          {language === "en" ? "Middle Ages" : "Moyen Âge"}
                        </h4>
                        <p>{country.historicalFacts.middleAges}</p>
                      </div>
                    )}
                    {country.historicalFacts.precolonial && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">
                          {language === "en"
                            ? "Pre-colonial Period"
                            : "Période précoloniale"}
                        </h4>
                        <p>{country.historicalFacts.precolonial}</p>
                      </div>
                    )}
                    {country.historicalFacts.colonization && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">
                          {language === "en" ? "Colonization" : "Colonisation"}
                        </h4>
                        <p>{country.historicalFacts.colonization}</p>
                      </div>
                    )}
                    {country.historicalFacts.independenceStruggle && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">
                          {language === "en"
                            ? "Independence Struggle"
                            : "Lutte pour l'indépendance"}
                        </h4>
                        <p>{country.historicalFacts.independenceStruggle}</p>
                      </div>
                    )}
                    {country.historicalFacts.postIndependence && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">
                          {language === "en"
                            ? "Post-Independence"
                            : "Post-indépendance"}
                        </h4>
                        <p>{country.historicalFacts.postIndependence}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {language === "en"
                      ? "No historical facts available"
                      : "Aucun fait historique disponible"}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sources Tab */}
          <TabsContent value="sources" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  {language === "en" ? "Sources" : "Sources"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {country.sources && country.sources.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1">
                    {country.sources.map((source, idx) => (
                      <li key={idx} className="text-sm">
                        {source}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {language === "en"
                      ? "No sources listed"
                      : "Aucune source répertoriée"}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  );
};
