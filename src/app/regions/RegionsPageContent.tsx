"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useParams } from "next/navigation";
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
import { getLanguageFromRoute } from "@/lib/routing";

export function RegionsPageContent() {
  const { language, setLanguage } = useLanguage();
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
    const regionParam = searchParams.get("region");
    if (regionParam) {
      setSelectedRegion(regionParam);
    }
  }, [searchParams]);

  const handleRegionSelect = (regionKey: string) => {
    setSelectedRegion(regionKey);
    setSelectedCountry(null);
    setSelectedEthnicity(null);
  };

  const handleCountrySelect = (country: string, regionKey?: string) => {
    setSelectedCountry(country);
    setSelectedRegion(null);
    setSelectedEthnicity(null);
  };

  const handleEthnicitySelect = (ethnicity: string) => {
    setSelectedEthnicity(ethnicity);
    setSelectedCountry(null);
    setSelectedRegion(null);
  };

  return (
    <PageLayout
      language={language}
      onLanguageChange={setLanguage}
      title={t.title}
      subtitle={t.subtitle}
    >
      {isMobile ? (
        // Vue mobile : liste ou vue détaillée selon la sélection
        <div>
          {selectedRegion || selectedCountry || selectedEthnicity ? (
            <div className="space-y-4">
              <Button
                variant="ghost"
                onClick={() => {
                  setSelectedRegion(null);
                  setSelectedCountry(null);
                  setSelectedEthnicity(null);
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
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSelectedRegion(null);
                      setSelectedCountry(null);
                      setSelectedEthnicity(null);
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
          <div className="lg:col-span-3">
            <Card className="shadow-soft">
              <RegionView
                language={language}
                onRegionSelect={handleRegionSelect}
              />
            </Card>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
