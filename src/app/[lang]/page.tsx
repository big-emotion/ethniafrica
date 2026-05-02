"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/hooks/use-language";
import { getTranslation } from "@/lib/translations";
import { getLocalizedRoute } from "@/lib/routing";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useIsMobile } from "@/hooks/use-mobile";
import { MapPin, Users, Search, Languages } from "lucide-react";
import { SearchModalV2 } from "@/components/search/SearchModalV2";
import { useParams } from "next/navigation";
import { getStats } from "@/lib/afrikLoader";
import type { GlobalStats, SearchEntityType } from "@/types/afrik-frontend";

export default function Home() {
  const params = useParams();
  const { language, setLanguage } = useLanguage();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [stats, setStats] = useState<GlobalStats | null>(null);

  const t = getTranslation(language);

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
  const familiesRoute = getLocalizedRoute(language, "families");
  const peoplesRoute = getLocalizedRoute(language, "peoples");
  const countriesRoute = getLocalizedRoute(language, "countries");

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
            Découvrez la Richesse de la Diversité des Groupes Ethniques Africains
          </h2>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
            Cette encyclopédie complète documente la diversité ethnique dans les 55 pays africains. Nos données fournissent des informations démographiques détaillées, permettant de comprendre la riche mosaïque culturelle qui compose le continent africain. Explorez les régions, pays et groupes ethniques pour découvrir les distributions démographiques, les connexions culturelles et la diversité linguistique.
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
            language={language}
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
                      Familles linguistiques
                    </h3>
                    <p className="text-2xl md:text-3xl font-display font-bold">
                      {stats.totalLanguageFamilies}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      documentées
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
                      Peuples africains
                    </h3>
                    <p className="text-2xl md:text-3xl font-display font-bold">
                      {stats.totalPeoples}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      recensés
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
                      Pays africains
                    </h3>
                    <p className="text-2xl md:text-3xl font-display font-bold">
                      {stats.totalCountries}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      couverts
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
                  Familles linguistiques
                </h3>
                <p className="text-sm text-muted-foreground">
                  Explorer la diversité linguistique
                </p>
              </div>
              <Button className="w-full" variant="default">
                Voir les familles
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
                  Peuples africains
                </h3>
                <p className="text-sm text-muted-foreground">
                  Découvrir cultures &amp; traditions
                </p>
              </div>
              <Button className="w-full" variant="default">
                Voir les peuples
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
                <h3 className="text-xl font-semibold mb-2">Pays</h3>
                <p className="text-sm text-muted-foreground">
                  Parcourir par pays
                </p>
              </div>
              <Button className="w-full" variant="default">
                Voir les pays
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}
