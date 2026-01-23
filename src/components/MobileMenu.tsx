"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Language } from "@/types/ethnicity";
import { getTranslation } from "@/lib/translations";
import { getLocalizedRoute, getPageFromRoute, PageType } from "@/lib/routing";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "./LanguageSelector";
import { Separator } from "@/components/ui/separator";
import { Search } from "lucide-react";

interface MobileMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onSearchClick?: () => void;
}

export const MobileMenu = ({
  open,
  onOpenChange,
  language,
  onLanguageChange,
  onSearchClick,
}: MobileMenuProps) => {
  const t = getTranslation(language);
  const pathname = usePathname();

  // AFRIK v2 routes
  const familiesRoute = getLocalizedRoute(language, "families");
  const peoplesRoute = getLocalizedRoute(language, "peoples");
  const countriesRoute = getLocalizedRoute(language, "countries");

  const currentPage = getPageFromRoute(pathname);
  const isActive = (pageType: PageType) => {
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[280px] sm:w-[300px]">
        <SheetHeader>
          <SheetTitle>{t.title}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4 mt-6">
          {/* Navigation links */}
          <div className="flex flex-col gap-2">
            <Link href={`/${language}`} onClick={() => onOpenChange(false)}>
              <Button
                variant={
                  pathname === `/${language}` || pathname === "/"
                    ? "default"
                    : "ghost"
                }
                className="w-full justify-start"
              >
                {language === "en"
                  ? "Home"
                  : language === "fr"
                    ? "Accueil"
                    : language === "es"
                      ? "Inicio"
                      : "Início"}
              </Button>
            </Link>
            <Link href={familiesRoute} onClick={() => onOpenChange(false)}>
              <Button
                variant={isActive("families") ? "default" : "ghost"}
                className="w-full justify-start"
              >
                {navLabels.families}
              </Button>
            </Link>
            <Link href={peoplesRoute} onClick={() => onOpenChange(false)}>
              <Button
                variant={isActive("peoples") ? "default" : "ghost"}
                className="w-full justify-start"
              >
                {navLabels.peoples}
              </Button>
            </Link>
            <Link href={countriesRoute} onClick={() => onOpenChange(false)}>
              <Button
                variant={isActive("countries") ? "default" : "ghost"}
                className="w-full justify-start"
              >
                {navLabels.countries}
              </Button>
            </Link>
          </div>

          <Separator />

          {/* Search CTA */}
          {onSearchClick && (
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => {
                onOpenChange(false);
                onSearchClick();
              }}
            >
              <Search className="h-4 w-4 mr-2" />
              {language === "en"
                ? "Search"
                : language === "fr"
                  ? "Rechercher"
                  : language === "es"
                    ? "Buscar"
                    : "Pesquisar"}
            </Button>
          )}

          <Separator />

          {/* About link */}
          <Link href={`/${language}/about`} onClick={() => onOpenChange(false)}>
            <Button variant="ghost" className="w-full justify-start">
              {t.whyThisSite}
            </Button>
          </Link>

          {/* Contribute link */}
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => {
              onOpenChange(false);
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

          {/* Report Error link */}
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => {
              onOpenChange(false);
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

          <Separator />

          {/* Language selector */}
          <div className="px-2">
            <LanguageSelector
              currentLang={language}
              onLanguageChange={(lang) => {
                onLanguageChange(lang);
                // Close menu after language change
                setTimeout(() => onOpenChange(false), 100);
              }}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
