"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  ArrowUpDown,
  ChevronDown,
  Circle,
  Crown,
  Eye,
  FolderTree,
  Globe,
  HelpCircle,
  History,
  Landmark,
  Link2,
  Maximize2,
  MapPin,
  Menu,
  Network,
  Route,
  Scale,
  Scissors,
  Search,
  Tag,
  Tags,
  Users,
  type LucideIcon,
} from "lucide-react";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useHeaderReveal } from "@/hooks/use-header-reveal";
import { PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { getTranslation } from "@/lib/translations";
import {
  ACCENT_BY_ACCESS_MODE,
  ACCESS_MODE_LABELS,
  ACCESS_MODES,
  accentForModule,
  getNavModules,
  type AccessMode,
  type HubModuleDefinition,
} from "@/lib/hubs/moduleRegistry";
import { getModuleHref } from "@/lib/hubs/moduleHref";
import { isModuleOffered } from "@/lib/hubs/moduleOffer";
import { useModuleAvailability } from "@/components/hubs/ModuleAvailabilityProvider";
import type { Language } from "@/types/shared";

/**
 * The header carries three intentions, not ten modules (atlas charter §3).
 * Explorer when the reader knows what they are looking for, Comprendre when
 * they want to know where what they are reading comes from, Jouer when they
 * want the corpus to answer. The modules live behind the click — a panel on
 * a wide viewport, a tray below 760px — and both are generated from
 * `moduleRegistry.ts`, never hand-listed.
 *
 * This replaces the flat nine-link bar that was written twice, once per
 * viewport, with its labels hardcoded in both copies.
 *
 * ── Three deliberate departures from docs/design/mockups ──────────────────
 *
 * 1. The tray is built on `ui/sheet`, not hand-rolled. The charter names
 *    `drawer`, but vaul draws a bottom panel and the mockup draws a side
 *    tray; `sheet` is the side one, and Radix brings the focus trap the
 *    mockup's own drawer never had.
 * 2. The panel closes on navigation. The mockup has no router, so it never
 *    had to survive the click that navigates through it.
 * 3. Each control is a 44px hit area wrapping the mockup's smaller painted
 *    shape, rather than a 30px target. The pill and the circles keep their
 *    drawn size; only the box you can hit grows.
 */

// The charter's own figure, and the width `FicheHeroBand` already switches
// its band at, so the header and the band below it change shape together.
const NAV_BREAKPOINT_PX = 760;

/**
 * One glyph per module, from the library rather than the mockup's hand-drawn
 * set: half hand-drawn and half library would read as two different stroke
 * weights side by side. Sized 15px at stroke 1.9 — the mockup's own metrics.
 *
 * Keyed loosely rather than by `HubModuleDefinition["id"]`, so the map may
 * hold a key the registry no longer files — the fallback below is `Circle`,
 * and a module with no glyph is a smaller failure than a build that breaks
 * because a game was retired.
 */
const MODULE_GLYPHS: Record<string, LucideIcon> = {
  peuples: Users,
  pays: Globe,
  familles: Network,
  recherche: Search,
  noms: Tag,
  frise: History,
  "regards-colonisation": Eye,
  quiz: HelpCircle,
  appellations: Tags,
  "plus-ou-moins": ArrowUpDown,
  mercator: Maximize2,
  comparer: Scale,
  repartition: MapPin,
  "pays-davant": Landmark,
  royaumes: Crown,
  migrations: Route,
  liens: Link2,
  "jeu-familles": FolderTree,
  frontieres: Scissors,
};

const isCurrentRoute = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);

export interface SiteHeaderProps {
  language: Language;
  onSearchClick?: () => void;
  /**
   * Handed down by the shell so the back-to-top control can return the focus
   * here — see `BackToTopProps.returnFocusTo` for why it is a ref and not an
   * id on the element.
   */
  mastheadRef?: RefObject<HTMLElement | null>;
}

// @req REQ-114 @req REQ-115 @req REQ-106
export function SiteHeader({
  language,
  onSearchClick,
  mastheadRef,
}: SiteHeaderProps) {
  const pathname = usePathname();
  const t = getTranslation(language);
  // Resolved once per request by the `[lang]` layout; `null` on any surface
  // rendered without it, which `isModuleOffered` reads as "declared half only".
  const moduleAvailability = useModuleAvailability();

  const [openAxis, setOpenAxis] = useState<AccessMode | null>(null);
  const [trayOpen, setTrayOpen] = useState(false);
  const [openTrayAxis, setOpenTrayAxis] = useState<AccessMode | null>(null);
  const triggerRefs = useRef<Partial<Record<AccessMode, HTMLButtonElement>>>(
    {}
  );

  // The bar, not the header: the panel below opens inside the same element,
  // and the height the rest of the chrome lines itself up against is the
  // height of the row that stays.
  //
  // An open menu holds the bar in place. The retraction reads the scroll
  // position, which moves for reasons the reader had no hand in, and every
  // one of those used to close the menu they had just opened — see the hook.
  // The ways out stay the ones the reader can aim at: the trigger again,
  // Escape, or a destination in the panel.
  const barRef = useRef<HTMLElement>(null);
  const retracted = useHeaderReveal(barRef, openAxis !== null || trayOpen);

  // A panel left open would ride off the top of the screen with the bar and
  // come back several hundred pixels later, over a page the reader has since
  // scrolled somewhere else. Adjusted during render, like the pathname reset
  // below and for the same reason.
  const [renderedRetraction, setRenderedRetraction] = useState(retracted);
  if (renderedRetraction !== retracted) {
    setRenderedRetraction(retracted);
    if (retracted) setOpenAxis(null);
  }

  // A panel that outlived the click that navigated through it would hang
  // over the page the reader just asked for. Adjusted during render rather
  // than in an effect — React's own answer for state that has to reset when
  // a prop changes, and it avoids a first paint of the stale panel.
  const [renderedPathname, setRenderedPathname] = useState(pathname);
  if (renderedPathname !== pathname) {
    setRenderedPathname(pathname);
    setOpenAxis(null);
    setTrayOpen(false);
  }

  // Escape closes and hands the focus back to the trigger the reader
  // opened, which is where their attention was (charter §3).
  useEffect(() => {
    if (!openAxis) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpenAxis(null);
      triggerRefs.current[openAxis]?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [openAxis]);

  const moveAlongAxes = useCallback((from: AccessMode, step: number) => {
    const index = ACCESS_MODES.indexOf(from);
    const next =
      ACCESS_MODES[(index + step + ACCESS_MODES.length) % ACCESS_MODES.length];
    triggerRefs.current[next]?.focus();
    // The panel follows the focus so arrowing along the bar reads the axes,
    // rather than making the reader re-open each one.
    setOpenAxis((current) => (current === null ? null : next));
  }, []);

  const moduleEntry = (definition: HubModuleDefinition) => {
    const href = getModuleHref(definition, language);
    const Glyph = MODULE_GLYPHS[definition.id] ?? Circle;
    const testId = `site-nav-module-${definition.id}`;

    // Two questions, and the menu used to ask only the first (charter §3):
    // the route has to exist, *and* what sits behind it has to be worth the
    // trip. Asking only "does this resolve" is what had the header linking
    // modules the home and the hub were both marking Bientôt.
    const offered =
      href !== null && isModuleOffered(definition, moduleAvailability);

    const body = (
      <>
        <span className="sh-glyph" aria-hidden="true">
          <Glyph size={15} strokeWidth={1.9} />
        </span>
        <span className="sh-entry-text">
          <span className="sh-entry-name">{definition.name}</span>
          {offered ? null : (
            <span className="sh-chip">
              <span className="sh-chip-dot" aria-hidden="true" />
              {t.hubs.unavailableLabel}
            </span>
          )}
        </span>
      </>
    );

    // No anchor at all, and no focus stop: the reader is told there is
    // nothing worth reading here yet, and the charter owes no account of
    // which of the two questions produced that. An unbuilt route and a module
    // in preparation get the same row deliberately — an anchor without an
    // href would still be a link the keyboard could reach.
    if (!offered) {
      return (
        <span
          key={definition.id}
          data-testid={testId}
          aria-disabled="true"
          tabIndex={-1}
          className={cn("sh-entry", accentForModule(definition))}
        >
          {body}
        </span>
      );
    }

    return (
      <Link
        key={definition.id}
        href={href}
        data-testid={testId}
        aria-current={isCurrentRoute(pathname, href) ? "page" : undefined}
        className={cn("sh-entry", accentForModule(definition))}
      >
        {body}
      </Link>
    );
  };

  return (
    <header
      // Where the back-to-top control sends the reader — and, because a
      // scroll moves the page but not the focus, where it sends the focus
      // too. Not reachable by Tab: it is a destination, not a stop on the way
      // through the bar.
      ref={mastheadRef}
      tabIndex={-1}
      data-testid="site-header"
      className="sh-header"
    >
      <nav ref={barRef} className="sh-bar" aria-label="Navigation principale">
        {/* One link, two lines: the name, and what the site is. The mark is
            decorative because the wordmark beside it already says the name —
            an alt here makes a screen reader announce it twice. */}
        <Link
          href={`/${language}`}
          className="sh-brand"
          data-testid="site-brand"
        >
          <Image
            src="/africa.png"
            alt=""
            width={44}
            height={44}
            className="sh-brand-mark"
            priority
          />
          <span className="sh-brand-text">
            <span className="sh-brand-name">{PRODUCT_NAME}</span>
            <span className="sh-brand-tagline">{PRODUCT_TAGLINE}</span>
          </span>
        </Link>

        <div className="sh-axes" role="group" aria-label="Points d'entrée">
          {ACCESS_MODES.map((axis) => (
            <button
              key={axis}
              ref={(element) => {
                if (element) triggerRefs.current[axis] = element;
              }}
              type="button"
              id={`sh-axis-${axis}`}
              aria-expanded={openAxis === axis}
              aria-controls="site-megapanel"
              onClick={() =>
                setOpenAxis((current) => (current === axis ? null : axis))
              }
              onKeyDown={(event) => {
                if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
                  return;
                }
                event.preventDefault();
                moveAlongAxes(axis, event.key === "ArrowRight" ? 1 : -1);
              }}
              className={cn("sh-axis min-h-11", ACCENT_BY_ACCESS_MODE[axis])}
            >
              <span className="sh-axis-pill">
                <span className="sh-seed" aria-hidden="true" />
                {ACCESS_MODE_LABELS[axis]}
                <ChevronDown
                  className="sh-caret"
                  size={11}
                  aria-hidden="true"
                />
              </span>
            </button>
          ))}
        </div>

        <div className="sh-controls">
          <button
            type="button"
            onClick={onSearchClick}
            aria-label="Rechercher"
            className="sh-icon min-h-11"
          >
            <span className="sh-icon-circle">
              <Search size={14} strokeWidth={2.2} aria-hidden="true" />
            </span>
          </button>

          {/* REQ-115 — the surface switch is reachable from every route. It
              is the one control the mockup's bar does not draw. */}
          <ThemeToggle />

          <button
            type="button"
            onClick={() => setTrayOpen(true)}
            data-testid="site-nav-burger"
            aria-label="Ouvrir le menu"
            aria-expanded={trayOpen}
            className="sh-icon sh-burger min-h-11"
          >
            <span className="sh-icon-circle">
              <Menu size={14} strokeWidth={2.2} aria-hidden="true" />
            </span>
          </button>
        </div>
      </nav>

      {openAxis ? (
        <div
          id="site-megapanel"
          data-testid="site-megapanel"
          aria-labelledby={`sh-axis-${openAxis}`}
          className={cn("sh-panel", ACCENT_BY_ACCESS_MODE[openAxis])}
        >
          <div className="sh-panel-head">
            <h2 className="sh-panel-title">{ACCESS_MODE_LABELS[openAxis]}</h2>
            <p className="sh-panel-blurb">{t.hubs[openAxis].menuBlurb}</p>
          </div>
          <div className="sh-grid">
            {getNavModules(openAxis).map(moduleEntry)}
          </div>
        </div>
      ) : null}

      <Sheet open={trayOpen} onOpenChange={setTrayOpen}>
        <SheetContent side="right" className="sh-tray">
          <SheetTitle className="sh-tray-title">{t.hubs.menuLabel}</SheetTitle>
          {ACCESS_MODES.map((axis) => {
            const modules = getNavModules(axis);
            const expanded = openTrayAxis === axis;

            return (
              <div
                key={axis}
                className={cn("sh-fold", ACCENT_BY_ACCESS_MODE[axis])}
              >
                <h3
                  aria-label={ACCESS_MODE_LABELS[axis]}
                  className="sh-fold-heading"
                >
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={`sh-fold-${axis}`}
                    onClick={() => setOpenTrayAxis(expanded ? null : axis)}
                    className="sh-fold-trigger min-h-11"
                  >
                    <span className="sh-seed" aria-hidden="true" />
                    {ACCESS_MODE_LABELS[axis]}
                    <span className="sh-fold-count">{modules.length}</span>
                    <ChevronDown
                      className="sh-caret"
                      size={13}
                      aria-hidden="true"
                    />
                  </button>
                </h3>
                {expanded ? (
                  <div id={`sh-fold-${axis}`} className="sh-fold-body">
                    {modules.map(moduleEntry)}
                  </div>
                ) : null}
              </div>
            );
          })}
        </SheetContent>
      </Sheet>

      <style>{`
        /* The bar takes the ink of the surface it sits on — the variant the
           design-system board draws as .appbar[data-surface] . The night
           theme rebinds these three tokens site-wide, so the bar turns with
           the reader's choice instead of contradicting it. */
        .sh-header {
          --sh-ink: var(--afh-text);
          --sh-ink-2: var(--afh-text-soft);
          --sh-line: var(--afh-border);
          background: var(--afh-bg);
          color: var(--sh-ink);
          border-bottom: 1px solid var(--sh-line);
          z-index: 40;

          /* Pinned, and retracting while the reader goes down the document —
             see styles/site-chrome.css for the contract this half implements.

             Sticky rather than fixed: the bar keeps its slot in the flow at
             the top of the page, so nothing below it has to be padded by a
             height this file would then have to guarantee. */
          position: sticky;
          top: 0;
          transition: var(--afh-transition-transform);
        }

        /* Its whole height, not the bar's: an open panel is part of what has
           to leave, and a translation of the bar alone would leave the menu
           hanging at the top of the screen. */
        :root[data-header-retracted="true"] .sh-header {
          transform: translateY(-100%);
        }

        /* The bar is a destination for the back-to-top control, not a control
           itself: a ring around the whole masthead would be noise on arrival.
           What the reader needs is the focus *in* the bar, which is where the
           next Tab now takes them. */
        .sh-header:focus {
          outline: none;
        }

        /* The bar takes the shell box rather than its own: its left edge is
           the one the page title and the copyright line are measured against,
           so a width private to the header is a misalignment by construction.
           Only the vertical padding is the bar's to choose. */
        .sh-bar {
          display: flex;
          align-items: center;
          gap: 16px;
          padding-block: 8px;
          padding-inline: var(--afh-page-padding);
          max-width: var(--afh-shell-max);
          margin: 0 auto;
        }

        .sh-brand {
          display: flex;
          align-items: center;
          gap: 9px;
          flex: 0 1 auto;
          min-width: 0;
          text-decoration: none;
          color: inherit;
        }
        /* The coloured continent, restored: the nav rewrite replaced it with
           a radial-gradient disc, and a disc denotes nothing. The silhouette
           is what lets the mark be read as the subject. object-fit keeps the
           square asset undistorted.

           At 26px it was a favicon sitting in the page — legible as a shape,
           not as a continent. 44px is the size at which the coastline reads,
           and it is also the lockup's two text lines stacked, so the mark and
           the wordmark share one optical height. */
        .sh-brand-mark {
          width: 44px;
          height: 44px;
          flex: none;
          object-fit: contain;
        }
        .sh-brand-text {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .sh-brand-name {
          font-family: var(--afh-font-display);
          font-weight: 900;
          font-size: var(--afh-text-h3);
          line-height: 1.15;
          letter-spacing: -0.01em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        /* The qualifier production carries and the app had dropped, in the
           gradient production sets it in. Declared once as --gradient-warm;
           the @supports guard is what keeps it a plain coloured line rather
           than an invisible one where background-clip: text is missing. */
        .sh-brand-tagline {
          font-family: var(--afh-font-display);
          font-weight: 700;
          font-size: var(--afh-text-caption);
          line-height: 1.2;
          letter-spacing: 0.005em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          color: var(--afh-display-accent);
        }
        @supports (background-clip: text) or (-webkit-background-clip: text) {
          .sh-brand-tagline {
            background: var(--gradient-warm);
            background-clip: text;
            -webkit-background-clip: text;
            color: transparent;
          }
        }

        .sh-axes {
          display: flex;
          gap: 4px;
          margin-left: auto;
        }

        /* The button is the 44px target; the pill inside it is what the
           mockup draws. Growing the pill itself to 44px would make the bar
           a third taller than the band it opens onto. */
        .sh-axis {
          display: inline-flex;
          align-items: center;
          background: transparent;
          border: 0;
          padding: 0 2px;
          cursor: pointer;
          font-family: inherit;
          color: var(--sh-ink-2);
        }
        /* Reading size, not control size. The three axes are the site's own
           table of contents rather than a toolbar, and at the fixed 16px
           interface step they read as the smallest text on the page. The
           reference sets its nav at 18px, which is where --afh-text-body
           lands on a wide window — a role, not a hand-picked pixel, which the
           typography charter forbids outright. */
        .sh-axis-pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: var(--afh-text-body);
          padding: 6px 12px;
          border: 1px solid transparent;
          border-radius: var(--afh-radius-full);
          transition:
            color var(--afh-duration-base) var(--afh-ease-out),
            border-color var(--afh-duration-base) var(--afh-ease-out),
            background-color var(--afh-duration-base) var(--afh-ease-out);
        }
        .sh-seed {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--accent);
          flex: none;
        }
        .sh-caret {
          opacity: 0.7;
          transition: transform var(--afh-duration-base) var(--afh-ease-out);
        }
        .sh-axis:hover {
          color: var(--sh-ink);
        }
        .sh-axis:hover .sh-axis-pill {
          border-color: var(--accent);
        }
        .sh-axis:focus-visible {
          outline: none;
        }
        .sh-axis:focus-visible .sh-axis-pill {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
        .sh-axis[aria-expanded="true"] {
          color: var(--sh-ink);
        }
        .sh-axis[aria-expanded="true"] .sh-axis-pill {
          border-color: var(--accent);
          background: color-mix(in srgb, var(--accent) 16%, transparent);
        }
        .sh-axis[aria-expanded="true"] .sh-caret {
          transform: rotate(180deg);
        }

        /* The gap that puts the mark and the controls at opposite edges is
           opened here, not on .sh-axes: below the breakpoint the axes are
           display:none, and a withdrawn element contributes no margin — so
           the burger used to sit against the mark with the right half of
           the bar empty. Above the breakpoint the axes take the gap back
           (see the wide query), because two auto margins in one row would
           split the space and float the axes into the middle. */
        .sh-controls {
          display: flex;
          align-items: center;
          gap: 2px;
          flex: none;
          margin-left: auto;
        }
        .sh-icon {
          display: inline-grid;
          place-items: center;
          min-width: 44px;
          background: transparent;
          border: 0;
          padding: 0;
          cursor: pointer;
          color: var(--sh-ink-2);
        }
        .sh-icon-circle {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 1px solid var(--sh-line);
          display: inline-grid;
          place-items: center;
          transition: border-color var(--afh-duration-base) var(--afh-ease-out);
        }
        .sh-icon:hover {
          color: var(--sh-ink);
        }
        .sh-icon:hover .sh-icon-circle {
          border-color: var(--afh-cat-ocre);
        }
        .sh-icon:focus-visible {
          outline: none;
        }
        .sh-icon:focus-visible .sh-icon-circle {
          outline: 2px solid var(--afh-cat-ocre);
          outline-offset: 2px;
        }

        /* ── The panel behind the click ─────────────────────────────── */
        /* Hung off the bar, not inserted into it. The masthead is pinned, so
           once the reader is into the document its box sits above the top of
           the screen — and a panel opening *inside* that box grew it by its
           own height, 224px of layout appearing above the viewport. Scroll
           anchoring pushes the document down by exactly that much to keep the
           reader's place, and the scroll event that comes with the adjustment
           is, to the retraction, indistinguishable from the reader moving
           down the page: the bar retracted and took the panel with it in the
           frame the click opened it. The menu therefore answered above
           RETRACT_BELOW_PX, where the bar may not retract, and nowhere else.

           Out of flow the header's box never changes height, so anchoring has
           nothing to correct — and a menu that overlays the page rather than
           displacing it is what the charter's navigation-menu primitive does
           anyway (atlas charter §3).

           top: 100% rather than a height of its own: what the panel hangs
           from is the bar's bottom edge, whatever the type scale has made
           of it. */
        .sh-panel {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: var(--afh-bg);
          border-bottom: 1px solid var(--afh-cat-ocre);
          padding: 20px var(--afh-page-padding) 22px;
          animation: sh-panel-in var(--afh-duration-slow) var(--afh-ease-spring);
        }
        @keyframes sh-panel-in {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }
        .sh-panel-head {
          display: flex;
          align-items: baseline;
          gap: 14px;
          flex-wrap: wrap;
          margin: 0 auto 14px;
          max-width: var(--afh-shell-max);
        }
        .sh-panel-title {
          margin: 0;
          font-family: var(--afh-font-display);
          font-weight: 900;
          font-size: var(--afh-text-h3);
          /* Text, so it takes the readable half of the accent pair, never
             the fill — which fails AA on the parchment it sits on. */
          color: var(--accent-ink);
        }
        .sh-panel-blurb {
          margin: 0;
          font-size: var(--afh-text-small);
          color: var(--afh-fg-muted);
          max-width: 52ch;
          line-height: 1.6;
        }
        .sh-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(205px, 1fr));
          gap: 9px;
          max-width: var(--afh-shell-max);
          margin: 0 auto;
        }

        .sh-entry {
          display: flex;
          align-items: flex-start;
          gap: 11px;
          background: var(--afh-surface);
          border: 1px solid var(--afh-border);
          border-radius: var(--afh-radius-md);
          padding: 12px 13px;
          min-height: 44px;
          text-decoration: none;
          color: var(--afh-text);
          transition:
            border-color var(--afh-duration-base) var(--afh-ease-out),
            transform var(--afh-duration-base) var(--afh-ease-spring);
        }
        .sh-entry:hover {
          border-color: var(--accent);
          transform: translateX(3px);
        }
        .sh-entry:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
        .sh-entry[aria-disabled="true"] {
          opacity: 0.62;
          pointer-events: none;
        }
        /* The wash, not --accent-tint. That token is the accent over
           parchment and the night theme does not rebind it, so using it as
           a fill here put a #f1d9ae card under night's cream ink — 1.05:1,
           unreadable the moment the reader switched surface. A translucent
           wash takes the colour of whatever is behind it, so it reads on
           both. Same device as the open pill above. */
        .sh-entry[aria-current="page"] {
          border-color: var(--accent);
          background: color-mix(in srgb, var(--accent) 16%, var(--afh-surface));
        }
        .sh-glyph {
          width: 28px;
          height: 28px;
          border-radius: var(--afh-radius-sm);
          flex: none;
          display: grid;
          place-items: center;
          color: var(--accent-ink);
          background: color-mix(in srgb, var(--accent) 14%, transparent);
        }
        .sh-entry-text {
          min-width: 0;
        }
        .sh-entry-name {
          display: block;
          font-size: var(--afh-text-small);
          font-weight: 700;
          line-height: 1.35;
        }
        .sh-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 7px;
          font-size: var(--afh-text-caption);
          font-weight: 700;
          padding: 3px 10px;
          border-radius: var(--afh-radius-full);
          border: 1px solid currentColor;
          /* « Bientôt » is state, not decoration: it is the only thing
             telling a reader why a nav entry will not take them anywhere.
             The fill token read 3.22:1 here — and the border takes
             currentColor, so the ink carries both. */
          color: var(--afh-conf-low-ink);
        }
        .sh-chip-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
          flex: none;
        }

        /* ── The tray, below the breakpoint ─────────────────────────── */
        .sh-tray {
          width: min(330px, 86%);
          padding: 0;
          overflow-y: auto;
          background: var(--afh-bg);
          border-left: 1px solid var(--afh-cat-ocre);
        }
        .sh-tray-title {
          font-family: var(--afh-font-display);
          font-weight: 900;
          font-size: var(--afh-text-small);
          color: var(--afh-text);
          padding: 15px 18px;
          border-bottom: 1px solid var(--afh-border);
        }
        .sh-fold {
          border-bottom: 1px solid var(--afh-border);
        }
        .sh-fold-heading {
          margin: 0;
        }
        .sh-fold-trigger {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          background: transparent;
          border: 0;
          cursor: pointer;
          padding: 15px 18px;
          text-align: left;
          color: var(--afh-text);
          font-family: var(--afh-font-display);
          font-weight: 900;
          font-size: var(--afh-text-h3);
        }
        .sh-fold-trigger:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: -2px;
        }
        .sh-fold-count {
          margin-left: auto;
          font-family: var(--afh-font-mono);
          font-size: var(--afh-text-caption);
          color: var(--afh-fg-muted);
          font-weight: 400;
        }
        .sh-fold-trigger .sh-caret {
          color: var(--afh-fg-muted);
        }
        .sh-fold-trigger[aria-expanded="true"] .sh-caret {
          transform: rotate(180deg);
        }
        .sh-fold-body {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 8px;
          padding: 0 18px 15px;
        }

        /* Mobile first: the phone gets the burger and the tray, and the
           three axes only appear once the bar is wide enough to hold them.
           One component, one switch, so the two branches cannot disagree
           about which viewport they are on. */
        .sh-axes,
        .sh-panel {
          display: none;
        }
        .sh-burger {
          display: inline-grid;
        }
        @media (min-width: ${NAV_BREAKPOINT_PX + 1}px) {
          .sh-axes {
            display: flex;
          }
          .sh-controls {
            margin-left: 0;
          }
          .sh-panel {
            display: block;
          }
          /* Only the burger is withdrawn. The tray needs no rule of its
             own: nothing but the burger opens it, and the burger is gone. */
          .sh-burger {
            display: none;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .sh-panel {
            animation: none;
          }
          .sh-entry:hover {
            transform: none;
          }
        }
      `}</style>
    </header>
  );
}

export default SiteHeader;
