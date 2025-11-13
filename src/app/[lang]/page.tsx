"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/hooks/use-language";
import { getTranslation } from "@/lib/translations";
import { getLocalizedRoute } from "@/lib/routing";
import { PageLayout } from "@/components/PageLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useIsMobile } from "@/hooks/use-mobile";
import { Globe, MapPin, Users, Search } from "lucide-react";
import { SearchModal } from "@/components/SearchModal";
import { useParams } from "next/navigation";
import { Language } from "@/types/ethnicity";
import { getTotalPopulationAfrica } from "@/lib/datasetLoader";

export default function Home() {
  const params = useParams();
  const lang = params?.lang as string;
  const { language, setLanguage } = useLanguage();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [totalPopulation, setTotalPopulation] = useState<number | null>(null);
  const [totalRegions, setTotalRegions] = useState<number | null>(null);
  const [totalCountries, setTotalCountries] = useState<number | null>(null);
  const [totalEthnicities, setTotalEthnicities] = useState<number | null>(null);

  // Use lang from URL directly, fallback to language from hook
  const currentLanguage =
    lang && ["en", "fr", "es", "pt"].includes(lang)
      ? (lang as Language)
      : language;
  const t = getTranslation(currentLanguage);

  // Sync language from URL param to hook
  useEffect(() => {
    if (lang && ["en", "fr", "es", "pt"].includes(lang)) {
      const urlLang = lang as Language;
      if (urlLang !== language) {
        // Update the hook's language state without triggering navigation
        setLanguage(urlLang);
      }
    }
  }, [lang, language, setLanguage]);

  // Load statistics from API
  useEffect(() => {
    // Load total population
    getTotalPopulationAfrica().then(setTotalPopulation).catch(console.error);

    // Load total regions
    fetch("/api/regions")
      .then((res) => res.json())
      .then((data) => {
        if (data.regions) {
          setTotalRegions(data.regions.length);
        }
      })
      .catch(console.error);

    // Load total countries
    fetch("/api/countries")
      .then((res) => res.json())
      .then((data) => {
        if (data.countries) {
          setTotalCountries(data.countries.length);
        }
      })
      .catch(console.error);

    // Load total ethnicities
    fetch("/api/ethnicities")
      .then((res) => res.json())
      .then((data) => {
        if (data.ethnicities) {
          setTotalEthnicities(data.ethnicities.length);
        }
      })
      .catch(console.error);
  }, []);

  const handleSearchResult = (result: {
    type: "ethnicity" | "country";
    name: string;
    region?: string;
    regionName?: string;
  }) => {
    // Redirect to appropriate page based on search result
    if (result.type === "ethnicity") {
      router.push(
        `${ethnicitiesRoute}?ethnicity=${encodeURIComponent(result.name)}`
      );
    } else if (result.type === "country" && result.region) {
      router.push(
        `${countriesRoute}?country=${encodeURIComponent(result.name)}`
      );
    }
  };

  const regionsRoute = getLocalizedRoute(currentLanguage, "regions");
  const countriesRoute = getLocalizedRoute(currentLanguage, "countries");
  const ethnicitiesRoute = getLocalizedRoute(currentLanguage, "ethnicities");

  return (
    <PageLayout
      language={currentLanguage}
      onLanguageChange={setLanguage}
      title={t.title}
      subtitle={t.subtitle}
      onSearchResult={handleSearchResult}
    >
      <div className="space-y-8">
        {/* Section texte introductive */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-display font-bold">
            {currentLanguage === "en"
              ? "Discover the Rich Diversity of African Ethnic Groups"
              : currentLanguage === "fr"
                ? "Découvrez la Richesse de la Diversité des Groupes Ethniques Africains"
                : currentLanguage === "es"
                  ? "Descubre la Rica Diversidad de los Grupos Étnicos Africanos"
                  : "Descubra a Rica Diversidade dos Grupos Étnicos Africanos"}
          </h2>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
            {currentLanguage === "en"
              ? "This comprehensive encyclopedia documents the ethnic diversity across all 55 African countries. Our data provides detailed demographic information, helping to understand the rich cultural mosaic that makes up the African continent. Explore regions, countries, and ethnic groups to discover population distributions, cultural connections, and linguistic diversity."
              : currentLanguage === "fr"
                ? "Cette encyclopédie complète documente la diversité ethnique dans les 55 pays africains. Nos données fournissent des informations démographiques détaillées, permettant de comprendre la riche mosaïque culturelle qui compose le continent africain. Explorez les régions, pays et groupes ethniques pour découvrir les distributions démographiques, les connexions culturelles et la diversité linguistique."
                : currentLanguage === "es"
                  ? "Esta enciclopedia integral documenta la diversidad étnica en los 55 países africanos. Nuestros datos proporcionan información demográfica detallada, ayudando a comprender el rico mosaico cultural que conforma el continente africano. Explora regiones, países y grupos étnicos para descubrir distribuciones poblacionales, conexiones culturales y diversidad lingüística."
                  : "Esta enciclopédia abrangente documenta a diversidade étnica em todos os 55 países africanos. Nossos dados fornecem informações demográficas detalhadas, ajudando a compreender o rico mosaico cultural que compõe o continente africano. Explore regiões, países e grupos étnicos para descobrir distribuições populacionais, conexões culturais e diversidade linguística."}
          </p>
        </div>

        {/* Barre de recherche */}
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
            language={currentLanguage}
            onResultSelect={handleSearchResult}
          />
        </div>

        {/* Section Statistiques */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Carte statistique - Population totale */}
            {totalPopulation !== null && (
              <Card className="p-6">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="p-4 rounded-full bg-primary/10">
                    <Globe className="h-10 w-10 text-primary" />
                  </div>
                  <div className="flex-1 w-full">
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">
                      {currentLanguage === "en"
                        ? "Total Population"
                        : currentLanguage === "fr"
                          ? "Population Totale"
                          : currentLanguage === "es"
                            ? "Población Total"
                            : "População Total"}
                    </h3>
                    <p className="text-2xl md:text-3xl font-display font-bold">
                      {new Intl.NumberFormat(
                        currentLanguage === "en"
                          ? "en-US"
                          : currentLanguage === "fr"
                            ? "fr-FR"
                            : currentLanguage === "es"
                              ? "es-ES"
                              : "pt-PT"
                      ).format(totalPopulation)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {currentLanguage === "en"
                        ? "inhabitants"
                        : currentLanguage === "fr"
                          ? "habitants"
                          : currentLanguage === "es"
                            ? "habitantes"
                            : "habitantes"}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Carte statistique - Total régions */}
            {totalRegions !== null && (
              <Card className="p-6">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="p-4 rounded-full bg-primary/10">
                    <Globe className="h-10 w-10 text-primary" />
                  </div>
                  <div className="flex-1 w-full">
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">
                      {currentLanguage === "en"
                        ? "Total Regions"
                        : currentLanguage === "fr"
                          ? "Total Régions"
                          : currentLanguage === "es"
                            ? "Total Regiones"
                            : "Total Regiões"}
                    </h3>
                    <p className="text-2xl md:text-3xl font-display font-bold">
                      {new Intl.NumberFormat(
                        currentLanguage === "en"
                          ? "en-US"
                          : currentLanguage === "fr"
                            ? "fr-FR"
                            : currentLanguage === "es"
                              ? "es-ES"
                              : "pt-PT"
                      ).format(totalRegions)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {currentLanguage === "en"
                        ? "regions"
                        : currentLanguage === "fr"
                          ? "régions"
                          : currentLanguage === "es"
                            ? "regiones"
                            : "regiões"}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Carte statistique - Total pays */}
            {totalCountries !== null && (
              <Card className="p-6">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="p-4 rounded-full bg-primary/10">
                    <MapPin className="h-10 w-10 text-primary" />
                  </div>
                  <div className="flex-1 w-full">
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">
                      {currentLanguage === "en"
                        ? "Total Countries"
                        : currentLanguage === "fr"
                          ? "Total Pays"
                          : currentLanguage === "es"
                            ? "Total Países"
                            : "Total Países"}
                    </h3>
                    <p className="text-2xl md:text-3xl font-display font-bold">
                      {new Intl.NumberFormat(
                        currentLanguage === "en"
                          ? "en-US"
                          : currentLanguage === "fr"
                            ? "fr-FR"
                            : currentLanguage === "es"
                              ? "es-ES"
                              : "pt-PT"
                      ).format(totalCountries)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {currentLanguage === "en"
                        ? "countries"
                        : currentLanguage === "fr"
                          ? "pays"
                          : currentLanguage === "es"
                            ? "países"
                            : "países"}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Carte statistique - Total groupes ethniques */}
            {totalEthnicities !== null && (
              <Card className="p-6">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="p-4 rounded-full bg-primary/10">
                    <Users className="h-10 w-10 text-primary" />
                  </div>
                  <div className="flex-1 w-full">
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">
                      {currentLanguage === "en"
                        ? "Total Ethnic Groups"
                        : currentLanguage === "fr"
                          ? "Total Groupes Ethniques"
                          : currentLanguage === "es"
                            ? "Total Grupos Étnicos"
                            : "Total Grupos Étnicos"}
                    </h3>
                    <p className="text-2xl md:text-3xl font-display font-bold">
                      {new Intl.NumberFormat(
                        currentLanguage === "en"
                          ? "en-US"
                          : currentLanguage === "fr"
                            ? "fr-FR"
                            : currentLanguage === "es"
                              ? "es-ES"
                              : "pt-PT"
                      ).format(totalEthnicities)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {currentLanguage === "en"
                        ? "ethnic groups"
                        : currentLanguage === "fr"
                          ? "groupes ethniques"
                          : currentLanguage === "es"
                            ? "grupos étnicos"
                            : "grupos étnicos"}
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Section CTA - 3 boutons vers les pages */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  {currentLanguage === "en"
                    ? "Discover ethnic groups"
                    : currentLanguage === "fr"
                      ? "Découvrir les ethnies"
                      : currentLanguage === "es"
                        ? "Descubrir grupos étnicos"
                        : "Descobrir grupos étnicos"}
                </p>
              </div>
              <Button className="w-full" variant="default">
                {currentLanguage === "en"
                  ? "View Ethnicities"
                  : currentLanguage === "fr"
                    ? "Voir les ethnies"
                    : currentLanguage === "es"
                      ? "Ver etnias"
                      : "Ver etnias"}
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
                  {currentLanguage === "en"
                    ? "Browse by country"
                    : currentLanguage === "fr"
                      ? "Parcourir par pays"
                      : currentLanguage === "es"
                        ? "Navegar por país"
                        : "Navegar por país"}
                </p>
              </div>
              <Button className="w-full" variant="default">
                {currentLanguage === "en"
                  ? "View Countries"
                  : currentLanguage === "fr"
                    ? "Voir les pays"
                    : currentLanguage === "es"
                      ? "Ver países"
                      : "Ver países"}
              </Button>
            </div>
          </Card>

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
                  {currentLanguage === "en"
                    ? "Explore by region"
                    : currentLanguage === "fr"
                      ? "Explorer par région"
                      : currentLanguage === "es"
                        ? "Explorar por región"
                        : "Explorar por região"}
                </p>
              </div>
              <Button className="w-full" variant="default">
                {currentLanguage === "en"
                  ? "View Regions"
                  : currentLanguage === "fr"
                    ? "Voir les régions"
                    : currentLanguage === "es"
                      ? "Ver regiones"
                      : "Ver regiões"}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}
