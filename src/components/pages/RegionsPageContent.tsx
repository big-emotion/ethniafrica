"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/hooks/use-language";
import { PageLayout } from "@/components/PageLayout";
import { DetailView } from "@/components/DetailView";
import { RegionView } from "@/components/RegionView";
import { Card } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import { getTranslation } from "@/lib/translations";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { DefaultMessage } from "@/components/DefaultMessage";
import { getLocalizedRoute } from "@/lib/routing";

export function RegionsPageContent() {
  const { language, setLanguage } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedRegion, setSelectedRegion] = useState<string | null>(
    searchParams.get("region")
  );
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedEthnicity, setSelectedEthnicity] = useState<string | null>(
    null
  );
  const isMobile = useIsMobile();
  const t = getTranslation(language);

  useEffect(() => {
    const expected = getLocalizedRoute(language, "regions");
    if (pathname !== expected) {
      router.replace(expected);
    }
  }, [language, pathname, router]);

  useEffect(() => {
    const regionParam = searchParams.get("region");
    const countryParam = searchParams.get("country");
    const ethnicityParam = searchParams.get("ethnicity");

    if (regionParam) {
      setSelectedRegion(regionParam);
    }
    if (countryParam) {
      setSelectedCountry(countryParam);
    }
    if (ethnicityParam) {
      setSelectedEthnicity(ethnicityParam);
    }
  }, [searchParams]);

  const handleRegionSelect = (regionKey: string) => {
    setSelectedRegion(regionKey);
    setSelectedCountry(null);
    setSelectedEthnicity(null);
    // Mettre à jour l'URL sans navigation
    const url = new URL(window.location.href);
    url.searchParams.set("region", regionKey);
    url.searchParams.delete("country");
    url.searchParams.delete("ethnicity");
    router.replace(url.pathname + url.search, { scroll: false });
  };

  const handleCountrySelect = (countryKey: string, regionKey?: string) => {
    setSelectedCountry(countryKey);
    setSelectedEthnicity(null);
    // Mettre à jour l'URL sans navigation
    const url = new URL(window.location.href);
    url.searchParams.set("country", countryKey);
    if (selectedRegion) {
      url.searchParams.set("region", selectedRegion);
    }
    url.searchParams.delete("ethnicity");
    router.replace(url.pathname + url.search, { scroll: false });
  };

  const handleEthnicitySelect = (ethnicityKey: string) => {
    setSelectedEthnicity(ethnicityKey);
    // Mettre à jour l'URL sans navigation
    const url = new URL(window.location.href);
    url.searchParams.set("ethnicity", ethnicityKey);
    if (selectedRegion) {
      url.searchParams.set("region", selectedRegion);
    }
    if (selectedCountry) {
      url.searchParams.set("country", selectedCountry);
    }
    router.replace(url.pathname + url.search, { scroll: false });
  };

  const handleViewFullPage = (
    type: "region" | "country" | "ethnicity",
    item: string
  ) => {
    const listRoute = getLocalizedRoute(
      language,
      type === "region"
        ? "regions"
        : type === "country"
          ? "countries"
          : "ethnicities"
    );
    // item est maintenant une clé normalisée
    router.push(`${listRoute}/${item}`);
  };

  return (
    <PageLayout
      language={language}
      onLanguageChange={setLanguage}
      sectionName={t.regions}
    >
      {isMobile ? (
        // Vue mobile : liste ou vue détaillée selon la sélection
        <div>
          {selectedRegion || selectedCountry || selectedEthnicity ? (
            <div className="space-y-4">
              <Button
                variant="ghost"
                onClick={() => {
                  // Navigation hiérarchique : remonter d'un niveau
                  const url = new URL(window.location.href);
                  if (selectedEthnicity) {
                    // Si on est sur une ethnie, revenir au pays
                    setSelectedEthnicity(null);
                    url.searchParams.delete("ethnicity");
                    if (selectedCountry) {
                      url.searchParams.set("country", selectedCountry);
                    }
                  } else if (selectedCountry) {
                    // Si on est sur un pays, revenir à la région
                    setSelectedCountry(null);
                    url.searchParams.delete("country");
                    if (selectedRegion) {
                      url.searchParams.set("region", selectedRegion);
                    }
                  } else {
                    // Si on est sur une région, revenir à la liste
                    setSelectedRegion(null);
                    url.searchParams.delete("region");
                  }
                  router.replace(url.pathname + url.search, { scroll: false });
                }}
                className="mb-2"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {language === "en"
                  ? "Back"
                  : language === "fr"
                    ? "Retour"
                    : language === "es"
                      ? "Volver"
                      : "Voltar"}
              </Button>
              <Card className="shadow-soft w-full">
                <DetailView
                  language={language}
                  selectedRegion={selectedRegion}
                  selectedCountry={selectedCountry}
                  selectedEthnicity={selectedEthnicity}
                  onEthnicitySelect={handleEthnicitySelect}
                  onCountrySelect={handleCountrySelect}
                />
              </Card>
            </div>
          ) : (
            <RegionView
              key={pathname}
              language={language}
              onRegionSelect={(regionKey) => {
                handleRegionSelect(regionKey);
              }}
              hideSearchAndAlphabet={false}
            />
          )}
        </div>
      ) : (
        // Vue desktop : deux colonnes (70% détail, 30% liste)
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
          {/* Vue détaillée - Gauche (70%) */}
          <div className="lg:col-span-7">
            <Card className="shadow-soft h-full">
              {selectedRegion || selectedCountry || selectedEthnicity ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border-b">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        // Navigation hiérarchique : remonter d'un niveau
                        const url = new URL(window.location.href);
                        if (selectedEthnicity) {
                          // Si on est sur une ethnie, revenir au pays
                          setSelectedEthnicity(null);
                          url.searchParams.delete("ethnicity");
                          if (selectedCountry) {
                            url.searchParams.set("country", selectedCountry);
                          }
                        } else if (selectedCountry) {
                          // Si on est sur un pays, revenir à la région
                          setSelectedCountry(null);
                          url.searchParams.delete("country");
                          if (selectedRegion) {
                            url.searchParams.set("region", selectedRegion);
                          }
                        } else {
                          // Si on est sur une région, revenir à la liste
                          setSelectedRegion(null);
                          url.searchParams.delete("region");
                        }
                        router.replace(url.pathname + url.search, {
                          scroll: false,
                        });
                      }}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      {language === "en"
                        ? "Back"
                        : language === "fr"
                          ? "Retour"
                          : language === "es"
                            ? "Volver"
                            : "Voltar"}
                    </Button>
                    {(selectedRegion ||
                      selectedCountry ||
                      selectedEthnicity) && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (selectedEthnicity) {
                            handleViewFullPage("ethnicity", selectedEthnicity);
                          } else if (selectedCountry) {
                            handleViewFullPage("country", selectedCountry);
                          } else if (selectedRegion) {
                            handleViewFullPage("region", selectedRegion);
                          }
                        }}
                      >
                        {language === "en"
                          ? "View Full Page"
                          : language === "fr"
                            ? "Voir la page complète"
                            : language === "es"
                              ? "Ver página completa"
                              : "Ver página completa"}
                      </Button>
                    )}
                  </div>
                  <DetailView
                    language={language}
                    selectedRegion={selectedRegion}
                    selectedCountry={selectedCountry}
                    selectedEthnicity={selectedEthnicity}
                    onEthnicitySelect={handleEthnicitySelect}
                    onCountrySelect={handleCountrySelect}
                  />
                </div>
              ) : (
                <DefaultMessage language={language} pageType="regions" />
              )}
            </Card>
          </div>

          {/* Liste de choix - Droite (30%) */}
          <div className="lg:col-span-3 sticky top-0 self-start">
            <Card className="shadow-soft">
              <RegionView
                key={pathname}
                language={language}
                onRegionSelect={handleRegionSelect}
                selectedRegionKey={selectedRegion}
              />
            </Card>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
