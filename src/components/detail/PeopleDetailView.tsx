"use client";

import { useState, useEffect } from "react";
import { Language } from "@/types/shared";
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
import { DemographicsChart } from "@/components/charts/DemographicsChart";

interface PeopleDetailViewProps {
  peopleId: string;
  language: Language;
  onCountryClick?: (countryId: string) => void;
  onFamilyClick?: (familyId: string) => void;
}

// Helper functions outside component to avoid dependency issues
const getNotFoundText = (language: Language): string => {
  return "Peuple non trouvé";
};

const getErrorText = (language: Language): string => {
  return "Échec du chargement du peuple";
};

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
            setError(getNotFoundText(language));
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Error fetching people:", err);
          setError(getErrorText(language));
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

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat("fr-FR").format(
      Math.round(num)
    );
  };

  const getTabLabels = () => {
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
          {error || getNotFoundText(language)}
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
                {"pays"}
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
                  {"Noms et appellations"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {people.appellations ? (
                  <>
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">
                        {"Nom principal"}
                      </h4>
                      <p className="font-semibold">
                        {people.appellations.mainName}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">
                        {"Auto-appellation (Endonyme)"}
                      </h4>
                      <p className="italic">
                        {people.appellations.selfAppellation}
                      </p>
                    </div>
                    {people.appellations.exonyms &&
                      people.appellations.exonyms.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground">
                            {"Exonymes (Noms historiques)"}
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
                          {"Origine des exonymes"}
                        </h4>
                        <p>{people.appellations.originOfExonyms}</p>
                      </div>
                    )}
                    {people.appellations.whyProblematic && (
                      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 mt-4">
                        <CardContent className="pt-4">
                          <h4 className="font-medium text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            {"Pourquoi certains termes sont problématiques"}
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
                          {"Usage contemporain"}
                        </h4>
                        <p>{people.appellations.contemporaryUsage}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {"Aucune donnée d'appellation disponible"}
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
                  {"Ethnies incluses"}
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
                    {"Aucune ethnie répertoriée"}
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
                  {"Origines, migrations et formation"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {people.origins ? (
                  <>
                    {people.origins.ancientOrigins && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">
                          {"Origines anciennes"}
                        </h4>
                        <p>{people.origins.ancientOrigins}</p>
                      </div>
                    )}
                    {people.origins.formationPeriod && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">
                          {"Période de formation"}
                        </h4>
                        <p>{people.origins.formationPeriod}</p>
                      </div>
                    )}
                    {people.origins.migrationRoutes &&
                      people.origins.migrationRoutes.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground">
                            {"Routes de migration"}
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
                            {"Zones d'implantation historiques"}
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
                          {"Unifications/Divisions"}
                        </h4>
                        <p>{people.origins.unificationsOrDivisions}</p>
                      </div>
                    )}
                    {people.origins.externalInfluences && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">
                          {"Influences extérieures"}
                        </h4>
                        <p>{people.origins.externalInfluences}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {"Aucune donnée d'origine disponible"}
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
                  {"Organisation et structure"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {people.organization ? (
                  <>
                    {people.organization.traditionalPoliticalSystem && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">
                          {"Système politique traditionnel"}
                        </h4>
                        <p>{people.organization.traditionalPoliticalSystem}</p>
                      </div>
                    )}
                    {people.organization.clanOrganization && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">
                          {"Organisation clanique"}
                        </h4>
                        <p>{people.organization.clanOrganization}</p>
                      </div>
                    )}
                    {people.organization.ageClassSystems && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">
                          {"Systèmes de classes d'âge"}
                        </h4>
                        <p>{people.organization.ageClassSystems}</p>
                      </div>
                    )}
                    {people.organization.roleOfLineages && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">
                          {"Rôle des lignages"}
                        </h4>
                        <p>{people.organization.roleOfLineages}</p>
                      </div>
                    )}
                    {people.organization.religiousAuthority && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">
                          {"Autorité religieuse"}
                        </h4>
                        <p>{people.organization.religiousAuthority}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {"Aucune donnée d'organisation disponible"}
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
                  {"Langues et dialectes"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {people.languages ? (
                  <>
                    {people.languages.mainLanguage && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">
                          {"Langue principale"}
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
                            {"Codes ISO"}
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
                            {"Dialectes"}
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
                          {"Rôle véhiculaire"}
                        </h4>
                        <p>{people.languages.vehicularRole}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {"Aucune donnée linguistique disponible"}
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
                  {"Culture, rites et traditions"}
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
                          {"Divinités et esprits"}
                        </h4>
                        {people.culture.divinitiesAndSpirits.supremeDeity && (
                          <div className="ml-4">
                            <span className="font-medium">
                              {"Divinité suprême :"}
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
                              {"Ancêtres :"}
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
                          B. {"Cosmologie"}
                        </h4>
                        {people.culture.cosmology.worldStructure && (
                          <div className="ml-4 space-y-1">
                            <span className="font-medium">
                              {"Structure du monde :"}
                            </span>
                            {people.culture.cosmology.worldStructure
                              .upperWorld && (
                              <p className="text-sm">
                                •{" "}
                                {"Monde supérieur :"}{" "}
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
                                {"Monde terrestre :"}{" "}
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
                                {"Monde souterrain :"}{" "}
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
                          {"Personne et nature"}
                        </h4>
                        {people.culture.personAndNature.totemicAnimals &&
                          people.culture.personAndNature.totemicAnimals.length >
                            0 && (
                            <div className="ml-4 flex flex-wrap gap-1">
                              <span className="font-medium">
                                {"Animaux totémiques :"}
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
                                {"Plantes sacrées :"}
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
                          {"Rites et pratiques"}
                        </h4>
                        {people.culture.ritesAndPractices.initiationRites && (
                          <div className="ml-4">
                            <span className="font-medium">
                              {"Initiation :"}
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
                              {"Funéraires :"}
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
                          {"Arts et culture matérielle"}
                        </h4>
                        {people.culture.symbolsAndArts.artsAndMusic && (
                          <div className="ml-4 space-y-1">
                            {people.culture.symbolsAndArts.artsAndMusic
                              .musicalInstruments && (
                              <p className="text-sm">
                                •{" "}
                                {"Instruments :"}{" "}
                                {
                                  people.culture.symbolsAndArts.artsAndMusic
                                    .musicalInstruments
                                }
                              </p>
                            )}
                            {people.culture.symbolsAndArts.artsAndMusic
                              .dances && (
                              <p className="text-sm">
                                • {"Danses :"}{" "}
                                {
                                  people.culture.symbolsAndArts.artsAndMusic
                                    .dances
                                }
                              </p>
                            )}
                            {people.culture.symbolsAndArts.artsAndMusic
                              .masks && (
                              <p className="text-sm">
                                • {"Masques :"}{" "}
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
                                {"Symboles :"}
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
                          {"Spiritualités contemporaines"}
                        </h4>
                        {people.culture.contemporarySpirituality
                          .christianity && (
                          <div className="ml-4">
                            <span className="font-medium">
                              {"Christianisme :"}
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
                              {"Traditionnelles :"}
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
                    {"Aucune donnée culturelle disponible"}
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
                  {"Rôle historique et interactions régionales"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {people.historicalRole ? (
                  <>
                    {people.historicalRole.kingdomsOrChiefdoms && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">
                          {"Royaumes/Chefferies"}
                        </h4>
                        <p>{people.historicalRole.kingdomsOrChiefdoms}</p>
                      </div>
                    )}
                    {people.historicalRole.relationsWithNeighbors && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">
                          {"Relations avec les voisins"}
                        </h4>
                        <p>{people.historicalRole.relationsWithNeighbors}</p>
                      </div>
                    )}
                    {people.historicalRole.conflictsOrAlliances && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">
                          {"Conflits/Alliances"}
                        </h4>
                        <p>{people.historicalRole.conflictsOrAlliances}</p>
                      </div>
                    )}
                    {people.historicalRole.diaspora && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">
                          {"Diaspora"}
                        </h4>
                        <p>{people.historicalRole.diaspora}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {"Aucune donnée historique disponible"}
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
                  {"Démographie globale"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {people.demography ? (
                  <>
                    {people.demography.totalPopulation && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">
                          {"Population totale"}
                        </h4>
                        <p className="text-2xl font-bold">
                          {formatNumber(people.demography.totalPopulation)}
                        </p>
                      </div>
                    )}
                    {people.demography.referenceYear && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">
                          {"Année de référence"}
                        </h4>
                        <p>{people.demography.referenceYear}</p>
                      </div>
                    )}
                    {people.demography.distributionByCountry &&
                      people.demography.distributionByCountry.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground mb-2">
                            {"Distribution par pays"}
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
                          {"Source"}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {people.demography.source}
                        </p>
                      </div>
                    )}
                    {/* Demographics Chart */}
                    {people.demography.distributionByCountry &&
                      people.demography.distributionByCountry.length > 1 && (
                        <div className="mt-6">
                          <DemographicsChart
                            type="peopleDistribution"
                            data={people.demography.distributionByCountry.map(
                              (dist: CountryDistribution) => ({
                                name: dist.country,
                                value: dist.population || 0,
                                percentage: dist.percentage,
                                id: dist.country,
                              })
                            )}
                            title={`Distribution de ${people.nameMain} par pays`}
                          />
                        </div>
                      )}
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {"Aucune donnée démographique disponible"}
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
                  {"Sources"}
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
                    {"Aucune source répertoriée"}
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
