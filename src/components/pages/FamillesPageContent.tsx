"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/hooks/use-language";
import { getLocalizedRoute } from "@/lib/routing";
import { PageLayout } from "@/components/layout/PageLayout";
import { LanguageFamilyView } from "@/components/views/LanguageFamilyView";
import { LanguageFamilyDetailView } from "@/components/detail/LanguageFamilyDetailView";
import { Card } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import { getTranslation } from "@/lib/translations";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Languages } from "lucide-react";
import type { LanguageFamilySummary } from "@/types/afrik-frontend";

function DefaultMessage({ language }: { language: string }) {
  const t = getTranslation(language as "en" | "fr" | "es" | "pt");

  const messages = {
    en: {
      title: "Select a language family",
      description:
        "Choose a language family from the list on the right to see detailed information about it.",
    },
    fr: {
      title: "Sélectionnez une famille linguistique",
      description:
        "Choisissez une famille linguistique dans la liste à droite pour voir ses informations détaillées.",
    },
    es: {
      title: "Seleccione una familia lingüística",
      description:
        "Elija una familia lingüística de la lista a la derecha para ver información detallada.",
    },
    pt: {
      title: "Selecione uma família linguística",
      description:
        "Escolha uma família linguística da lista à direita para ver informações detalhadas.",
    },
  };

  const msg = messages[language as keyof typeof messages] || messages.fr;

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-6 text-center">
      <Languages className="h-16 w-16 text-muted-foreground/50" />
      <h2 className="text-xl font-semibold text-foreground">{msg.title}</h2>
      <p className="text-muted-foreground max-w-md">{msg.description}</p>
    </div>
  );
}

export function FamillesPageContent() {
  const { language, setLanguage } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedFamily, setSelectedFamily] = useState<string | null>(
    searchParams.get("family")
  );
  const isMobile = useIsMobile();
  const t = getTranslation(language);

  useEffect(() => {
    const expected = getLocalizedRoute(language, "families");
    if (pathname !== expected) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedFamily(null);
      router.replace(expected);
    }
  }, [language, pathname, router]);

  useEffect(() => {
    const familyParam = searchParams.get("family");
    if (familyParam) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedFamily(familyParam);
    }
  }, [searchParams]);

  const handleFamilySelect = (family: LanguageFamilySummary) => {
    setSelectedFamily(family.id);
    const url = new URL(window.location.href);
    url.searchParams.set("family", family.id);
    router.replace(url.pathname + url.search, { scroll: false });
  };

  const handlePeopleClick = (peopleId: string) => {
    const peoplesRoute = getLocalizedRoute(language, "peoples");
    router.push(`${peoplesRoute}?people=${peopleId}`);
  };

  const handleBack = () => {
    setSelectedFamily(null);
    router.replace(pathname);
  };

  const getSectionName = () => {
    switch (language) {
      case "en":
        return "Language Families";
      case "fr":
        return "Familles linguistiques";
      case "es":
        return "Familias lingüísticas";
      case "pt":
        return "Famílias linguísticas";
      default:
        return "Familles linguistiques";
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
          {selectedFamily ? (
            <div className="space-y-4">
              <Button variant="ghost" onClick={handleBack} className="mb-2">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {getBackText()}
              </Button>
              <Card className="shadow-soft w-full">
                <LanguageFamilyDetailView
                  familyId={selectedFamily}
                  language={language}
                  onPeopleClick={handlePeopleClick}
                />
              </Card>
            </div>
          ) : (
            <LanguageFamilyView
              language={language}
              onFamilySelect={handleFamilySelect}
              hideSearchAndAlphabet={false}
            />
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
          {/* Detail view - Left (70%) */}
          <div className="lg:col-span-7">
            <Card className="shadow-soft h-full">
              {selectedFamily ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border-b">
                    <Button variant="ghost" onClick={handleBack}>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      {getBackText()}
                    </Button>
                  </div>
                  <LanguageFamilyDetailView
                    familyId={selectedFamily}
                    language={language}
                    onPeopleClick={handlePeopleClick}
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
              <LanguageFamilyView
                language={language}
                onFamilySelect={handleFamilySelect}
                selectedFamilyId={selectedFamily}
              />
            </Card>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
