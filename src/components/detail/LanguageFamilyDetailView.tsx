"use client";

import { useState, useEffect } from "react";
import { Language } from "@/types/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ClassificationBadge } from "@/components/ui/classification-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Languages,
  Users,
  MapPin,
  BookOpen,
  History,
  Globe,
  AlertTriangle,
  ExternalLink,
  ArrowRight,
} from "lucide-react";
import type {
  LanguageFamilyDetail,
  PeopleReference,
} from "@/types/afrik-frontend";
import { getLanguageFamily } from "@/lib/afrikLoader";
import { getLocalizedRoute } from "@/lib/routing";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface LanguageFamilyDetailViewProps {
  familyId: string;
  language: Language;
  onPeopleClick?: (peopleId: string) => void;
}

export const LanguageFamilyDetailView = ({
  familyId,
  language,
  onPeopleClick,
}: LanguageFamilyDetailViewProps) => {
  const [family, setFamily] = useState<LanguageFamilyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const loadFamily = async () => {
      try {
        const data = await getLanguageFamily(familyId);
        if (!cancelled) {
          if (data) {
            setFamily(data);
          } else {
            setError(getNotFoundText());
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Error fetching language family:", err);
          setError(getErrorText());
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadFamily();

    return () => {
      cancelled = true;
    };
  }, [familyId, language]);

  const getNotFoundText = (): string => {
    return "Famille linguistique non trouvée";
  };

  const getErrorText = (): string => {
    return "Échec du chargement de la famille linguistique";
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat("fr-FR").format(Math.round(num));
  };

  const getTabLabels = () => {
    return {
      general: "Général",
      peoples: "Peuples",
      linguistics: "Linguistique",
      history: "Histoire",
      distribution: "Distribution",
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

  if (error || !family) {
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
  const displayName = family.nameFr;

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <Languages className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">{displayName}</h1>
            <ClassificationBadge status={family.classificationStatus} />
          </div>
          <p className="text-sm text-muted-foreground">{family.id}</p>

          {/* Quick stats */}
          <div className="flex flex-wrap gap-2 mt-4">
            {family.generalInfo?.totalSpeakers && (
              <Badge variant="secondary" className="gap-1">
                <Users className="h-3 w-3" />
                {formatNumber(family.generalInfo.totalSpeakers)} {"locuteurs"}
              </Badge>
            )}
            {family.generalInfo?.numberOfLanguages && (
              <Badge variant="secondary" className="gap-1">
                <Languages className="h-3 w-3" />
                {family.generalInfo.numberOfLanguages} {"langues"}
              </Badge>
            )}
            {family.associatedPeoples &&
              family.associatedPeoples.length > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <Users className="h-3 w-3" />
                  {family.associatedPeoples.length} {"peuples"}
                </Badge>
              )}
            {family.generalInfo?.geographicArea && (
              <Badge variant="outline" className="gap-1">
                <MapPin className="h-3 w-3" />
                {family.generalInfo.geographicArea}
              </Badge>
            )}
          </div>
        </div>

        {/* Decolonial Header (if exists) */}
        {family.decolonialHeader && (
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                {"Note décoloniale"}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              {family.decolonialHeader.whyProblematic && (
                <p>
                  <strong>{"Pourquoi problématique :"}</strong>{" "}
                  {family.decolonialHeader.whyProblematic}
                </p>
              )}
              {family.decolonialHeader.selfAppellation && (
                <p>
                  <strong>{"Auto-appellation :"}</strong>{" "}
                  {family.decolonialHeader.selfAppellation}
                </p>
              )}
              {family.decolonialHeader.contemporaryUsage && (
                <p>
                  <strong>{"Usage contemporain :"}</strong>{" "}
                  {family.decolonialHeader.contemporaryUsage}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tabs for sections */}
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
            <TabsTrigger value="general">{tabLabels.general}</TabsTrigger>
            <TabsTrigger value="peoples">{tabLabels.peoples}</TabsTrigger>
            <TabsTrigger value="linguistics">
              {tabLabels.linguistics}
            </TabsTrigger>
            <TabsTrigger value="history">{tabLabels.history}</TabsTrigger>
            <TabsTrigger value="distribution">
              {tabLabels.distribution}
            </TabsTrigger>
            <TabsTrigger value="sources">{tabLabels.sources}</TabsTrigger>
          </TabsList>

          {/* General Info Tab */}
          <TabsContent value="general" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  {"Informations générales"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {family.generalInfo?.geographicArea && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">
                      {"Zone géographique"}
                    </h4>
                    <p>{family.generalInfo.geographicArea}</p>
                  </div>
                )}
                {family.generalInfo?.branches &&
                  family.generalInfo.branches.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">
                        {"Branches"}
                      </h4>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {family.generalInfo.branches.map((branch, idx) => (
                          <Badge key={idx} variant="outline">
                            {branch}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                {family.generalInfo?.numberOfLanguages && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">
                      {"Nombre de langues"}
                    </h4>
                    <p>{family.generalInfo.numberOfLanguages}</p>
                  </div>
                )}
                {family.generalInfo?.totalSpeakers && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">
                      {"Total locuteurs"}
                    </h4>
                    <p>{formatNumber(family.generalInfo.totalSpeakers)}</p>
                  </div>
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
                  {"Peuples associés (Exemples)"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {family.associatedPeoples &&
                family.associatedPeoples.length > 0 ? (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {family.associatedPeoples.map(
                        (people: PeopleReference, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className={`justify-start ${
                              people.peopleId && onPeopleClick
                                ? "cursor-pointer hover:bg-primary hover:text-primary-foreground"
                                : ""
                            }`}
                            onClick={() => {
                              if (people.peopleId && onPeopleClick) {
                                onPeopleClick(people.peopleId);
                              }
                            }}
                          >
                            {people.name}
                            {people.peopleId && onPeopleClick && (
                              <ExternalLink className="h-3 w-3 ml-1" />
                            )}
                          </Badge>
                        )
                      )}
                    </div>
                    <div className="pt-2 border-t">
                      <Link
                        href={`${getLocalizedRoute(language, "peoples")}?languageFamily=${family.id}`}
                        passHref
                      >
                        <Button variant="default" className="w-full gap-2">
                          {"Voir tous les peuples de cette famille"}
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {"Aucun peuple associé répertorié"}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Linguistics Tab */}
          <TabsContent value="linguistics" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  {"Caractéristiques linguistiques"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {family.linguisticCharacteristics?.typology && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">
                      {"Typologie"}
                    </h4>
                    <p>{family.linguisticCharacteristics.typology}</p>
                  </div>
                )}
                {family.linguisticCharacteristics?.phonologicalFeatures && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">
                      {"Caractéristiques phonologiques"}
                    </h4>
                    <p>
                      {family.linguisticCharacteristics.phonologicalFeatures}
                    </p>
                  </div>
                )}
                {family.linguisticCharacteristics?.relationsWithNeighbors && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">
                      {"Relations avec les voisins"}
                    </h4>
                    <p>
                      {family.linguisticCharacteristics.relationsWithNeighbors}
                    </p>
                  </div>
                )}
                {family.linguisticCharacteristics?.keyInnovations && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">
                      {"Innovations clés"}
                    </h4>
                    <p>{family.linguisticCharacteristics.keyInnovations}</p>
                  </div>
                )}
                {!family.linguisticCharacteristics && (
                  <p className="text-muted-foreground text-sm">
                    {"Aucune caractéristique linguistique disponible"}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  {"Histoire et origines"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {family.historyAndOrigins?.probableOrigin && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">
                      {"Origine probable"}
                    </h4>
                    <p>{family.historyAndOrigins.probableOrigin}</p>
                  </div>
                )}
                {family.historyAndOrigins?.emergencePeriod && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">
                      {"Période d'émergence"}
                    </h4>
                    <p>{family.historyAndOrigins.emergencePeriod}</p>
                  </div>
                )}
                {family.historyAndOrigins?.diffusion && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">
                      {"Diffusion"}
                    </h4>
                    <p>{family.historyAndOrigins.diffusion}</p>
                  </div>
                )}
                {family.historyAndOrigins?.historicalBreaks && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">
                      {"Ruptures historiques"}
                    </h4>
                    <p>{family.historyAndOrigins.historicalBreaks}</p>
                  </div>
                )}
                {family.historyAndOrigins?.contactZones && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">
                      {"Zones de contact"}
                    </h4>
                    <p>{family.historyAndOrigins.contactZones}</p>
                  </div>
                )}
                {family.historyAndOrigins?.majorEvents && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">
                      {"Événements majeurs"}
                    </h4>
                    <p>{family.historyAndOrigins.majorEvents}</p>
                  </div>
                )}
                {!family.historyAndOrigins && (
                  <p className="text-muted-foreground text-sm">
                    {"Aucune information historique disponible"}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Distribution Tab */}
          <TabsContent value="distribution" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  {"Distribution géographique"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {family.distribution?.totalSpeakers && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">
                      {"Total locuteurs"}
                    </h4>
                    <p className="text-2xl font-bold">
                      {formatNumber(family.distribution.totalSpeakers)}
                    </p>
                  </div>
                )}
                {family.distribution?.distributionByCountry &&
                  Object.keys(family.distribution.distributionByCountry)
                    .length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-2">
                        {"Par pays"}
                      </h4>
                      <div className="space-y-2">
                        {Object.entries(
                          family.distribution.distributionByCountry
                        ).map(([countryId, count]) => (
                          <div
                            key={countryId}
                            className="flex justify-between items-center py-1 border-b"
                          >
                            <span>{countryId}</span>
                            <span className="font-medium">
                              {formatNumber(count)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                {!family.distribution && (
                  <p className="text-muted-foreground text-sm">
                    {"Aucune donnée de distribution disponible"}
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
                {family.sources && family.sources.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1">
                    {family.sources.map((source, idx) => (
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
