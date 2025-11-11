"use client";

import { useState } from "react";
import { Language, ViewMode } from "@/types/ethnicity";
import { getTranslation } from "@/lib/translations";
import { LanguageSelector } from "@/components/LanguageSelector";
import { DetailView } from "@/components/DetailView";
import { RegionView } from "@/components/RegionView";
import { CountryView } from "@/components/CountryView";
import { EthnicityView } from "@/components/EthnicityView";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";

export default function Home() {
  const [language, setLanguage] = useState<Language>("en");
  const [viewMode, setViewMode] = useState<ViewMode>("region");
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedEthnicity, setSelectedEthnicity] = useState<string | null>(
    null
  );

  const t = getTranslation(language);

  const handleRegionSelect = (regionKey: string) => {
    setSelectedRegion(regionKey);
    setSelectedCountry(null);
    setSelectedEthnicity(null);
  };

  const handleCountrySelect = (country: string, regionKey?: string) => {
    setSelectedCountry(country);
    // Ne pas définir selectedRegion ici - il sera récupéré automatiquement dans DetailView
    // selectedRegion ne doit être défini que quand on clique directement sur une région
    setSelectedRegion(null);
    setSelectedEthnicity(null);
  };

  const handleEthnicitySelect = (ethnicity: string) => {
    setSelectedEthnicity(ethnicity);
    setSelectedCountry(null);
    setSelectedRegion(null);
  };

  return (
    <div className="min-h-screen gradient-earth">
      {/* Header */}
      <header className="border-b bg-card shadow-soft">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1
                className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2 bg-clip-text text-transparent gradient-warm"
                style={{
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {t.title}
              </h1>
              <p className="text-sm md:text-base text-muted-foreground">
                {t.subtitle}
              </p>
            </div>
            <LanguageSelector
              currentLang={language}
              onLanguageChange={setLanguage}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Vue détaillée - Gauche (40%) */}
          <div className="lg:col-span-2">
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

          {/* Liste de choix - Droite (60%) */}
          <div className="lg:col-span-3">
            <Tabs
              value={viewMode}
              onValueChange={(v) => setViewMode(v as ViewMode)}
            >
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="region">{t.region}</TabsTrigger>
                <TabsTrigger value="country">{t.byCountry}</TabsTrigger>
                <TabsTrigger value="ethnicity">{t.byEthnicity}</TabsTrigger>
              </TabsList>

              <TabsContent value="region" className="mt-0">
                <Card className="shadow-soft">
                  <RegionView
                    language={language}
                    onRegionSelect={handleRegionSelect}
                  />
                </Card>
              </TabsContent>

              <TabsContent value="country" className="mt-0">
                <Card className="shadow-soft">
                  <CountryView
                    language={language}
                    onCountrySelect={handleCountrySelect}
                  />
                </Card>
              </TabsContent>

              <TabsContent value="ethnicity" className="mt-0">
                <Card className="shadow-soft">
                  <EthnicityView
                    language={language}
                    onEthnicitySelect={handleEthnicitySelect}
                  />
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>
            © 2025 African Ethnicities Dictionary | Data sources: Official
            demographic estimates 2025
          </p>
        </div>
      </footer>
    </div>
  );
}
