"use client";

import { useState, useEffect } from "react";
import { Language } from "@/types/ethnicity";
import { getTranslation } from "@/lib/translations";
import { RegionDetailView } from "@/components/RegionDetailView";
import { CountryDetailView } from "@/components/CountryDetailView";
import { EthnicityDetailView } from "@/components/EthnicityDetailView";
import { Card } from "@/components/ui/card";
import { Globe } from "lucide-react";
import { getCountryRegion } from "@/lib/datasetLoader";

interface DetailViewProps {
  language: Language;
  selectedRegion: string | null;
  selectedCountry: string | null;
  selectedEthnicity: string | null;
  onEthnicitySelect?: (ethnicity: string) => void;
  onCountrySelect?: (country: string, regionKey: string) => void;
}

export const DetailView = ({
  language,
  selectedRegion,
  selectedCountry,
  selectedEthnicity,
  onEthnicitySelect,
  onCountrySelect,
}: DetailViewProps) => {
  const t = getTranslation(language);
  const [countryRegion, setCountryRegion] = useState<string | null>(null);

  useEffect(() => {
    if (selectedCountry && !selectedRegion) {
      getCountryRegion(selectedCountry).then(region => {
        setCountryRegion(region);
      });
    } else {
      setCountryRegion(null);
    }
  }, [selectedCountry, selectedRegion]);

  // Vue d'une région sélectionnée
  if (selectedRegion) {
    return (
      <RegionDetailView
        regionKey={selectedRegion}
        language={language}
        onCountrySelect={onCountrySelect}
      />
    );
  }

  // Vue d'un pays sélectionné
  if (selectedCountry) {
    // Attendre que la région soit chargée
    if (!countryRegion) {
      return (
        <div className="h-[calc(100vh-12rem)] flex items-center justify-center p-6">
          <div className="text-center text-muted-foreground">
            <p>Loading country data...</p>
          </div>
        </div>
      );
    }
    return (
      <CountryDetailView
        regionKey={countryRegion}
        countryName={selectedCountry}
        language={language}
        onEthnicitySelect={onEthnicitySelect}
      />
    );
  }

  // Vue d'une ethnie sélectionnée
  if (selectedEthnicity) {
    return (
      <EthnicityDetailView
        ethnicityName={selectedEthnicity}
        language={language}
        onCountrySelect={(country, region) => {
          // Trouver la clé de région depuis le nom
          const regionMap: Record<string, string> = {
            'Afrique du Nord': 'afrique_du_nord',
            'Afrique de l\'Ouest': 'afrique_de_l_ouest',
            'Afrique Centrale': 'afrique_centrale',
            'Afrique de l\'Est': 'afrique_de_l_est',
            'Afrique Australe': 'afrique_australe',
          };
          const regionKey = regionMap[region] || region;
          onCountrySelect?.(country, regionKey);
        }}
      />
    );
  }

  // Vue par défaut (rien de sélectionné)
  return (
    <div className="h-[calc(100vh-12rem)] flex items-center justify-center p-6">
      <Card className="p-12 text-center max-w-md">
        <Globe className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">{t.title}</h3>
        <p className="text-muted-foreground">
          {t.subtitle}
        </p>
        <p className="text-sm text-muted-foreground mt-4">
          {language === "en"
            ? "Select a region, country, or ethnicity from the list to view detailed information."
            : language === "fr"
            ? "Sélectionnez une région, un pays ou une ethnie dans la liste pour voir les informations détaillées."
            : language === "es"
            ? "Seleccione una región, país o etnia de la lista para ver información detallada."
            : "Selecione uma região, país ou etnia da lista para ver informações detalhadas."}
        </p>
      </Card>
    </div>
  );
};
