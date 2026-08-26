"use client";

import { lazy, Suspense, useState, useEffect } from "react";
import { Language } from "@/types/shared";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ClassificationBadge } from "@/components/ui/classification-badge";
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
import { SourceVerifyBadge } from "@/components/ui/source-verify-badge";
import { FlagTarget } from "@/components/flags/FlagTarget";

const DemographicsChart = lazy(() =>
  import("@/components/charts/DemographicsChart").then((module) => ({
    default: module.DemographicsChart,
  }))
);

interface PeopleDetailViewProps {
  peopleId: string;
  language: Language;
  initialData?: PeopleDetail;
  initialSourceFlag?: boolean;
  onCountryClick?: (countryId: string) => void;
  onFamilyClick?: (familyId: string) => void;
  /** Cloudflare Turnstile public site key, required to enable the live FlagTarget wiring on section headings (AC5). */
  turnstileSiteKey?: string;
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
  initialData,
  initialSourceFlag,
  onCountryClick,
  onFamilyClick,
  turnstileSiteKey,
}: PeopleDetailViewProps) => {
  const matchingInitialData = initialData?.id === peopleId ? initialData : null;
  const [people, setPeople] = useState<PeopleDetail | null>(
    matchingInitialData
  );
  const [loading, setLoading] = useState(!matchingInitialData);
  const [error, setError] = useState<string | null>(null);
  const sourceFlag = initialSourceFlag ?? false;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const loadPeople = async () => {
      if (initialData?.id === peopleId) {
        setPeople(initialData);
        setLoading(false);
        return;
      }

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
  }, [peopleId, initialData, language]);

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat("fr-FR").format(Math.round(num));
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
          <div className="flex flex-wrap items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">{people.nameMain}</h1>
            <ClassificationBadge status={people.classificationStatus} />
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
                {people.currentCountries.length} {"pays"}
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
                <h2 className="flex items-center gap-2 text-2xl font-semibold leading-none tracking-tight">
                  <BookOpen className="h-5 w-5" />
                  {"Noms et appellations"}
                </h2>
              </CardHeader>
              <CardContent className="space-y-4">
                {people.appellations ? (
                  <>
                    <div>
                      <h3 className="font-medium text-sm text-muted-foreground">
                        {"Nom principal"}
                      </h3>
                      <p className="font-semibold">
                        {people.appellations.mainName}
                      </p>
                    </div>
                    <div>
                      <h3 className="font-medium text-sm text-muted-foreground">
                        {"Auto-appellation (Endonyme)"}
                      </h3>
                      <p className="italic">
                        {people.appellations.selfAppellation}
                      </p>
                    </div>
                    {people.appellations.exonyms &&
                      people.appellations.exonyms.length > 0 && (
                        <div>
                          <h3 className="font-medium text-sm text-muted-foreground">
                            {"Exonymes (Noms historiques)"}
                          </h3>
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
                        <h3 className="font-medium text-sm text-muted-foreground">
                          {"Origine des exonymes"}
                        </h3>
                        <p>{people.appellations.originOfExonyms}</p>
                      </div>
                    )}
                    {people.appellations.whyProblematic && (
                      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 mt-4">
                        <CardContent className="pt-4">
                          <h3 className="font-medium text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            {"Pourquoi certains termes sont problématiques"}
                          </h3>
                          <p className="text-sm mt-2">
                            {people.appellations.whyProblematic}
                          </p>
                        </CardContent>
                      </Card>
                    )}
                    {people.appellations.contemporaryUsage && (
                      <div>
                        <h3 className="font-medium text-sm text-muted-foreground">
                          {"Usage contemporain"}
                        </h3>
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
                <h2 className="flex items-center gap-2 text-2xl font-semibold leading-none tracking-tight">
                  <Users className="h-5 w-5" />
                  {"Ethnies incluses"}
                </h2>
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
                <h2 className="flex items-center gap-2 text-2xl font-semibold leading-none tracking-tight">
                  <Globe className="h-5 w-5" />
                  {"Origines, migrations et formation"}
                </h2>
              </CardHeader>
              <CardContent className="space-y-4">
                {people.origins ? (
                  <>
                    {people.origins.ancientOrigins && (
                      <div>
                        <h3 className="font-medium text-sm text-muted-foreground">
                          {"Origines anciennes"}
                        </h3>
                        <p>{people.origins.ancientOrigins}</p>
                      </div>
                    )}
                    {people.origins.formationPeriod && (
                      <div>
                        <h3 className="font-medium text-sm text-muted-foreground">
                          {"Période de formation"}
                        </h3>
                        <p>{people.origins.formationPeriod}</p>
                      </div>
                    )}
                    {people.origins.migrationRoutes &&
                      people.origins.migrationRoutes.length > 0 && (
                        <div>
                          <h3 className="font-medium text-sm text-muted-foreground">
                            {"Routes de migration"}
                          </h3>
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
                          <h3 className="font-medium text-sm text-muted-foreground">
                            {"Zones d'implantation historiques"}
                          </h3>
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
                        <h3 className="font-medium text-sm text-muted-foreground">
                          {"Unifications/Divisions"}
                        </h3>
                        <p>{people.origins.unificationsOrDivisions}</p>
                      </div>
                    )}
                    {people.origins.externalInfluences && (
                      <div>
                        <h3 className="font-medium text-sm text-muted-foreground">
                          {"Influences extérieures"}
                        </h3>
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
                <h2 className="flex items-center gap-2 text-2xl font-semibold leading-none tracking-tight">
                  <Landmark className="h-5 w-5" />
                  {"Organisation et structure"}
                </h2>
              </CardHeader>
              <CardContent className="space-y-4">
                {people.organization ? (
                  <>
                    {people.organization.traditionalPoliticalSystem && (
                      <div>
                        <h3 className="font-medium text-sm text-muted-foreground">
                          {"Système politique traditionnel"}
                        </h3>
                        <p>{people.organization.traditionalPoliticalSystem}</p>
                      </div>
                    )}
                    {people.organization.clanOrganization && (
                      <div>
                        <h3 className="font-medium text-sm text-muted-foreground">
                          {"Organisation clanique"}
                        </h3>
                        <p>{people.organization.clanOrganization}</p>
                      </div>
                    )}
                    {people.organization.ageClassSystems && (
                      <div>
                        <h3 className="font-medium text-sm text-muted-foreground">
                          {"Systèmes de classes d'âge"}
                        </h3>
                        <p>{people.organization.ageClassSystems}</p>
                      </div>
                    )}
                    {people.organization.roleOfLineages && (
                      <div>
                        <h3 className="font-medium text-sm text-muted-foreground">
                          {"Rôle des lignages"}
                        </h3>
                        <p>{people.organization.roleOfLineages}</p>
                      </div>
                    )}
                    {people.organization.religiousAuthority && (
                      <div>
                        <h3 className="font-medium text-sm text-muted-foreground">
                          {"Autorité religieuse"}
                        </h3>
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
                <h2 className="flex items-center gap-2 text-2xl font-semibold leading-none tracking-tight">
                  <Languages className="h-5 w-5" />
                  {"Langues et dialectes"}
                </h2>
              </CardHeader>
              <CardContent className="space-y-4">
                {people.languages ? (
                  <>
                    {people.languages.mainLanguage && (
                      <div>
                        <h3 className="font-medium text-sm text-muted-foreground">
                          {"Langue principale"}
                        </h3>
                        <p className="font-semibold">
                          {people.languages.mainLanguage}
                        </p>
                      </div>
                    )}
                    {people.languages.isoCodes &&
                      people.languages.isoCodes.length > 0 && (
                        <div>
                          <h3 className="font-medium text-sm text-muted-foreground">
                            {"Codes ISO"}
                          </h3>
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
                          <h3 className="font-medium text-sm text-muted-foreground">
                            {"Dialectes"}
                          </h3>
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
                        <h3 className="font-medium text-sm text-muted-foreground">
                          {"Rôle véhiculaire"}
                        </h3>
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
                <h2 className="flex items-center gap-2 text-2xl font-semibold leading-none tracking-tight">
                  <Heart className="h-5 w-5" />
                  {"Culture, rites et traditions"}
                </h2>
                <div data-testid="section-flag-target-culture" className="mt-2">
                  {turnstileSiteKey ? (
                    <FlagTarget
                      target={{
                        type: "fiche_section",
                        id: peopleId,
                        fieldPath: "culture",
                      }}
                      turnstileSiteKey={turnstileSiteKey}
                      triggerLabel="Signaler cette section"
                      className="w-auto text-xs"
                    />
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="rounded-md border border-dashed px-2 py-1 text-xs text-muted-foreground"
                      aria-label="Signaler cette section — bientôt disponible"
                    >
                      Signaler cette section (bientôt disponible)
                    </button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {people.culture ? (
                  <>
                    {/* A. Divinities */}
                    {people.culture.divinitiesAndSpirits && (
                      <div className="space-y-2">
                        <h3 className="font-semibold text-primary">
                          A. {"Divinités et esprits"}
                        </h3>
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
                            <span className="font-medium">{"Ancêtres :"}</span>{" "}
                            {people.culture.divinitiesAndSpirits.ancestors
                              .roleOfAncestors || "—"}
                          </div>
                        )}
                      </div>
                    )}

                    {/* B. Cosmology */}
                    {people.culture.cosmology && (
                      <div className="space-y-2">
                        <h3 className="font-semibold text-primary">
                          B. {"Cosmologie"}
                        </h3>
                        {people.culture.cosmology.worldStructure && (
                          <div className="ml-4 space-y-1">
                            <span className="font-medium">
                              {"Structure du monde :"}
                            </span>
                            {people.culture.cosmology.worldStructure
                              .upperWorld && (
                              <p className="text-sm">
                                • {"Monde supérieur :"}{" "}
                                {
                                  people.culture.cosmology.worldStructure
                                    .upperWorld
                                }
                              </p>
                            )}
                            {people.culture.cosmology.worldStructure
                              .terrestrialWorld && (
                              <p className="text-sm">
                                • {"Monde terrestre :"}{" "}
                                {
                                  people.culture.cosmology.worldStructure
                                    .terrestrialWorld
                                }
                              </p>
                            )}
                            {people.culture.cosmology.worldStructure
                              .underworld && (
                              <p className="text-sm">
                                • {"Monde souterrain :"}{" "}
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
                        <h3 className="font-semibold text-primary">
                          C. {"Personne et nature"}
                        </h3>
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
                        <h3 className="font-semibold text-primary">
                          D. {"Rites et pratiques"}
                        </h3>
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
                        <h3 className="font-semibold text-primary">
                          E. {"Arts et culture matérielle"}
                        </h3>
                        {people.culture.symbolsAndArts.artsAndMusic && (
                          <div className="ml-4 space-y-1">
                            {people.culture.symbolsAndArts.artsAndMusic
                              .musicalInstruments && (
                              <p className="text-sm">
                                • {"Instruments :"}{" "}
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
                        <h3 className="font-semibold text-primary">
                          F. {"Spiritualités contemporaines"}
                        </h3>
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
                <h2 className="flex items-center gap-2 text-2xl font-semibold leading-none tracking-tight">
                  <History className="h-5 w-5" />
                  {"Rôle historique et interactions régionales"}
                </h2>
              </CardHeader>
              <CardContent className="space-y-4">
                {people.historicalRole ? (
                  <>
                    {people.historicalRole.kingdomsOrChiefdoms && (
                      <div>
                        <h3 className="font-medium text-sm text-muted-foreground">
                          {"Royaumes/Chefferies"}
                        </h3>
                        <p>{people.historicalRole.kingdomsOrChiefdoms}</p>
                      </div>
                    )}
                    {people.historicalRole.relationsWithNeighbors && (
                      <div>
                        <h3 className="font-medium text-sm text-muted-foreground">
                          {"Relations avec les voisins"}
                        </h3>
                        <p>{people.historicalRole.relationsWithNeighbors}</p>
                      </div>
                    )}
                    {people.historicalRole.conflictsOrAlliances && (
                      <div>
                        <h3 className="font-medium text-sm text-muted-foreground">
                          {"Conflits/Alliances"}
                        </h3>
                        <p>{people.historicalRole.conflictsOrAlliances}</p>
                      </div>
                    )}
                    {people.historicalRole.diaspora && (
                      <div>
                        <h3 className="font-medium text-sm text-muted-foreground">
                          {"Diaspora"}
                        </h3>
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
                <h2 className="flex items-center gap-2 text-2xl font-semibold leading-none tracking-tight">
                  <Calendar className="h-5 w-5" />
                  {"Démographie globale"}
                </h2>
              </CardHeader>
              <CardContent className="space-y-4">
                {people.demography ? (
                  <>
                    {people.demography.totalPopulation && (
                      <div>
                        <h3 className="font-medium text-sm text-muted-foreground">
                          {"Population totale"}
                        </h3>
                        <p className="text-2xl font-bold">
                          {formatNumber(people.demography.totalPopulation)}
                        </p>
                      </div>
                    )}
                    {people.demography.referenceYear && (
                      <div>
                        <h3 className="font-medium text-sm text-muted-foreground">
                          {"Année de référence"}
                        </h3>
                        <p>{people.demography.referenceYear}</p>
                      </div>
                    )}
                    {people.demography.distributionByCountry &&
                      people.demography.distributionByCountry.length > 0 && (
                        <div>
                          <h3 className="font-medium text-sm text-muted-foreground mb-2">
                            {"Distribution par pays"}
                          </h3>
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
                        <h3 className="font-medium text-sm text-muted-foreground">
                          {"Source"}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {people.demography.source}
                        </p>
                      </div>
                    )}
                    {/* Demographics Chart */}
                    {people.demography.distributionByCountry &&
                      people.demography.distributionByCountry.length > 1 && (
                        <div className="mt-6">
                          <Suspense
                            fallback={
                              <Skeleton className="h-64 w-full rounded-lg" />
                            }
                          >
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
                          </Suspense>
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
                <h2 className="flex items-center gap-2 text-2xl font-semibold leading-none tracking-tight">
                  <BookOpen className="h-5 w-5" />
                  {"Sources"}
                  {sourceFlag && <SourceVerifyBadge />}
                </h2>
              </CardHeader>
              <CardContent>
                {people.sources && people.sources.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1">
                    {people.sources.map((source, idx) => (
                      <li
                        key={idx}
                        className="text-sm flex items-center gap-2 flex-wrap"
                      >
                        <span>{source.title}</span>
                        {sourceFlag && <SourceVerifyBadge />}
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
