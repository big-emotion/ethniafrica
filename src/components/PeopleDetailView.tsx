"use client";

import { useState, useEffect } from "react";
import { Language } from "@/types/ethnicity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users,
  MapPin,
  BookOpen,
  History,
  Globe,
  AlertTriangle,
  Languages,
  Landmark,
  Heart,
  Calendar,
  ExternalLink,
} from "lucide-react";
import type { PeopleDetail, CountryDistribution } from "@/types/afrik-frontend";
import { getPeople } from "@/lib/afrikLoader";

interface PeopleDetailViewProps {
  peopleId: string;
  language: Language;
  onCountryClick?: (countryId: string) => void;
  onFamilyClick?: (familyId: string) => void;
}

export const PeopleDetailView = ({
  peopleId,
  language,
  onCountryClick,
  onFamilyClick,
}: PeopleDetailViewProps) => {
  const [people, setPeople] = useState<PeopleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const loadPeople = async () => {
      try {
        const data = await getPeople(peopleId);
        if (!cancelled) {
          if (data) {
            setPeople(data);
          } else {
            setError(getNotFoundText());
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Error fetching people:", err);
          setError(getErrorText());
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadPeople();

    return () => {
      cancelled = true;
    };
  }, [peopleId, language]);

  const getNotFoundText = (): string => {
    switch (language) {
      case "en":
        return "People not found";
      case "fr":
        return "Peuple non trouvé";
      case "es":
        return "Pueblo no encontrado";
      case "pt":
        return "Povo não encontrado";
      default:
        return "Peuple non trouvé";
    }
  };

  const getErrorText = (): string => {
    switch (language) {
      case "en":
        return "Failed to load people";
      case "fr":
        return "Échec du chargement du peuple";
      case "es":
        return "Error al cargar el pueblo";
      case "pt":
        return "Falha ao carregar o povo";
      default:
        return "Échec du chargement du peuple";
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
          appellations: "Names",
          ethnicities: "Ethnicities",
          origins: "Origins",
          organization: "Organization",
          languages: "Languages",
          culture: "Culture",
          history: "History",
          demography: "Demography",
          sources: "Sources",
        };
      case "es":
        return {
          appellations: "Nombres",
          ethnicities: "Etnias",
          origins: "Orígenes",
          organization: "Organización",
          languages: "Idiomas",
          culture: "Cultura",
          history: "Historia",
          demography: "Demografía",
          sources: "Fuentes",
        };
      case "pt":
        return {
          appellations: "Nomes",
          ethnicities: "Etnias",
          origins: "Origens",
          organization: "Organização",
          languages: "Línguas",
          culture: "Cultura",
          history: "História",
          demography: "Demografia",
          sources: "Fontes",
        };
      default:
        return {
          appellations: "Appellations",
          ethnicities: "Ethnies",
          origins: "Origines",
          organization: "Organisation",
          languages: "Langues",
          culture: "Culture",
          history: "Histoire",
          demography: "Démographie",
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

  if (error || !people) {
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
            <Users className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">{people.nameMain}</h1>
          </div>
          {people.appellations?.selfAppellation &&
            people.appellations.selfAppellation !== people.nameMain && (
              <p className="text-lg text-muted-foreground italic">
                {people.appellations.selfAppellation}
              </p>
            )}
          <p className="text-sm text-muted-foreground">{people.id}</p>

          {/* Quick stats */}
          <div className="flex flex-wrap gap-2 mt-4">
            {people.languageFamilyId && (
              <Badge
                variant="secondary"
                className={`gap-1 ${
                  onFamilyClick
                    ? "cursor-pointer hover:bg-primary hover:text-primary-foreground"
                    : ""
                }`}
                onClick={() => onFamilyClick?.(people.languageFamilyId)}
              >
                <Languages className="h-3 w-3" />
                {people.languageFamilyName || people.languageFamilyId}
                {onFamilyClick && <ExternalLink className="h-3 w-3 ml-1" />}
              </Badge>
            )}
            {people.demography?.totalPopulation && (
              <Badge variant="secondary" className="gap-1">
                <Users className="h-3 w-3" />
                {formatNumber(people.demography.totalPopulation)}
              </Badge>
            )}
            {people.currentCountries && people.currentCountries.length > 0 && (
              <Badge variant="outline" className="gap-1">
                <MapPin className="h-3 w-3" />
                {people.currentCountries.length}{" "}
                {language === "en" ? "countries" : "pays"}
              </Badge>
            )}
          </div>
        </div>

        {/* Tabs for 8 AFRIK sections + sources */}
        <Tabs defaultValue="appellations" className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-1 justify-start">
            <TabsTrigger value="appellations" className="text-xs">
              {tabLabels.appellations}
            </TabsTrigger>
            <TabsTrigger value="ethnicities" className="text-xs">
              {tabLabels.ethnicities}
            </TabsTrigger>
            <TabsTrigger value="origins" className="text-xs">
              {tabLabels.origins}
            </TabsTrigger>
            <TabsTrigger value="organization" className="text-xs">
              {tabLabels.organization}
            </TabsTrigger>
            <TabsTrigger value="languages" className="text-xs">
              {tabLabels.languages}
            </TabsTrigger>
            <TabsTrigger value="culture" className="text-xs">
              {tabLabels.culture}
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs">
              {tabLabels.history}
            </TabsTrigger>
            <TabsTrigger value="demography" className="text-xs">
              {tabLabels.demography}
            </TabsTrigger>
            <TabsTrigger value="sources" className="text-xs">
              {tabLabels.sources}
            </TabsTrigger>
          </TabsList>

          {/* Section 1: Appellations */}
          <TabsContent value="appellations" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  {language === "en"
                    ? "Names & Appellations"
                    : "Noms et appellations"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {people.appellations ? (
                  <>
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">
                        {language === "en" ? "Main Name" : "Nom principal"}
                      </h4>
                      <p className="font-semibold">
                        {people.appellations.mainName}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">
                        {language === "en"
                          ? "Self-appellation (Endonym)"
                          : "Auto-appellation (Endonyme)"}
                      </h4>
                      <p className="italic">
                        {people.appellations.selfAppellation}
                      </p>
                    </div>
                    {people.appellations.exonyms &&
                      people.appellations.exonyms.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground">
                            {language === "en"
                              ? "Exonyms (Historical names)"
                              : "Exonymes (Noms historiques)"}
                          </h4>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {people.appellations.exonyms.map((name, idx) => (
                              <Badge key={idx} variant="outline">
                                {name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    {people.appellations.originOfExonyms && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">
                          {language === "en"
                            ? "Origin of Exonyms"
                            : "Origine des exonymes"}
                        </h4>
                        <p>{people.appellations.originOfExonyms}</p>
                      </div>
                    )}
                    {people.appellations.whyProblematic && (
                      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 mt-4">
                        <CardContent className="pt-4">
                          <h4 className="font-medium text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            {language === "en"
                              ? "Why some terms are problematic"
                              : "Pourquoi certains termes sont problématiques"}
                          </h4>
                          <p className="text-sm mt-2">
                            {people.appellations.whyProblematic}
                          </p>
                        </CardContent>
                      </Card>
                    )}
                    {people.appellations.contemporaryUsage && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">
                          {language === "en"
                            ? "Contemporary Usage"
                            : "Usage contemporain"}
                        </h4>
                        <p>{people.appellations.contemporaryUsage}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {language === "en"
                      ? "No appellation data available"
                      : "Aucune donnée d'appellation disponible"}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Section 2: Ethnicities */}
          <TabsContent value="ethnicities" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {language === "en"
                    ? "Included Ethnicities"
                    : "Ethnies incluses"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {people.ethnicities && people.ethnicities.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {people.ethnicities.map((ethnicity, idx) => (
                      <Badge key={idx} variant="secondary">
                        {ethnicity}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {language === "en"
                      ? "No ethnicities listed"
                      : "Aucune ethnie répertoriée"}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Section 3: Origins */}
          <TabsContent value="origins" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  {language === "en"
                    ? "Origins, Migrations & Formation"
                    : "Origines, migrations et formation"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {people.origins ? (
                  <>
                    {people.origins.ancientOrigins && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">
                          {language === "en"
                            ? "Ancient Origins"
                            : "Origines anciennes"}
                        </h4>
                        <p>{people.origins.ancientOrigins}</p>
                      </div>
                    )}
                    {people.origins.formationPeriod && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">
                          {language === "en"
                            ? "Formation Period"
                            : "Période de formation"}
                        </h4>
                        <p>{people.origins.formationPeriod}</p>
                      </div>
                    )}
                    {people.origins.migrationRoutes &&
                      people.origins.migrationRoutes.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground">
                            {language === "en"
                              ? "Migration Routes"
                              : "Routes de migration"}
                          </h4>
                          <ul className="list-disc list-inside">
                            {people.origins.migrationRoutes.map(
                              (route, idx) => (
                                <li key={idx}>{route}</li>
                              )
                            )}
                          </ul>
                        </div>
                      )}
                    {people.origins.historicalSettlementZones &&
                      people.origins.historicalSettlementZones.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground">
                            {language === "en"
                              ? "Historical Settlement Zones"
                              : "Zones d'implantation historiques"}
                          </h4>
                          <ul className="list-disc list-inside">
                            {people.origins.historicalSettlementZones.map(
                              (zone, idx) => (
                                <li key={idx}>{zone}</li>
                              )
                            )}
                          </ul>
                        </div>
                      )}
                    {people.origins.unificationsOrDivisions && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">
                          {language === "en"
                            ? "Unifications/Divisions"
                            : "Unifications/Divisions"}
                        </h4>
                        <p>{people.origins.unificationsOrDivisions}</p>
                      </div>
                    )}
                    {people.origins.externalInfluences && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">
                          {language === "en"
                            ? "External Influences"
                            : "Influences extérieures"}
                        </h4>
                        <p>{people.origins.externalInfluences}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {language === "en"
                      ? "No origin data available"
                      : "Aucune donnée d'origine disponible"}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Section 4: Organization */}
          <TabsContent value="organization" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Landmark className="h-5 w-5" />
                  {language === "en"
                    ? "Organization & Structure"
                    : "Organisation et structure"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {people.organization ? (
                  <>
                    {people.organization.traditionalPoliticalSystem && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">
                          {language === "en"
                            ? "Traditional Political System"
                            : "Système politique traditionnel"}
                        </h4>
                        <p>{people.organization.traditionalPoliticalSystem}</p>
                      </div>
                    )}
                    {people.organization.clanOrganization && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">
                          {language === "en"
                            ? "Clan Organization"
                            : "Organisation clanique"}
                        </h4>
                        <p>{people.organization.clanOrganization}</p>
                      </div>
                    )}
                    {people.organization.ageClassSystems && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">
                          {language === "en"
                            ? "Age Class Systems"
                            : "Systèmes de classes d'âge"}
                        </h4>
                        <p>{people.organization.ageClassSystems}</p>
                      </div>
                    )}
                    {people.organization.roleOfLineages && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">
                          {language === "en"
                            ? "Role of Lineages"
                            : "Rôle des lignages"}
                        </h4>
                        <p>{people.organization.roleOfLineages}</p>
                      </div>
                    )}
                    {people.organization.religiousAuthority && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">
                          {language === "en"
                            ? "Religious Authority"
                            : "Autorité religieuse"}
                        </h4>
                        <p>{people.organization.religiousAuthority}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {language === "en"
                      ? "No organization data available"
                      : "Aucune donnée d'organisation disponible"}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Section 5: Languages */}
          <TabsContent value="languages" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Languages className="h-5 w-5" />
                  {language === "en"
                    ? "Languages & Dialects"
                    : "Langues et dialectes"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {people.languages ? (
                  <>
                    {people.languages.mainLanguage && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">
                          {language === "en"
                            ? "Main Language"
                            : "Langue principale"}
                        </h4>
                        <p className="font-semibold">
                          {people.languages.mainLanguage}
                        </p>
                      </div>
                    )}
                    {people.languages.isoCodes &&
                      people.languages.isoCodes.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground">
                            {language === "en" ? "ISO Codes" : "Codes ISO"}
                          </h4>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {people.languages.isoCodes.map((code, idx) => (
                              <Badge key={idx} variant="outline">
                                {code}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    {people.languages.dialects &&
                      people.languages.dialects.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground">
                            {language === "en" ? "Dialects" : "Dialectes"}
                          </h4>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {people.languages.dialects.map((dialect, idx) => (
                              <Badge key={idx} variant="secondary">
                                {dialect}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    {people.languages.vehicularRole && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">
                          {language === "en"
                            ? "Vehicular Role"
                            : "Rôle véhiculaire"}
                        </h4>
                        <p>{people.languages.vehicularRole}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {language === "en"
                      ? "No language data available"
                      : "Aucune donnée linguistique disponible"}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Section 6: Culture */}
          <TabsContent value="culture" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  {language === "en"
                    ? "Culture, Rites & Traditions"
                    : "Culture, rites et traditions"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {people.culture ? (
                  <>
                    {/* A. Divinities */}
                    {people.culture.divinitiesAndSpirits && (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-primary">
                          A.{" "}
                          {language === "en"
                            ? "Divinities & Spirits"
                            : "Divinités et esprits"}
                        </h4>
                        {people.culture.divinitiesAndSpirits.supremeDeity && (
                          <div className="ml-4">
                            <span className="font-medium">
                              {language === "en"
                                ? "Supreme Deity:"
                                : "Divinité suprême :"}
                            </span>{" "}
                            {people.culture.divinitiesAndSpirits.supremeDeity
                              .name ||
                              people.culture.divinitiesAndSpirits.supremeDeity
                                .endonym ||
                              "—"}
                          </div>
                        )}
                        {people.culture.divinitiesAndSpirits.ancestors && (
                          <div className="ml-4">
                            <span className="font-medium">
                              {language === "en" ? "Ancestors:" : "Ancêtres :"}
                            </span>{" "}
                            {people.culture.divinitiesAndSpirits.ancestors
                              .roleOfAncestors || "—"}
                          </div>
                        )}
                      </div>
                    )}

                    {/* B. Cosmology */}
                    {people.culture.cosmology && (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-primary">
                          B. {language === "en" ? "Cosmology" : "Cosmologie"}
                        </h4>
                        {people.culture.cosmology.worldStructure && (
                          <div className="ml-4 space-y-1">
                            <span className="font-medium">
                              {language === "en"
                                ? "World Structure:"
                                : "Structure du monde :"}
                            </span>
                            {people.culture.cosmology.worldStructure
                              .upperWorld && (
                              <p className="text-sm">
                                •{" "}
                                {language === "en"
                                  ? "Upper World:"
                                  : "Monde supérieur :"}{" "}
                                {
                                  people.culture.cosmology.worldStructure
                                    .upperWorld
                                }
                              </p>
                            )}
                            {people.culture.cosmology.worldStructure
                              .terrestrialWorld && (
                              <p className="text-sm">
                                •{" "}
                                {language === "en"
                                  ? "Terrestrial World:"
                                  : "Monde terrestre :"}{" "}
                                {
                                  people.culture.cosmology.worldStructure
                                    .terrestrialWorld
                                }
                              </p>
                            )}
                            {people.culture.cosmology.worldStructure
                              .underworld && (
                              <p className="text-sm">
                                •{" "}
                                {language === "en"
                                  ? "Underworld:"
                                  : "Monde souterrain :"}{" "}
                                {
                                  people.culture.cosmology.worldStructure
                                    .underworld
                                }
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* C. Person & Nature */}
                    {people.culture.personAndNature && (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-primary">
                          C.{" "}
                          {language === "en"
                            ? "Person & Nature"
                            : "Personne et nature"}
                        </h4>
                        {people.culture.personAndNature.totemicAnimals &&
                          people.culture.personAndNature.totemicAnimals.length >
                            0 && (
                            <div className="ml-4 flex flex-wrap gap-1">
                              <span className="font-medium">
                                {language === "en"
                                  ? "Totemic Animals:"
                                  : "Animaux totémiques :"}
                              </span>
                              {people.culture.personAndNature.totemicAnimals.map(
                                (animal, idx) => (
                                  <Badge
                                    key={idx}
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {animal.name}
                                  </Badge>
                                )
                              )}
                            </div>
                          )}
                        {people.culture.personAndNature.sacredPlants &&
                          people.culture.personAndNature.sacredPlants.length >
                            0 && (
                            <div className="ml-4 flex flex-wrap gap-1">
                              <span className="font-medium">
                                {language === "en"
                                  ? "Sacred Plants:"
                                  : "Plantes sacrées :"}
                              </span>
                              {people.culture.personAndNature.sacredPlants.map(
                                (plant, idx) => (
                                  <Badge
                                    key={idx}
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {plant.name}
                                  </Badge>
                                )
                              )}
                            </div>
                          )}
                      </div>
                    )}

                    {/* D. Rites */}
                    {people.culture.ritesAndPractices && (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-primary">
                          D.{" "}
                          {language === "en"
                            ? "Rites & Practices"
                            : "Rites et pratiques"}
                        </h4>
                        {people.culture.ritesAndPractices.initiationRites && (
                          <div className="ml-4">
                            <span className="font-medium">
                              {language === "en"
                                ? "Initiation:"
                                : "Initiation :"}
                            </span>{" "}
                            {people.culture.ritesAndPractices.initiationRites
                              .maleInitiation ||
                              people.culture.ritesAndPractices.initiationRites
                                .femaleInitiation ||
                              "—"}
                          </div>
                        )}
                        {people.culture.ritesAndPractices.funeraryRites && (
                          <div className="ml-4">
                            <span className="font-medium">
                              {language === "en" ? "Funerary:" : "Funéraires :"}
                            </span>{" "}
                            {people.culture.ritesAndPractices.funeraryRites
                              .burial || "—"}
                          </div>
                        )}
                      </div>
                    )}

                    {/* E. Arts */}
                    {people.culture.symbolsAndArts && (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-primary">
                          E.{" "}
                          {language === "en"
                            ? "Arts & Material Culture"
                            : "Arts et culture matérielle"}
                        </h4>
                        {people.culture.symbolsAndArts.artsAndMusic && (
                          <div className="ml-4 space-y-1">
                            {people.culture.symbolsAndArts.artsAndMusic
                              .musicalInstruments && (
                              <p className="text-sm">
                                •{" "}
                                {language === "en"
                                  ? "Instruments:"
                                  : "Instruments :"}{" "}
                                {
                                  people.culture.symbolsAndArts.artsAndMusic
                                    .musicalInstruments
                                }
                              </p>
                            )}
                            {people.culture.symbolsAndArts.artsAndMusic
                              .dances && (
                              <p className="text-sm">
                                • {language === "en" ? "Dances:" : "Danses :"}{" "}
                                {
                                  people.culture.symbolsAndArts.artsAndMusic
                                    .dances
                                }
                              </p>
                            )}
                            {people.culture.symbolsAndArts.artsAndMusic
                              .masks && (
                              <p className="text-sm">
                                • {language === "en" ? "Masks:" : "Masques :"}{" "}
                                {
                                  people.culture.symbolsAndArts.artsAndMusic
                                    .masks
                                }
                              </p>
                            )}
                          </div>
                        )}
                        {people.culture.symbolsAndArts.symbols &&
                          people.culture.symbolsAndArts.symbols.length > 0 && (
                            <div className="ml-4 flex flex-wrap gap-1">
                              <span className="font-medium">
                                {language === "en" ? "Symbols:" : "Symboles :"}
                              </span>
                              {people.culture.symbolsAndArts.symbols.map(
                                (symbol, idx) => (
                                  <Badge
                                    key={idx}
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {symbol.name}
                                  </Badge>
                                )
                              )}
                            </div>
                          )}
                      </div>
                    )}

                    {/* F. Contemporary Spirituality */}
                    {people.culture.contemporarySpirituality && (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-primary">
                          F.{" "}
                          {language === "en"
                            ? "Contemporary Spirituality"
                            : "Spiritualités contemporaines"}
                        </h4>
                        {people.culture.contemporarySpirituality
                          .christianity && (
                          <div className="ml-4">
                            <span className="font-medium">
                              {language === "en"
                                ? "Christianity:"
                                : "Christianisme :"}
                            </span>{" "}
                            {people.culture.contemporarySpirituality
                              .christianity.denominations ||
                              `${people.culture.contemporarySpirituality.christianity.percentageOfPopulation}%` ||
                              "—"}
                          </div>
                        )}
                        {people.culture.contemporarySpirituality.islam && (
                          <div className="ml-4">
                            <span className="font-medium">Islam:</span>{" "}
                            {people.culture.contemporarySpirituality.islam
                              .specificPractices ||
                              `${people.culture.contemporarySpirituality.islam.percentageOfPopulation}%` ||
                              "—"}
                          </div>
                        )}
                        {people.culture.contemporarySpirituality
                          .traditionalReligions && (
                          <div className="ml-4">
                            <span className="font-medium">
                              {language === "en"
                                ? "Traditional:"
                                : "Traditionnelles :"}
                            </span>{" "}
                            {people.culture.contemporarySpirituality
                              .traditionalReligions.persistenceOfPractices ||
                              "—"}
                          </div>
                        )}
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

          {/* Section 7: Historical Role */}
          <TabsContent value="history" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  {language === "en"
                    ? "Historical Role & Regional Interactions"
                    : "Rôle historique et interactions régionales"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {people.historicalRole ? (
                  <>
                    {people.historicalRole.kingdomsOrChiefdoms && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">
                          {language === "en"
                            ? "Kingdoms/Chiefdoms"
                            : "Royaumes/Chefferies"}
                        </h4>
                        <p>{people.historicalRole.kingdomsOrChiefdoms}</p>
                      </div>
                    )}
                    {people.historicalRole.relationsWithNeighbors && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">
                          {language === "en"
                            ? "Relations with Neighbors"
                            : "Relations avec les voisins"}
                        </h4>
                        <p>{people.historicalRole.relationsWithNeighbors}</p>
                      </div>
                    )}
                    {people.historicalRole.conflictsOrAlliances && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">
                          {language === "en"
                            ? "Conflicts/Alliances"
                            : "Conflits/Alliances"}
                        </h4>
                        <p>{people.historicalRole.conflictsOrAlliances}</p>
                      </div>
                    )}
                    {people.historicalRole.diaspora && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">
                          {language === "en" ? "Diaspora" : "Diaspora"}
                        </h4>
                        <p>{people.historicalRole.diaspora}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {language === "en"
                      ? "No historical data available"
                      : "Aucune donnée historique disponible"}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Section 8: Demography */}
          <TabsContent value="demography" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {language === "en"
                    ? "Global Demography"
                    : "Démographie globale"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {people.demography ? (
                  <>
                    {people.demography.totalPopulation && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">
                          {language === "en"
                            ? "Total Population"
                            : "Population totale"}
                        </h4>
                        <p className="text-2xl font-bold">
                          {formatNumber(people.demography.totalPopulation)}
                        </p>
                      </div>
                    )}
                    {people.demography.referenceYear && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">
                          {language === "en"
                            ? "Reference Year"
                            : "Année de référence"}
                        </h4>
                        <p>{people.demography.referenceYear}</p>
                      </div>
                    )}
                    {people.demography.distributionByCountry &&
                      people.demography.distributionByCountry.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground mb-2">
                            {language === "en"
                              ? "Distribution by Country"
                              : "Distribution par pays"}
                          </h4>
                          <div className="space-y-2">
                            {people.demography.distributionByCountry.map(
                              (dist: CountryDistribution, idx) => (
                                <div
                                  key={idx}
                                  className={`flex justify-between items-center py-2 border-b ${
                                    onCountryClick
                                      ? "cursor-pointer hover:bg-muted"
                                      : ""
                                  }`}
                                  onClick={() => onCountryClick?.(dist.country)}
                                >
                                  <span className="flex items-center gap-2">
                                    {dist.country}
                                    {onCountryClick && (
                                      <ExternalLink className="h-3 w-3" />
                                    )}
                                  </span>
                                  <span className="font-medium">
                                    {dist.population
                                      ? formatNumber(dist.population)
                                      : dist.percentage
                                        ? `${dist.percentage}%`
                                        : "—"}
                                  </span>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    {people.demography.source && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">
                          {language === "en" ? "Source" : "Source"}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {people.demography.source}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {language === "en"
                      ? "No demographic data available"
                      : "Aucune donnée démographique disponible"}
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
                {people.sources && people.sources.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1">
                    {people.sources.map((source, idx) => (
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
