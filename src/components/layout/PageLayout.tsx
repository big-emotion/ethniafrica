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
import { SiteFooter } from "@/components/layout/SiteFooter";

interface PageLayoutProps {
  children: ReactNode;
  language: Language;
  onLanguageChange?: (lang: Language) => void;
  title?: string;
  subtitle?: string;
  sectionName?: string;
  hideHeader?: boolean;
  /**
   * Drop main's top padding so a full-bleed first child (one that escapes the
   * container with 100vw + negative margins, like HomeHero) starts flush
   * against the nav instead of behind a strip of page background.
   */
  flushTop?: boolean;
  /**
   * Puts the nav on the night surface so it reads as the top edge of a night
   * hero band rather than a strip above it. Scoping, not restyling: the bar
   * keeps every one of its own tokens and only the values behind them change.
   *
   * This existed before, for the home hero, and was removed in 8ee71004
   * because that band fills the viewport — pressing light/dark changed nothing
   * the reader could see, and the theme control looked broken on that route
   * alone. It is right for a fiche and wrong for the home for one reason: a
   * fiche's band is a bounded 470–520px with the themed parchment immediately
   * below it, so a theme change is visible at once. Never pass this from a
   * route whose night band fills the viewport.
   */
  navOnNight?: boolean;
  onSearchResult?: (result: {
    type: SearchEntityType;
    id: string;
    name: string;
  }) => void;
}

// @req REQ-043
export const PageLayout = ({
  children,
  language,
  onLanguageChange = () => undefined,
  title,
  sectionName,
  hideHeader = false,
  flushTop = false,
  navOnNight = false,
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
      <div
        className={navOnNight ? "afh-on-night" : undefined}
        data-testid={navOnNight ? "nav-on-night" : undefined}
      >
        {/* Desktop navigation */}
        {!isMobile && (
          <DesktopNavBar
            language={language}
            onLanguageChange={onLanguageChange}
            onSearchClick={() => setIsSearchOpen(true)}
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
      </div>

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
        <header className="border-b bg-card shadow-soft">
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
                  <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground page-title-gradient">
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
        className={`container mx-auto px-4 ${
          flushTop ? (isMobile ? "pb-4" : "pb-8") : isMobile ? "py-4" : "py-8"
        }`}
      >
        {children}
      </main>

      <SiteFooter language={language} />
    </div>
  );
};
