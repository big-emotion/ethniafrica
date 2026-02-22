"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/hooks/use-language";
import { getLocalizedRoute } from "@/lib/routing";
import { PageLayout } from "@/components/layout/PageLayout";
import { CountryView } from "@/components/views/CountryView";
import { CountryDetailViewV2 } from "@/components/detail/CountryDetailViewV2";
import { Card } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import { getTranslation } from "@/lib/translations";
import { MapPin } from "lucide-react";
import type { CountrySummary } from "@/types/afrik-frontend";

function DefaultMessage({ language }: { language: string }) {
  const messages = {
    en: {
      title: "Select a country",
      description:
        "Choose a country from the list on the right to see detailed information about its peoples, history, and culture.",
    },
    fr: {
      title: "Sélectionnez un pays",
      description:
        "Choisissez un pays dans la liste à droite pour voir des informations détaillées sur ses peuples, son histoire et sa culture.",
    },
  };

  const msg = messages[language as keyof typeof messages] || messages.fr;

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-6 text-center">
      <MapPin className="h-16 w-16 text-muted-foreground/50" />
      <h2 className="text-xl font-semibold text-foreground">{msg.title}</h2>
      <p className="text-muted-foreground max-w-md">{msg.description}</p>
    </div>
  );
}

export function PaysPageContentV2() {
  const { language, setLanguage } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedCountry, setSelectedCountry] = useState<string | null>(
    searchParams.get("country")
  );
  const isMobile = useIsMobile();
  const t = getTranslation(language);

  useEffect(() => {
    const expected = getLocalizedRoute(language, "countries");
    if (pathname !== expected) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedCountry(null);
      router.replace(expected);
    }
  }, [language, pathname, router]);

  useEffect(() => {
    const countryParam = searchParams.get("country");
    if (countryParam) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedCountry(countryParam);
    }
  }, [searchParams]);

  const handleCountrySelect = (country: CountrySummary) => {
    setSelectedCountry(country.id);
    const url = new URL(window.location.href);
    url.searchParams.set("country", country.id);
    router.replace(url.pathname + url.search, { scroll: false });
  };

  const handlePeopleClick = (peopleId: string) => {
    const peoplesRoute = getLocalizedRoute(language, "peoples");
    router.push(`${peoplesRoute}?people=${peopleId}`);
  };

  const handleBack = () => {
    setSelectedCountry(null);
    router.replace(pathname);
  };

  return (
    <PageLayout
      language={language}
      onLanguageChange={setLanguage}
      sectionName={t.countries}
    >
      {isMobile ? (
        <div>
          {selectedCountry ? (
            <div
              className="min-h-screen"
              style={{ background: "var(--country-bg)" }}
            >
              <CountryDetailViewV2
                countryId={selectedCountry}
                language={language}
                onPeopleClick={handlePeopleClick}
                onBack={handleBack}
              />
            </div>
          ) : (
            <CountryView
              language={language}
              onCountrySelect={handleCountrySelect}
              hideSearchAndAlphabet={false}
            />
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
          {/* Detail view - Left (70%) */}
          <div
            className="lg:col-span-7 rounded-xl overflow-hidden"
            style={{ background: "var(--country-bg)" }}
          >
            {selectedCountry ? (
              <CountryDetailViewV2
                countryId={selectedCountry}
                language={language}
                onPeopleClick={handlePeopleClick}
                onBack={handleBack}
              />
            ) : (
              <DefaultMessage language={language} />
            )}
          </div>

          {/* List - Right (30%) */}
          <div className="lg:col-span-3 sticky top-0 self-start">
            <Card className="shadow-soft">
              <CountryView
                language={language}
                onCountrySelect={handleCountrySelect}
                selectedCountryId={selectedCountry}
              />
            </Card>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
