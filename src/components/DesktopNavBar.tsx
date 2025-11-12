"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Language } from "@/types/ethnicity";
import { getTranslation } from "@/lib/translations";
import { getLocalizedRoute, getPageFromRoute } from "@/lib/routing";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "./LanguageSelector";
import { Home } from "lucide-react";

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

  const regionsRoute = getLocalizedRoute(language, "regions");
  const countriesRoute = getLocalizedRoute(language, "countries");
  const ethnicitiesRoute = getLocalizedRoute(language, "ethnicities");

  const currentPage = getPageFromRoute(pathname);
  const isHome = pathname === "/";
  const isAbout = pathname === "/about";

  const isActive = (pageType: "regions" | "countries" | "ethnicities" | "home" | "about") => {
    if (pageType === "home") return isHome;
    if (pageType === "about") return isAbout;
    return currentPage === pageType;
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card border-b shadow-sm hidden lg:block">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Navigation links */}
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button
                variant={isActive("home") ? "default" : "ghost"}
                size="sm"
                className="gap-2"
              >
                <Home className="h-4 w-4" />
                {language === "en"
                  ? "Home"
                  : language === "fr"
                  ? "Accueil"
                  : language === "es"
                  ? "Inicio"
                  : "Início"}
              </Button>
            </Link>
            <Link href={regionsRoute}>
              <Button
                variant={isActive("regions") ? "default" : "ghost"}
                size="sm"
              >
                {t.regions}
              </Button>
            </Link>
            <Link href={countriesRoute}>
              <Button
                variant={isActive("countries") ? "default" : "ghost"}
                size="sm"
              >
                {t.byCountry}
              </Button>
            </Link>
            <Link href={ethnicitiesRoute}>
              <Button
                variant={isActive("ethnicities") ? "default" : "ghost"}
                size="sm"
              >
                {t.byEthnicity}
              </Button>
            </Link>
            <Link href="/about">
              <Button
                variant={isActive("about") ? "default" : "ghost"}
                size="sm"
              >
                {t.whyThisSite}
              </Button>
            </Link>
          </div>

          {/* Language selector */}
          <div className="flex items-center">
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

