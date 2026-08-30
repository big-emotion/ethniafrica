"use client";

import { ReactNode, useState } from "react";
import { Language } from "@/types/shared";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteTrail } from "@/components/layout/SiteTrail";
import { SearchModalV2 } from "@/components/search/SearchModalV2";
import { KeyboardShortcutsModal } from "@/components/layout/KeyboardShortcutsModal";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePathname, useRouter } from "next/navigation";
import { getLocalizedRoute } from "@/lib/routing";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { PageHero } from "@/components/layout/PageHero";
import { heroVariantForPath } from "@/lib/layout/heroVariant";

interface PageLayoutProps {
  children: ReactNode;
  language: Language;
  /**
   * Vestigial since the site became French-only: kept so the fifteen-odd
   * callers still passing it keep compiling, read by nothing.
   */
  onLanguageChange?: (lang: Language) => void;
  title?: string;
  /**
   * The line that qualifies the title, inside the hero plate and above the
   * trail. Accepted since the shell was written and rendered nowhere until the
   * hero landed — eleven call sites were passing one into a void.
   */
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
  subtitle,
  sectionName,
  hideHeader = false,
  flushTop = false,
  trailLabel,
}: PageLayoutProps) => {
  const isMobile = useIsMobile();
  const router = useRouter();
  const pathname = usePathname();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  /**
   * A route that names itself gets a band; one that does not gets none.
   *
   * The third branch used to be the product name, so the three hubs — the
   * only routes passing neither `title` nor `sectionName` nor `hideHeader` —
   * opened on a second, larger copy of the masthead. Falling back to nothing
   * makes an unnamed page merely bandless rather than misnamed, and any route
   * that wants a band says what it is.
   */
  const displayTitle = sectionName || title;

  /**
   * Which band, and whether there is one at all. The height is a property of
   * the route (`heroVariant.ts`); whether the route names itself is a property
   * of the page. A route that names nothing gets no band rather than a band
   * with nothing in it.
   */
  const heroVariant = heroVariantForPath(pathname);
  const showHero = !hideHeader && Boolean(displayTitle);

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

      {/* The hero, and the trail it now carries.

          The trail belongs to the chrome, not to the page: it survives
          `hideHeader`, which the fiches pass because their own title stands
          over the globe and which would otherwise cost them the way back. So
          it is rendered either inside the plate or, on a bandless route, in
          the shell box on its own — never neither.

          It sits *under* the title rather than over it because a trail is read
          as what qualifies a title, not as what introduces one; and it sits
          *inside* the plate rather than under the band because two boxes put
          the trail and the title on two different verticals. */}
      {showHero ? (
        <PageHero
          variant={heroVariant}
          title={displayTitle}
          subtitle={subtitle}
          trail={<SiteTrail entityLabel={trailLabel} />}
        />
      ) : (
        <div className="afh-shell">
          <SiteTrail entityLabel={trailLabel} />
        </div>
      )}

      {/* Main Content */}
      <main
        className={`afh-shell ${
          flushTop ? (isMobile ? "pb-4" : "pb-8") : isMobile ? "py-4" : "py-8"
        }`}
      >
        {children}
      </main>

      <SiteFooter language={language} />
    </div>
  );
};
