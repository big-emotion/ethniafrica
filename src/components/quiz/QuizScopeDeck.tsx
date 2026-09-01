"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import { QuizTrackCard } from "@/components/quiz/QuizTrackCard";
import {
  QuizThemePanel,
  type QuizThemePanelTheme,
} from "@/components/quiz/QuizThemePanel";
import { cn } from "@/lib/utils";

export interface QuizScopeDeckItem {
  id: string;
  labelFr: string;
  /** The themes this track can fill. Empty means the card only ever navigates. */
  playableThemeIds: string[];
}

export interface QuizScopeDeckProps {
  items: QuizScopeDeckItem[];
  /**
   * Every theme the corpus has, as `{ id, labelFr }`.
   *
   * A prop rather than an import: pulling `@/lib/translations` in here would
   * drag the whole translations object into the client chunk for nine labels.
   */
  themes: QuizThemePanelTheme[];
  /**
   * The quiz page's own path. Hrefs are composed here rather than handed in as
   * builders: the picker is a server component and this one is a client
   * component, and **a function cannot cross that boundary** — passing one
   * renders the whole route as a 500. `AtlasGlobe` carries the same note for
   * the same reason.
   */
  action: string;
  panelHintFr: string;
  wholeTrackLabelFr: string;
  closeLabelFr: string;
  className?: string;
}

/**
 * The country cards, and the themes one of them deploys when tapped.
 *
 * **Server-rendered, not `dynamic({ ssr: false })`.** That pattern is for an
 * ornament sitting over a guaranteed path — `FacetGlobeIsland` over its list.
 * Here the cards *are* the content, and `ssr: false` renders nothing on the
 * server, children included, so a reader with no JavaScript would lose every
 * country. Server output and the closed hydrated state are the same markup: 54
 * real links to 54 real tracks. What that reader loses is the *crossing* of two
 * axes, and only that.
 *
 * One piece of state, and it deliberately never touches the router. A *chosen*
 * track stays bookmarkable — the card and every chip are real navigations the
 * page already parses — but a half-made choice is not a page, and putting it in
 * the URL would drag `useSearchParams` and a Suspense boundary onto a server
 * page to describe a menu being open.
 *
 * The four mechanics — cancelled click, `aria-expanded`/`aria-controls`, focus
 * return, document-level Escape — are `AccessAxes`'s, copied rather than
 * imported: that component is bolted to the home's WebGL geometry and cannot be
 * reused, but its gesture is exactly the one asked for here.
 */
// @req REQ-121
export const QuizScopeDeck = ({
  items,
  themes,
  action,
  panelHintFr,
  wholeTrackLabelFr,
  closeLabelFr,
  className,
}: QuizScopeDeckProps) => {
  const domId = useId();
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const panelRef = useRef<HTMLDivElement | null>(null);

  const close = useCallback(() => {
    setOpenItemId((current) => {
      // The card is where the reader's attention was when they opened the
      // panel, so it is where focus has to come back to.
      if (current) cardRefs.current[current]?.focus();
      return null;
    });
  }, []);

  useEffect(() => {
    if (!openItemId) return;
    panelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [openItemId, close]);

  const themesFor = (item: QuizScopeDeckItem) =>
    themes.filter((theme) => (item.playableThemeIds ?? []).includes(theme.id));

  const trackHref = (itemId: string) => `${action}?pays=${itemId}`;
  const crossedHref = (itemId: string, themeId: string) =>
    `${action}?pays=${itemId}&theme=${themeId}`;

  return (
    <ul
      className={cn(
        "grid list-none grid-cols-1 gap-3 p-0 md:grid-cols-2 xl:grid-cols-3",
        className
      )}
    >
      {items.map((item) => {
        const offered = themesFor(item);
        const open = openItemId === item.id;
        const panelId = `${domId}-${item.id}`;
        const labelId = `${panelId}-label`;

        return (
          <li
            key={item.id}
            className={cn(open && "md:col-span-2 xl:col-span-3")}
          >
            <QuizTrackCard
              href={trackHref(item.id)}
              labelFr={item.labelFr}
              testId={`quiz-scope-country-${item.id}`}
              linkProps={
                offered.length === 0
                  ? { id: labelId }
                  : {
                      id: labelId,
                      ref: (element: HTMLAnchorElement | null) => {
                        cardRefs.current[item.id] = element;
                      },
                      // Declares that this click keeps the reader here, which
                      // `defaultPrevented` cannot say: Next's <Link> cancels
                      // the native navigation on every internal click too.
                      //
                      // Belt and braces today — a track is a query on this same
                      // path, and `isPageReplacingNavigation` already reads a
                      // query-only change as staying put, so the overlay would
                      // not rise either way. It stops being redundant the
                      // moment a card's href leaves this pathname, which is
                      // what the globe lot does, and that is the failure worth
                      // pre-empting: the overlay covers the screen and waits
                      // for a URL change that never comes, coming down only on
                      // its 15 s escape hatch, as it did on the home's cards.
                      "data-opens-in-place": "true",
                      "aria-expanded": open,
                      "aria-controls": panelId,
                      onClick: (event: { preventDefault: () => void }) => {
                        event.preventDefault();
                        if (open) close();
                        else setOpenItemId(item.id);
                      },
                    }
              }
            >
              {open ? (
                <QuizThemePanel
                  ref={panelRef}
                  panelId={panelId}
                  labelledById={labelId}
                  themes={offered}
                  wholeTrackHref={trackHref(item.id)}
                  themeHref={(themeId) => crossedHref(item.id, themeId)}
                  hintFr={panelHintFr}
                  wholeTrackLabelFr={wholeTrackLabelFr}
                  closeLabelFr={closeLabelFr}
                  onClose={close}
                />
              ) : null}
            </QuizTrackCard>
          </li>
        );
      })}
    </ul>
  );
};

export default QuizScopeDeck;
