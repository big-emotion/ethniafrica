"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Language } from "@/types/shared";
import { getTranslation } from "@/lib/translations";
import { getLocalizedRoute, getPageFromRoute, PageType } from "@/lib/routing";
import { Button } from "@/components/ui/button";
import Image from "next/image";

interface DesktopNavBarProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
}

export const DesktopNavBar = ({
  language,
  onLanguageChange: _onLanguageChange,
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
                Accueil
              </Button>
            </Link>
            <Link href={familiesRoute}>
              <Button
                variant={isActive("families") ? "default" : "ghost"}
                size="sm"
              >
                Familles linguistiques
              </Button>
            </Link>
            <Link href={peoplesRoute}>
              <Button
                variant={isActive("peoples") ? "default" : "ghost"}
                size="sm"
              >
                Peuples
              </Button>
            </Link>
            <Link href={countriesRoute}>
              <Button
                variant={isActive("countries") ? "default" : "ghost"}
                size="sm"
              >
                Pays
              </Button>
            </Link>
          </div>

          {/* Right side: About, Contribute, Report Error */}
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
              Contribuer
            </Button>
            <Button
              variant={isActive("report-error") ? "default" : "ghost"}
              size="sm"
              onClick={() => {
                window.location.href = `/${language}/report-error`;
              }}
            >
              Signaler une erreur
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};
