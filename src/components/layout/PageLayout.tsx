"use client";

import { ReactNode, useState } from "react";
import { Language } from "@/types/shared";
import { getTranslation } from "@/lib/translations";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteTrail } from "@/components/layout/SiteTrail";
import { SearchModalV2 } from "@/components/search/SearchModalV2";
import { KeyboardShortcutsModal } from "@/components/layout/KeyboardShortcutsModal";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useIsMobile } from "@/hooks/use-mobile";
import { useRouter } from "next/navigation";
import { getLocalizedRoute } from "@/lib/routing";
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
   * against the chrome instead of behind a strip of page background.
   *
   * "The chrome" now includes the trail, which sits between the nav and main.
   * A full-bleed child still starts flush against what is above it; what is
   * above it is one line taller.
   */
  flushTop?: boolean;
  /**
   * How the trail should name the identifier in the address, on a route whose
   * path holds one. A fiche knows its own name and nothing else does — see
   * `SiteTrail`.
   */
  trailLabel?: string;
}

// @req REQ-043
export const PageLayout = ({
  children,
  language,
  title,
  sectionName,
  hideHeader = false,
  flushTop = false,
  trailLabel,
}: PageLayoutProps) => {
  const isMobile = useIsMobile();
  const router = useRouter();
  const t = getTranslation(language);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  const displayTitle = sectionName || title || t.title;

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
      />

      {/* Keyboard shortcuts cheatsheet */}
      <KeyboardShortcutsModal
        open={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* The trail belongs to the chrome, not to the page: it sits here, above
          both the optional title band and main, so it survives `hideHeader`.
          The fiches pass `hideHeader` precisely because their own title stands
          over the globe, and they are the routes that had a trail already —
          losing it there would be trading one gap for another. */}
      <div className="container mx-auto">
        <SiteTrail entityLabel={trailLabel} />
      </div>

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
                  <h1 className="text-afh-h1 font-display font-bold text-foreground page-title-gradient">
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
