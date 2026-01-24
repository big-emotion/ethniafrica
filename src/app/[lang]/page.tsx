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
import { MapPin, Users, Search, Languages } from "lucide-react";
import { SearchModalV2 } from "@/components/SearchModalV2";
import { useParams } from "next/navigation";
import { Language } from "@/types/ethnicity";
import { getStats } from "@/lib/afrikLoader";
import type { GlobalStats, SearchEntityType } from "@/types/afrik-frontend";

export default function Home() {
  const params = useParams();
  const lang = params?.lang as string;
  const { language, setLanguage } = useLanguage();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [stats, setStats] = useState<GlobalStats | null>(null);

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

  // Load statistics from AFRIK v2 API
  useEffect(() => {
    const loadStatistics = async () => {
      try {
        const statsData = await getStats();
        setStats(statsData);
      } catch (error) {
        console.error("Error loading stats:", error);
      }
    };

    loadStatistics();
  }, []);

  const handleSearchResult = (result: {
    type: SearchEntityType;
    id: string;
    name: string;
  }) => {
    // Redirect to appropriate page based on search result type
    switch (result.type) {
      case "languageFamily":
        router.push(`${familiesRoute}?family=${result.id}`);
        break;
      case "people":
        router.push(`${peoplesRoute}?people=${result.id}`);
        break;
      case "country":
        router.push(`${countriesRoute}?country=${result.id}`);
        break;
      default:
        console.warn("Unknown search result type:", result.type);
    }
    setIsSearchOpen(false);
  };

  // AFRIK v2 routes
  const familiesRoute = getLocalizedRoute(currentLanguage, "families");
  const peoplesRoute = getLocalizedRoute(currentLanguage, "peoples");
  const countriesRoute = getLocalizedRoute(currentLanguage, "countries");

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
          <SearchModalV2
            open={isSearchOpen}
            onClose={() => setIsSearchOpen(false)}
            language={currentLanguage}
            onResultSelect={handleSearchResult}
          />
        </div>

        {/* Section Statistiques - AFRIK v2 */}
        {stats && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Language Families */}
              <Card className="p-6">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="p-4 rounded-full bg-primary/10">
                    <Languages className="h-10 w-10 text-primary" />
                  </div>
                  <div className="flex-1 w-full">
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">
                      {currentLanguage === "en"
                        ? "Language Families"
                        : currentLanguage === "fr"
                          ? "Familles linguistiques"
                          : currentLanguage === "es"
                            ? "Familias lingüísticas"
                            : "Famílias linguísticas"}
                    </h3>
                    <p className="text-2xl md:text-3xl font-display font-bold">
                      {stats.totalLanguageFamilies}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {currentLanguage === "en"
                        ? "documented"
                        : currentLanguage === "fr"
                          ? "documentées"
                          : currentLanguage === "es"
                            ? "documentadas"
                            : "documentadas"}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Peoples */}
              <Card className="p-6">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="p-4 rounded-full bg-primary/10">
                    <Users className="h-10 w-10 text-primary" />
                  </div>
                  <div className="flex-1 w-full">
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">
                      {currentLanguage === "en"
                        ? "African Peoples"
                        : currentLanguage === "fr"
                          ? "Peuples africains"
                          : currentLanguage === "es"
                            ? "Pueblos africanos"
                            : "Povos africanos"}
                    </h3>
                    <p className="text-2xl md:text-3xl font-display font-bold">
                      {stats.totalPeoples}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {currentLanguage === "en"
                        ? "recorded"
                        : currentLanguage === "fr"
                          ? "recensés"
                          : currentLanguage === "es"
                            ? "registrados"
                            : "registrados"}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Countries */}
              <Card className="p-6">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="p-4 rounded-full bg-primary/10">
                    <MapPin className="h-10 w-10 text-primary" />
                  </div>
                  <div className="flex-1 w-full">
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">
                      {currentLanguage === "en"
                        ? "African Countries"
                        : currentLanguage === "fr"
                          ? "Pays africains"
                          : currentLanguage === "es"
                            ? "Países africanos"
                            : "Países africanos"}
                    </h3>
                    <p className="text-2xl md:text-3xl font-display font-bold">
                      {stats.totalCountries}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {currentLanguage === "en"
                        ? "covered"
                        : currentLanguage === "fr"
                          ? "couverts"
                          : currentLanguage === "es"
                            ? "cubiertos"
                            : "cobertos"}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Section CTA - 3 boutons vers les pages v2 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card
            className="p-6 hover:shadow-lg transition-shadow cursor-pointer group"
            onClick={() => router.push(familiesRoute)}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Languages className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">
                  {currentLanguage === "en"
                    ? "Language Families"
                    : currentLanguage === "fr"
                      ? "Familles linguistiques"
                      : currentLanguage === "es"
                        ? "Familias lingüísticas"
                        : "Famílias linguísticas"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {currentLanguage === "en"
                    ? "Explore linguistic diversity"
                    : currentLanguage === "fr"
                      ? "Explorer la diversité linguistique"
                      : currentLanguage === "es"
                        ? "Explorar diversidad lingüística"
                        : "Explorar diversidade linguística"}
                </p>
              </div>
              <Button className="w-full" variant="default">
                {currentLanguage === "en"
                  ? "View Families"
                  : currentLanguage === "fr"
                    ? "Voir les familles"
                    : currentLanguage === "es"
                      ? "Ver familias"
                      : "Ver famílias"}
              </Button>
            </div>
          </Card>

          <Card
            className="p-6 hover:shadow-lg transition-shadow cursor-pointer group"
            onClick={() => router.push(peoplesRoute)}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">
                  {currentLanguage === "en"
                    ? "African Peoples"
                    : currentLanguage === "fr"
                      ? "Peuples africains"
                      : currentLanguage === "es"
                        ? "Pueblos africanos"
                        : "Povos africanos"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {currentLanguage === "en"
                    ? "Discover cultures & traditions"
                    : currentLanguage === "fr"
                      ? "Découvrir cultures & traditions"
                      : currentLanguage === "es"
                        ? "Descubrir culturas & tradiciones"
                        : "Descobrir culturas & tradições"}
                </p>
              </div>
              <Button className="w-full" variant="default">
                {currentLanguage === "en"
                  ? "View Peoples"
                  : currentLanguage === "fr"
                    ? "Voir les peuples"
                    : currentLanguage === "es"
                      ? "Ver pueblos"
                      : "Ver povos"}
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
                <h3 className="text-xl font-semibold mb-2">
                  {currentLanguage === "en"
                    ? "Countries"
                    : currentLanguage === "fr"
                      ? "Pays"
                      : currentLanguage === "es"
                        ? "Países"
                        : "Países"}
                </h3>
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
        </div>
      </div>
    </PageLayout>
  );
}
