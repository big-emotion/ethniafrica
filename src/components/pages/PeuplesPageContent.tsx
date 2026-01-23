"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/hooks/use-language";
import { getLocalizedRoute } from "@/lib/routing";
import { PageLayout } from "@/components/PageLayout";
import { PeopleView } from "@/components/PeopleView";
import { PeopleDetailView } from "@/components/PeopleDetailView";
import { Card } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import { getTranslation } from "@/lib/translations";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users } from "lucide-react";
import type { PeopleSummary } from "@/types/afrik-frontend";

function DefaultMessage({ language }: { language: string }) {
  const t = getTranslation(language as "en" | "fr" | "es" | "pt");

  const messages = {
    en: {
      title: "Select a people",
      description:
        "Choose a people from the list on the right to see detailed information about their culture, history, and traditions.",
    },
    fr: {
      title: "Sélectionnez un peuple",
      description:
        "Choisissez un peuple dans la liste à droite pour voir des informations détaillées sur leur culture, histoire et traditions.",
    },
    es: {
      title: "Seleccione un pueblo",
      description:
        "Elija un pueblo de la lista a la derecha para ver información detallada sobre su cultura, historia y tradiciones.",
    },
    pt: {
      title: "Selecione um povo",
      description:
        "Escolha um povo da lista à direita para ver informações detalhadas sobre sua cultura, história e tradições.",
    },
  };

  const msg = messages[language as keyof typeof messages] || messages.fr;

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-6 text-center">
      <Users className="h-16 w-16 text-muted-foreground/50" />
      <h2 className="text-xl font-semibold text-foreground">{msg.title}</h2>
      <p className="text-muted-foreground max-w-md">{msg.description}</p>
    </div>
  );
}

export function PeuplesPageContent() {
  const { language, setLanguage } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedPeople, setSelectedPeople] = useState<string | null>(
    searchParams.get("people")
  );
  const isMobile = useIsMobile();
  const t = getTranslation(language);

  useEffect(() => {
    const expected = getLocalizedRoute(language, "peoples");
    if (pathname !== expected) {
      setSelectedPeople(null);
      router.replace(expected);
    }
  }, [language, pathname, router]);

  useEffect(() => {
    const peopleParam = searchParams.get("people");
    if (peopleParam) {
      setSelectedPeople(peopleParam);
    }
  }, [searchParams]);

  const handlePeopleSelect = (people: PeopleSummary) => {
    setSelectedPeople(people.id);
    const url = new URL(window.location.href);
    url.searchParams.set("people", people.id);
    router.replace(url.pathname + url.search, { scroll: false });
  };

  const handleCountryClick = (countryId: string) => {
    const countriesRoute = getLocalizedRoute(language, "countries");
    router.push(`${countriesRoute}?country=${countryId}`);
  };

  const handleFamilyClick = (familyId: string) => {
    const familiesRoute = getLocalizedRoute(language, "families");
    router.push(`${familiesRoute}?family=${familyId}`);
  };

  const handleBack = () => {
    setSelectedPeople(null);
    router.replace(pathname);
  };

  const getSectionName = () => {
    switch (language) {
      case "en":
        return "Peoples";
      case "fr":
        return "Peuples";
      case "es":
        return "Pueblos";
      case "pt":
        return "Povos";
      default:
        return "Peuples";
    }
  };

  const getBackText = () => {
    switch (language) {
      case "en":
        return "Back";
      case "fr":
        return "Retour";
      case "es":
        return "Volver";
      case "pt":
        return "Voltar";
      default:
        return "Retour";
    }
  };

  return (
    <PageLayout
      language={language}
      onLanguageChange={setLanguage}
      sectionName={getSectionName()}
    >
      {isMobile ? (
        <div>
          {selectedPeople ? (
            <div className="space-y-4">
              <Button variant="ghost" onClick={handleBack} className="mb-2">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {getBackText()}
              </Button>
              <Card className="shadow-soft w-full">
                <PeopleDetailView
                  peopleId={selectedPeople}
                  language={language}
                  onCountryClick={handleCountryClick}
                  onFamilyClick={handleFamilyClick}
                />
              </Card>
            </div>
          ) : (
            <PeopleView
              language={language}
              onPeopleSelect={handlePeopleSelect}
              hideSearchAndAlphabet={false}
            />
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
          {/* Detail view - Left (70%) */}
          <div className="lg:col-span-7">
            <Card className="shadow-soft h-full">
              {selectedPeople ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border-b">
                    <Button variant="ghost" onClick={handleBack}>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      {getBackText()}
                    </Button>
                  </div>
                  <PeopleDetailView
                    peopleId={selectedPeople}
                    language={language}
                    onCountryClick={handleCountryClick}
                    onFamilyClick={handleFamilyClick}
                  />
                </div>
              ) : (
                <DefaultMessage language={language} />
              )}
            </Card>
          </div>

          {/* List - Right (30%) */}
          <div className="lg:col-span-3 sticky top-0 self-start">
            <Card className="shadow-soft">
              <PeopleView
                language={language}
                onPeopleSelect={handlePeopleSelect}
                selectedPeopleId={selectedPeople}
              />
            </Card>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
