"use client";

import { ReactNode, useState } from "react";
import { Language } from "@/types/ethnicity";
import { getTranslation } from "@/lib/translations";
import { LanguageSelector } from "@/components/LanguageSelector";
import { MobileNavBar } from "@/components/MobileNavBar";
import { DesktopNavBar } from "@/components/DesktopNavBar";
import { MobileSearchBar } from "@/components/MobileSearchBar";
import { SearchModal } from "@/components/SearchModal";
import { useIsMobile } from "@/hooks/use-mobile";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { getLocalizedRoute } from "@/lib/routing";
import Image from "next/image";

interface PageLayoutProps {
  children: ReactNode;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  title?: string;
  subtitle?: string;
  onSearchResult?: (result: {
    type: "ethnicity" | "country";
    name: string;
    region?: string;
    regionName?: string;
  }) => void;
}

export const PageLayout = ({
  children,
  language,
  onLanguageChange,
  title,
  subtitle,
  onSearchResult,
}: PageLayoutProps) => {
  const isMobile = useIsMobile();
  const router = useRouter();
  const t = getTranslation(language);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const displayTitle = title || t.title;
  const displaySubtitle = subtitle || t.subtitle;

  const handleSearchResult = (result: {
    type: "ethnicity" | "country";
    name: string;
    region?: string;
    regionName?: string;
  }) => {
    if (onSearchResult) {
      onSearchResult(result);
    } else {
      // Default behavior: redirect to appropriate page
      if (result.type === "country") {
        const route = getLocalizedRoute(language, "countries");
        router.push(`${route}?country=${encodeURIComponent(result.name)}`);
      } else if (result.type === "ethnicity") {
        const route = getLocalizedRoute(language, "ethnicities");
        router.push(`${route}?ethnicity=${encodeURIComponent(result.name)}`);
      }
    }
    setIsSearchOpen(false);
  };

  return (
    <div className="min-h-screen gradient-earth">
      {/* Barre de navigation desktop */}
      {!isMobile && (
        <DesktopNavBar language={language} onLanguageChange={onLanguageChange} />
      )}

      {/* Barre de navigation mobile */}
      {isMobile && (
        <MobileNavBar language={language} onLanguageChange={onLanguageChange} />
      )}

      {/* Barre de recherche mobile */}
      {isMobile && (
        <>
          <MobileSearchBar
            onSearchClick={() => setIsSearchOpen(true)}
            isSearchOpen={isSearchOpen}
            language={language}
          />
          <SearchModal
            open={isSearchOpen}
            onClose={() => setIsSearchOpen(false)}
            language={language}
            onResultSelect={handleSearchResult}
          />
        </>
      )}

      {/* Header */}
      <header
        className={`border-b bg-card shadow-soft ${
          isMobile ? "pt-[114px]" : "pt-20"
        }`}
      >
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Image
                  src="/africa.png"
                  alt="Africa"
                  width={48}
                  height={48}
                  className="object-contain"
                />
                <h1
                  className="text-3xl md:text-4xl font-display font-bold text-foreground bg-clip-text text-transparent gradient-warm"
                  style={{
                    backgroundClip: "text",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {displayTitle}
                </h1>
              </div>
              <p className="text-sm md:text-base text-muted-foreground">
                {displaySubtitle}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={`container mx-auto px-4 ${isMobile ? "py-4" : "py-8"}`}>{children}</main>

      {/* Footer */}
      <footer className="border-t bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p className="text-center md:text-left">
              © 2025 African Ethnicities Dictionary | Data sources: Official
              demographic estimates 2025
            </p>
            <div className="flex items-center gap-2 text-center">
              <span>{t.madeWithEmotion}</span>
              <div className="flex items-center gap-1">
                <span className="font-bold text-yellow-500">BIG</span>
                <span className="font-bold text-foreground">EMOTION</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
