"use client";

import { useState, useEffect } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { useLanguage } from "@/hooks/use-language";
import { getLocalizedRoute } from "@/lib/routing";
import { PageLayout } from "@/components/PageLayout";
import { DetailView } from "@/components/DetailView";
import { CountryView } from "@/components/CountryView";
import { Card } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import { getTranslation } from "@/lib/translations";
import { useRouter } from "next/navigation";

export default function CountriesPage() {
  const { language, setLanguage } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(
    searchParams.get("country")
  );
  const [selectedEthnicity, setSelectedEthnicity] = useState<string | null>(
    null
  );
  const isMobile = useIsMobile();
  const t = getTranslation(language);

  // Redirect if language is not English (since /countries is the English route)
  useEffect(() => {
    const correctRoute = getLocalizedRoute(language, "countries");
    if (pathname !== correctRoute) {
      router.replace(correctRoute);
      return;
    }
  }, [language, router, pathname]);

  useEffect(() => {
    const countryParam = searchParams.get("country");
    if (countryParam) {
      setSelectedCountry(countryParam);
    }
  }, [searchParams]);

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

  // If language is not English, show loading while redirecting
  const correctRoute = getLocalizedRoute(language, "countries");
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
        // Vue mobile : liste seule
        <div>
          <CountryView
            language={language}
            onCountrySelect={(country, regionKey) => {
              handleCountrySelect(country, regionKey);
            }}
            hideSearchAndAlphabet={false}
          />
        </div>
      ) : (
        // Vue desktop : deux colonnes (70% détail, 30% liste)
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
          {/* Vue détaillée - Gauche (70%) */}
          <div className="lg:col-span-7">
            <Card className="shadow-soft h-full">
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

          {/* Liste de choix - Droite (30%) */}
          <div className="lg:col-span-3">
            <Card className="shadow-soft">
              <CountryView
                language={language}
                onCountrySelect={handleCountrySelect}
              />
            </Card>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
