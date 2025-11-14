"use client";

import { useState, useEffect, useRef } from "react";
import { Language } from "@/types/ethnicity";
import { getTranslation } from "@/lib/translations";
import { RegionDetailView } from "@/components/RegionDetailView";
import { CountryDetailView } from "@/components/CountryDetailView";
import { EthnicityDetailView } from "@/components/EthnicityDetailView";
import { Card } from "@/components/ui/card";
import { Globe } from "lucide-react";
import { getCountryRegion } from "@/lib/datasetLoader";
import {
  getCountryKey,
  getRegionKey,
  getCountryName,
  getEthnicityName,
} from "@/lib/entityKeys";

interface DetailViewProps {
  language: Language;
  selectedRegion: string | null; // Clé normalisée
  selectedCountry: string | null; // Clé normalisée
  selectedEthnicity: string | null; // Clé normalisée
  onEthnicitySelect?: (ethnicityKey: string) => void;
  onCountrySelect?: (countryKey: string, regionKey: string) => void;
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
  const lastLoadedCountryRef = useRef<string | null>(null);

  useEffect(() => {
    if (selectedCountry && !selectedRegion) {
      // Ne recharger que si le pays a changé
      if (lastLoadedCountryRef.current === selectedCountry) {
        return;
      }
      // Réinitialiser la région quand le pays change
      setCountryRegion(null);
      // Capturer la valeur actuelle de selectedCountry pour la vérification dans le callback
      const currentCountry = selectedCountry;
      // selectedCountry est maintenant une clé, on doit la convertir en nom
      const countryName = getCountryName(selectedCountry);
      if (countryName) {
        lastLoadedCountryRef.current = selectedCountry;
        getCountryRegion(countryName)
          .then((region) => {
            // Ne mettre à jour que si le pays n'a pas changé pendant le chargement
            if (lastLoadedCountryRef.current === currentCountry) {
              setCountryRegion(region);
            }
          })
          .catch(() => {
            // En cas d'erreur, réinitialiser pour permettre un nouvel essai
            if (lastLoadedCountryRef.current === currentCountry) {
              setCountryRegion(null);
              lastLoadedCountryRef.current = null;
            }
          });
      }
    } else {
      setCountryRegion(null);
      lastLoadedCountryRef.current = null;
    }
  }, [selectedCountry, selectedRegion]);

  // Gérer la hiérarchie : ethnicity > country > region
  // Vue d'une ethnie sélectionnée (priorité la plus haute)
  if (selectedEthnicity) {
    // Convertir la clé en nom pour EthnicityDetailView
    const ethnicityName =
      getEthnicityName(selectedEthnicity) || selectedEthnicity;

    return (
      <EthnicityDetailView
        ethnicityName={ethnicityName}
        language={language}
        onCountrySelect={(country, region) => {
          // Convertir le nom de région en clé
          const regionKey = getRegionKey(region) || region;
          // Convertir le nom de pays en clé
          const countryKey = getCountryKey(country) || country;
          onCountrySelect?.(countryKey, regionKey);
        }}
        selectedCountryKey={selectedCountry}
        selectedRegionKey={selectedRegion}
      />
    );
  }

  // Vue d'un pays sélectionné
  if (selectedCountry) {
    // Si on a déjà selectedRegion, l'utiliser directement
    // Sinon, attendre que la région soit chargée
    const regionToUse = selectedRegion || countryRegion;

    if (!regionToUse) {
      return (
        <div className="h-[calc(100vh-12rem)] flex items-center justify-center p-6">
          <div className="text-center text-muted-foreground">
            <p>Loading country data...</p>
          </div>
        </div>
      );
    }
    // Convertir la clé en nom pour CountryDetailView
    const countryName = getCountryName(selectedCountry) || selectedCountry;

    return (
      <CountryDetailView
        regionKey={regionToUse}
        countryName={countryName}
        language={language}
        onEthnicitySelect={onEthnicitySelect}
        selectedEthnicityKey={selectedEthnicity}
      />
    );
  }

  // Vue d'une région sélectionnée
  if (selectedRegion) {
    return (
      <RegionDetailView
        regionKey={selectedRegion}
        language={language}
        onCountrySelect={onCountrySelect}
        selectedCountryKey={selectedCountry}
        selectedEthnicityKey={selectedEthnicity}
      />
    );
  }

  // Vue par défaut (rien de sélectionné)
  return (
    <div className="h-[calc(100vh-12rem)] flex items-center justify-center p-6">
      <Card className="p-12 text-center max-w-md">
        <Globe className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">{t.title}</h3>
        <p className="text-muted-foreground">{t.subtitle}</p>
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
