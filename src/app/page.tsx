"use client";

import { useState } from "react";
import { useLanguage } from "@/hooks/use-language";
import { getTranslation } from "@/lib/translations";
import { getLocalizedRoute } from "@/lib/routing";
import { PageLayout } from "@/components/PageLayout";
import { DetailView } from "@/components/DetailView";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useIsMobile } from "@/hooks/use-mobile";
import { Globe, MapPin, Users, Search } from "lucide-react";
import { SearchModal } from "@/components/SearchModal";

export default function Home() {
  const { language, setLanguage } = useLanguage();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedEthnicity, setSelectedEthnicity] = useState<string | null>(
    null
  );
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const t = getTranslation(language);

  const handleSearchResult = (result: {
    type: "ethnicity" | "country";
    name: string;
    region?: string;
    regionName?: string;
  }) => {
    if (result.type === "ethnicity") {
      setSelectedEthnicity(result.name);
      setSelectedCountry(null);
      setSelectedRegion(null);
    } else if (result.type === "country" && result.region) {
      setSelectedCountry(result.name);
      setSelectedRegion(null);
      setSelectedEthnicity(null);
    }
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

  const regionsRoute = getLocalizedRoute(language, "regions");
  const countriesRoute = getLocalizedRoute(language, "countries");
  const ethnicitiesRoute = getLocalizedRoute(language, "ethnicities");

  return (
    <PageLayout
      language={language}
      onLanguageChange={setLanguage}
      title={t.title}
      subtitle={t.subtitle}
      onSearchResult={handleSearchResult}
    >
      <div className="space-y-8">
        {/* Section texte introductive */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-display font-bold">
            {language === "en"
              ? "Discover the Rich Diversity of African Ethnic Groups"
              : language === "fr"
              ? "Découvrez la Richesse de la Diversité des Groupes Ethniques Africains"
              : language === "es"
              ? "Descubre la Rica Diversidad de los Grupos Étnicos Africanos"
              : "Descubra a Rica Diversidade dos Grupos Étnicos Africanos"}
          </h2>
          <p className="text-base md:text-lg text-muted-foreground">
            {language === "en"
              ? "Explore comprehensive information about ethnic groups across all 55 African countries. Browse by region, country, or ethnic group to learn about demographics, cultures, and languages."
              : language === "fr"
              ? "Explorez des informations complètes sur les groupes ethniques dans les 55 pays africains. Parcourez par région, pays ou groupe ethnique pour découvrir les démographies, cultures et langues."
              : language === "es"
              ? "Explora información completa sobre grupos étnicos en los 55 países africanos. Navega por región, país o grupo étnico para conocer demografías, culturas e idiomas."
              : "Explore informações completas sobre grupos étnicos em todos os 55 países africanos. Navegue por região, país ou grupo étnico para conhecer demografias, culturas e idiomas."}
          </p>
        </div>

        {/* Barre de recherche desktop */}
        {!isMobile && (
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t.searchPlaceholder}
                className="pl-11 h-12 text-base"
                onClick={() => setIsSearchOpen(true)}
                readOnly
              />
            </div>
            <SearchModal
              open={isSearchOpen}
              onClose={() => setIsSearchOpen(false)}
              language={language}
              onResultSelect={handleSearchResult}
            />
          </div>
        )}

        {/* Section CTA - 3 boutons vers les pages */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card
            className="p-6 hover:shadow-lg transition-shadow cursor-pointer group"
            onClick={() => router.push(regionsRoute)}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Globe className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">{t.regions}</h3>
                <p className="text-sm text-muted-foreground">
                  {language === "en"
                    ? "Explore by region"
                    : language === "fr"
                    ? "Explorer par région"
                    : language === "es"
                    ? "Explorar por región"
                    : "Explorar por região"}
                </p>
              </div>
              <Button className="w-full" variant="default">
                {language === "en"
                  ? "View Regions"
                  : language === "fr"
                  ? "Voir les régions"
                  : language === "es"
                  ? "Ver regiones"
                  : "Ver regiões"}
              </Button>
            </div>
          </Card>

          <Card
            className="p-6 hover:shadow-lg transition-shadow cursor-pointer group"
            onClick={() => router.push(countriesRoute)}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <MapPin className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">{t.byCountry}</h3>
                <p className="text-sm text-muted-foreground">
                  {language === "en"
                    ? "Browse by country"
                    : language === "fr"
                    ? "Parcourir par pays"
                    : language === "es"
                    ? "Navegar por país"
                    : "Navegar por país"}
                </p>
              </div>
              <Button className="w-full" variant="default">
                {language === "en"
                  ? "View Countries"
                  : language === "fr"
                  ? "Voir les pays"
                  : language === "es"
                  ? "Ver países"
                  : "Ver países"}
              </Button>
            </div>
          </Card>

          <Card
            className="p-6 hover:shadow-lg transition-shadow cursor-pointer group"
            onClick={() => router.push(ethnicitiesRoute)}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">{t.byEthnicity}</h3>
                <p className="text-sm text-muted-foreground">
                  {language === "en"
                    ? "Discover ethnic groups"
                    : language === "fr"
                    ? "Découvrir les ethnies"
                    : language === "es"
                    ? "Descubrir grupos étnicos"
                    : "Descobrir grupos étnicos"}
                </p>
              </div>
              <Button className="w-full" variant="default">
                {language === "en"
                  ? "View Ethnicities"
                  : language === "fr"
                  ? "Voir les ethnies"
                  : language === "es"
                  ? "Ver etnias"
                  : "Ver etnias"}
              </Button>
            </div>
          </Card>
        </div>

        {/* Vue détaillée par défaut */}
        <Card className="shadow-soft">
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
    </PageLayout>
  );
}
