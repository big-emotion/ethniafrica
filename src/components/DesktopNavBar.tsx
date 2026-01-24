"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Language } from "@/types/ethnicity";
import { getTranslation } from "@/lib/translations";
import { getLocalizedRoute, getPageFromRoute, PageType } from "@/lib/routing";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "./LanguageSelector";
import Image from "next/image";

interface DesktopNavBarProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
}

export const DesktopNavBar = ({
  language,
  onLanguageChange,
}: DesktopNavBarProps) => {
  const t = getTranslation(language);
  const pathname = usePathname();

  // AFRIK v2 routes
  const familiesRoute = getLocalizedRoute(language, "families");
  const peoplesRoute = getLocalizedRoute(language, "peoples");
  const countriesRoute = getLocalizedRoute(language, "countries");

  const currentPage = getPageFromRoute(pathname);
  const isHome = pathname === `/${language}` || pathname === "/";
  const isAbout = pathname === `/${language}/about` || pathname === "/about";
  const isContribute =
    pathname === `/${language}/contribute` || pathname === "/contribute";
  const isReportError =
    pathname === `/${language}/report-error` || pathname === "/report-error";

  const isActive = (
    pageType: PageType | "home" | "about" | "contribute" | "report-error"
  ) => {
    if (pageType === "home") return isHome;
    if (pageType === "about") return isAbout;
    if (pageType === "contribute") return isContribute;
    if (pageType === "report-error") return isReportError;
    return currentPage === pageType;
  };

  const getNavLabels = () => {
    switch (language) {
      case "en":
        return {
          families: "Language Families",
          peoples: "Peoples",
          countries: "Countries",
        };
      case "es":
        return {
          families: "Familias lingüísticas",
          peoples: "Pueblos",
          countries: "Países",
        };
      case "pt":
        return {
          families: "Famílias linguísticas",
          peoples: "Povos",
          countries: "Países",
        };
      default:
        return {
          families: "Familles linguistiques",
          peoples: "Peuples",
          countries: "Pays",
        };
    }
  };

  const navLabels = getNavLabels();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card border-b shadow-sm hidden lg:block">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Navigation links */}
          <div className="flex items-center gap-2">
            <Link href={`/${language}`}>
              <Button
                variant={isActive("home") ? "default" : "ghost"}
                size="sm"
                className="gap-2"
              >
                <Image
                  src="/africa.png"
                  alt="Africa"
                  width={20}
                  height={20}
                  className="object-contain"
                />
                {language === "en"
                  ? "Home"
                  : language === "fr"
                    ? "Accueil"
                    : language === "es"
                      ? "Inicio"
                      : "Início"}
              </Button>
            </Link>
            <Link href={familiesRoute}>
              <Button
                variant={isActive("families") ? "default" : "ghost"}
                size="sm"
              >
                {navLabels.families}
              </Button>
            </Link>
            <Link href={peoplesRoute}>
              <Button
                variant={isActive("peoples") ? "default" : "ghost"}
                size="sm"
              >
                {navLabels.peoples}
              </Button>
            </Link>
            <Link href={countriesRoute}>
              <Button
                variant={isActive("countries") ? "default" : "ghost"}
                size="sm"
              >
                {navLabels.countries}
              </Button>
            </Link>
          </div>

          {/* Right side: About, Contribute, Report Error, Language selector */}
          <div className="flex items-center gap-2">
            <Link href={`/${language}/about`}>
              <Button
                variant={isActive("about") ? "default" : "ghost"}
                size="sm"
              >
                {t.whyThisSite}
              </Button>
            </Link>
            <Button
              variant={isActive("contribute") ? "default" : "ghost"}
              size="sm"
              onClick={() => {
                window.location.href = `/${language}/contribute`;
              }}
            >
              {language === "en"
                ? "Contribute"
                : language === "fr"
                  ? "Contribuer"
                  : language === "es"
                    ? "Contribuir"
                    : "Contribuir"}
            </Button>
            <Button
              variant={isActive("report-error") ? "default" : "ghost"}
              size="sm"
              onClick={() => {
                window.location.href = `/${language}/report-error`;
              }}
            >
              {language === "en"
                ? "Report Error"
                : language === "fr"
                  ? "Signaler une erreur"
                  : language === "es"
                    ? "Reportar error"
                    : "Reportar erro"}
            </Button>
            <LanguageSelector
              currentLang={language}
              onLanguageChange={onLanguageChange}
            />
          </div>
        </div>
      </div>
    </nav>
  );
};
