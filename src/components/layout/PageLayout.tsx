"use client";

import { ReactNode, useRef, useState } from "react";
import { Language } from "@/types/shared";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteTrail } from "@/components/layout/SiteTrail";
import { SearchModalV2 } from "@/components/search/SearchModalV2";
import { KeyboardShortcutsModal } from "@/components/layout/KeyboardShortcutsModal";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useIsMobile } from "@/hooks/use-mobile";
import { useRouter } from "next/navigation";
import { getLocalizedRoute } from "@/lib/routing";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { BackToTop } from "@/components/layout/BackToTop";
import { PageHero } from "@/components/layout/PageHero";

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
  /**
   * A head the page composed itself, filling the hero plate in place of
   * `title` and `subtitle`.
   *
   * The three fiches and the three facets each name their subject in a way two
   * strings cannot hold — an autonym beside its exonym and the `lang`
   * attribute that makes the pair readable, a corpus identifier and a
   * reference year, a provenance line. They used to pass `hideHeader` and
   * raise that head in a box of their own, which cost them the plate and sent
   * the trail back to a second container on a second vertical.
   */
  heroHead?: ReactNode;
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
  heroHead,
  sectionName,
  hideHeader = false,
  flushTop = false,
  trailLabel,
}: PageLayoutProps) => {
  const isMobile = useIsMobile();
  const router = useRouter();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  // Held by the shell rather than looked up in the document, because a
  // streaming route leaves inert copies of its own chrome in the body.
  const mastheadRef = useRef<HTMLElement>(null);

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
   * Whether there is a band at all. One height for every route — the band
   * used to have a second, screen-tall one for the home and the three hubs,
   * and it put a hub's title under a full screen of empty parchment. A route
   * that names nothing still gets no band, rather than a band with nothing in
   * it.
   */
  const showHero = !hideHeader && Boolean(heroHead || displayTitle);

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
        mastheadRef={mastheadRef}
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
          `hideHeader`, which the legal pages and the home still pass, and
          which would otherwise cost them the way back. So it is rendered
          either inside the plate or, on a bandless route, in the shell box on
          its own — never neither.

          It sits *under* the title rather than over it because a trail is read
          as what qualifies a title, not as what introduces one; and it sits
          *inside* the plate rather than under the band because two boxes put
          the trail and the title on two different verticals. */}
      {showHero ? (
        <PageHero
          title={displayTitle}
          subtitle={subtitle}
          head={heroHead}
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

      {/* Last in the document, because it is the only thing on the page that
          answers "take me out of it" — and a reader who has tabbed to the
          footer is exactly who needs it. */}
      <BackToTop returnFocusTo={mastheadRef} />
    </div>
  );
};
