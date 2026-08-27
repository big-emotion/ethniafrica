"use client";

import { ReactNode, useState } from "react";
import { Language } from "@/types/shared";
import { getTranslation } from "@/lib/translations";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SearchModalV2 } from "@/components/search/SearchModalV2";
import { KeyboardShortcutsModal } from "@/components/layout/KeyboardShortcutsModal";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import type { SearchEntityType } from "@/types/afrik-frontend";
import { useIsMobile } from "@/hooks/use-mobile";
import { useRouter } from "next/navigation";
import { getFamilyRoute, getLocalizedRoute } from "@/lib/routing";
import Image from "next/image";
import { SiteFooter } from "@/components/layout/SiteFooter";

interface PageLayoutProps {
  children: ReactNode;
  language: Language;
  /**
   * Vestigial since the site became French-only: kept so the fifteen-odd
   * callers still passing it keep compiling, read by nothing.
   */
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
  title,
  sectionName,
  hideHeader = false,
  flushTop = false,
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
          router.push(getFamilyRoute(language, result.id));
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
      {/* One bar for every width. The two it replaces were picked apart by
          `useIsMobile()`, so the server sent one and the client swapped in
          the other; the switch is now a media query inside the bar and the
          first paint is the right one. */}
      <SiteHeader
        language={language}
        onSearchClick={() => setIsSearchOpen(true)}
      />

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
