"use client";

import { ReactNode, useState } from "react";
import { Language } from "@/types/shared";
import { getTranslation } from "@/lib/translations";
import { MobileNavBar } from "@/components/MobileNavBar";
import { DesktopNavBar } from "@/components/layout/DesktopNavBar";
import { SearchModalV2 } from "@/components/search/SearchModalV2";
import { KeyboardShortcutsModal } from "@/components/layout/KeyboardShortcutsModal";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import type { SearchEntityType } from "@/types/afrik-frontend";
import { useIsMobile } from "@/hooks/use-mobile";
import { useRouter } from "next/navigation";
import { getLocalizedRoute } from "@/lib/routing";
import Image from "next/image";

interface PageLayoutProps {
  children: ReactNode;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  title?: string;
  subtitle?: string;
  sectionName?: string;
  hideHeader?: boolean;
  onSearchResult?: (result: {
    type: SearchEntityType;
    id: string;
    name: string;
  }) => void;
}

export const PageLayout = ({
  children,
  language,
  onLanguageChange,
  title,
  sectionName,
  hideHeader = false,
  onSearchResult,
}: PageLayoutProps) => {
  const isMobile = useIsMobile();
  const router = useRouter();
  const t = getTranslation(language);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  const displayTitle = sectionName || title || t.title;

  const handleSearchResult = (result: {
    type: SearchEntityType;
    id: string;
    name: string;
  }) => {
    if (onSearchResult) {
      onSearchResult(result);
    } else {
      switch (result.type) {
        case "languageFamily":
          router.push(
            `${getLocalizedRoute(language, "families")}?family=${result.id}`
          );
          break;
        case "people":
          router.push(
            `${getLocalizedRoute(language, "peoples")}?people=${result.id}`
          );
          break;
        case "country":
          router.push(
            `${getLocalizedRoute(language, "countries")}?country=${result.id}`
          );
          break;
        default:
          console.warn("Unknown search result type:", result.type);
      }
    }
    setIsSearchOpen(false);
  };

  useKeyboardShortcuts({
    navigate: (path) => router.push(path),
    openSearch: () => setIsSearchOpen(true),
    openShortcutsModal: () => setIsShortcutsOpen(true),
    searchRoute: getLocalizedRoute(language, "search"),
    peoplesRoute: getLocalizedRoute(language, "peoples"),
    familiesRoute: getLocalizedRoute(language, "families"),
  });

  return (
    <div className="min-h-screen gradient-earth">
      {/* Desktop navigation */}
      {!isMobile && (
        <DesktopNavBar
          language={language}
          onLanguageChange={onLanguageChange}
        />
      )}

      {/* Mobile navigation */}
      {isMobile && (
        <MobileNavBar
          language={language}
          onLanguageChange={onLanguageChange}
          onSearchClick={() => setIsSearchOpen(true)}
        />
      )}

      {/* Search modal */}
      <SearchModalV2
        open={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        language={language}
        onResultSelect={handleSearchResult}
      />

      {/* Keyboard shortcuts cheatsheet */}
      <KeyboardShortcutsModal
        open={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* Header */}
      {!hideHeader && (
        <header
          className={`border-b bg-card shadow-soft ${
            isMobile ? "pt-[57px]" : "pt-14"
          }`}
        >
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
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
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main
        className={`container mx-auto px-4 ${hideHeader ? (isMobile ? "pt-24 pb-4" : "pt-28 pb-8") : isMobile ? "py-4" : "py-8"}`}
      >
        {children}
      </main>

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
