"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "@/hooks/use-language";
import { PageLayout } from "@/components/PageLayout";
import { DetailView } from "@/components/DetailView";
import { EthnicityView } from "@/components/EthnicityView";
import { Card } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import { getTranslation } from "@/lib/translations";

export default function EtniasPage() {
  const { language, setLanguage } = useLanguage();
  const searchParams = useSearchParams();
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedEthnicity, setSelectedEthnicity] = useState<string | null>(
    searchParams.get("ethnicity")
  );
  const isMobile = useIsMobile();
  const t = getTranslation(language);

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
          <EthnicityView
            language={language}
            onEthnicitySelect={handleEthnicitySelect}
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
