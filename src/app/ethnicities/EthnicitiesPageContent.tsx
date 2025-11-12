"use client";

import { useState, useEffect } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { useLanguage } from "@/hooks/use-language";
import { getLocalizedRoute } from "@/lib/routing";
import { PageLayout } from "@/components/PageLayout";
import { DetailView } from "@/components/DetailView";
import { EthnicityView } from "@/components/EthnicityView";
import { Card } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import { getTranslation } from "@/lib/translations";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { DefaultMessage } from "@/components/DefaultMessage";

export function EthnicitiesPageContent() {
  const { language, setLanguage } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedEthnicity, setSelectedEthnicity] = useState<string | null>(
    searchParams.get("ethnicity")
  );
  const isMobile = useIsMobile();
  const t = getTranslation(language);

  // Redirect if language is not English (since /ethnicities is the English route)
  useEffect(() => {
    const correctRoute = getLocalizedRoute(language, "ethnicities");
    if (pathname !== correctRoute) {
      router.replace(correctRoute);
      return;
    }
  }, [language, router, pathname]);

  useEffect(() => {
    const ethnicityParam = searchParams.get("ethnicity");
    if (ethnicityParam) {
      setSelectedEthnicity(ethnicityParam);
    }
  }, [searchParams]);

  const handleEthnicitySelect = (ethnicity: string) => {
    setSelectedEthnicity(ethnicity);
    setSelectedCountry(null);
    setSelectedRegion(null);
  };

  const handleCountrySelect = (country: string, regionKey?: string) => {
    setSelectedCountry(country);
    setSelectedRegion(null);
    setSelectedEthnicity(null);
  };

  // If language is not English, show loading while redirecting
  const correctRoute = getLocalizedRoute(language, "ethnicities");
  if (pathname !== correctRoute) {
    return (
      <div className="min-h-screen gradient-earth flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">
            {language === "en"
              ? "Redirecting..."
              : language === "fr"
              ? "Redirection..."
              : language === "es"
              ? "Redirigiendo..."
              : "Redirecionando..."}
          </p>
        </div>
      </div>
    );
  }

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
            <EthnicityView
              language={language}
              onEthnicitySelect={handleEthnicitySelect}
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
                <DetailView
                  language={language}
                  selectedRegion={selectedRegion}
                  selectedCountry={selectedCountry}
                  selectedEthnicity={selectedEthnicity}
                  onEthnicitySelect={handleEthnicitySelect}
                  onCountrySelect={handleCountrySelect}
                />
              ) : (
                <DefaultMessage language={language} pageType="ethnicities" />
              )}
            </Card>
          </div>

          {/* Liste de choix - Droite (30%) */}
          <div className="lg:col-span-3">
            <Card className="shadow-soft">
              <EthnicityView
                language={language}
                onEthnicitySelect={handleEthnicitySelect}
              />
            </Card>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
