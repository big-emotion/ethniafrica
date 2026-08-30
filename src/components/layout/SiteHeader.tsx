"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUpDown,
  BookOpen,
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
  Compass,
  Scissors,
  Search,
  Tag,
  Tags,
  Users,
  type LucideIcon,
} from "lucide-react";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { PRODUCT_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { getTranslation } from "@/lib/translations";
import {
  ACCENT_BY_ACCESS_MODE,
  ACCESS_MODES,
  accentForModule,
  getNavModules,
  type AccessMode,
  type HubModuleDefinition,
} from "@/lib/hubs/moduleRegistry";
import { getModuleHref } from "@/lib/hubs/moduleHref";
import { isModuleOffered } from "@/lib/hubs/moduleOffer";
import { useModuleAvailability } from "@/components/hubs/ModuleAvailabilityProvider";
import { getAxisHubRoute } from "@/lib/hubs/axisRoutes";
import { getFacetByPage } from "@/lib/hubs/facets";
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
 * One glyph per module. The mockup draws ten by hand; the registry holds
 * twenty-one, and a set half hand-drawn and half library would read as two
 * different stroke weights side by side. Sized 15px at stroke 1.9 — the
 * mockup's own metrics.
 */
const MODULE_GLYPHS: Record<string, LucideIcon> = {
  peuples: Users,
  pays: Globe,
  familles: Network,
  recherche: Search,
  noms: Tag,
  frise: History,
  "regards-colonisation": Eye,
  doctrine: BookOpen,
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
}

// @req REQ-114 @req REQ-115 @req REQ-106
export function SiteHeader({ language, onSearchClick }: SiteHeaderProps) {
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

  /**
   * An axis's modules, split into the facets of its hub and the destinations
   * that stand on their own.
   *
   * Peoples, families and countries stopped being three destinations when they
   * became three facets of one page. A menu that still lists them beside each
   * other, each printing its own address, describes the site as it was — and
   * teaches a reader to expect three pages where they will find one. Only
   * Explorer has facets today; the other two axes split into an empty half and
   * everything else, which is the same code doing nothing.
   */
  const splitAxis = (axis: AccessMode) => {
    const modules = getNavModules(axis);
    const facets = modules.filter(
      (definition) => definition.page && getFacetByPage(definition.page)
    );
    return {
      facets,
      destinations: modules.filter(
        (definition) => !facets.includes(definition)
      ),
    };
  };

  /**
   * The axis's own hub, as the entry the menu leads with.
   *
   * It had no entry at all: the axis label is a disclosure button, so
   * `/fr/explorer` — the page the whole axis is named after — was reachable
   * from no navigation surface on any viewport. Leading with it also puts the
   * facets where they belong, under the one page they are states of.
   */
  const axisHubEntry = (axis: AccessMode) => {
    const href = getAxisHubRoute(language, axis);
    const { facets } = splitAxis(axis);

    return (
      <div
        key={`hub-${axis}`}
        data-testid={`site-nav-hub-${axis}`}
        // Only a hub carrying facets earns the wider card; an axis without
        // them would spend the second column on emptiness.
        data-has-facets={facets.length > 0 ? "true" : undefined}
        className={cn("sh-entry sh-hub", ACCENT_BY_ACCESS_MODE[axis])}
      >
        <Link
          href={href}
          data-testid={`site-nav-hub-link-${axis}`}
          aria-current={isCurrentRoute(pathname, href) ? "page" : undefined}
          className="sh-hub-main"
        >
          <span className="sh-glyph" aria-hidden="true">
            <Compass size={15} strokeWidth={1.9} />
          </span>
          <span className="sh-entry-text">
            <span className="sh-entry-name">{t.hubs[axis].hubEntryName}</span>
          </span>
        </Link>

        {facets.length > 0 ? (
          <span className="sh-facets" data-testid={`site-nav-facets-${axis}`}>
            <span className="sh-facets-label">{t.hubs.facetsLabel}</span>
            {facets.map((definition) => {
              const facetHref = getModuleHref(definition, language);
              const facet = definition.page
                ? getFacetByPage(definition.page)
                : null;
              if (!facetHref || !facet) return null;

              return (
                <Link
                  key={definition.id}
                  href={facetHref}
                  data-testid={`site-nav-facet-${definition.id}`}
                  aria-current={
                    isCurrentRoute(pathname, facetHref) ? "page" : undefined
                  }
                  className="sh-facet"
                >
                  {facet.label}
                </Link>
              );
            })}
          </span>
        ) : null}
      </div>
    );
  };

  return (
    <header data-testid="site-header" className="sh-header">
      <nav className="sh-bar" aria-label="Navigation principale">
        <Link href={`/${language}`} className="sh-brand">
          <Image
            src="/africa.png"
            alt=""
            width={26}
            height={26}
            className="sh-brand-mark"
            priority
          />
          <span className="sh-brand-name">{PRODUCT_NAME}</span>
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
                {t.hubs[axis].title}
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
            {/* Not a heading: the trigger already names this region, and an
                h4 here would open a level in every page's outline. */}
            <span className="sh-panel-title">{t.hubs[openAxis].title}</span>
            <p className="sh-panel-blurb">{t.hubs[openAxis].menuBlurb}</p>
          </div>
          <div className="sh-grid">
            {axisHubEntry(openAxis)}
            {splitAxis(openAxis).destinations.map(moduleEntry)}
          </div>
        </div>
      ) : null}

      <Sheet open={trayOpen} onOpenChange={setTrayOpen}>
        <SheetContent side="right" className="sh-tray">
          <SheetTitle className="sh-tray-title">{t.hubs.menuLabel}</SheetTitle>
          {ACCESS_MODES.map((axis) => {
            const { destinations } = splitAxis(axis);
            const expanded = openTrayAxis === axis;
            // The hub is one of the entries the fold opens, so it counts as
            // one. Counting the modules alone promised four and delivered two
            // cards and a row of facets.
            const entryCount = destinations.length + 1;

            return (
              <div
                key={axis}
                className={cn("sh-fold", ACCENT_BY_ACCESS_MODE[axis])}
              >
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={`sh-fold-${axis}`}
                  onClick={() => setOpenTrayAxis(expanded ? null : axis)}
                  className="sh-fold-trigger min-h-11"
                >
                  <span className="sh-seed" aria-hidden="true" />
                  {t.hubs[axis].title}
                  <span className="sh-fold-count">{entryCount}</span>
                  <ChevronDown
                    className="sh-caret"
                    size={13}
                    aria-hidden="true"
                  />
                </button>
                {expanded ? (
                  <div id={`sh-fold-${axis}`} className="sh-fold-body">
                    {axisHubEntry(axis)}
                    {destinations.map(moduleEntry)}
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
          position: relative;
          z-index: 40;
        }

        .sh-bar {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 8px 22px;
          max-width: 1240px;
          margin: 0 auto;
        }

        .sh-brand {
          display: flex;
          align-items: center;
          gap: 9px;
          flex: none;
          min-width: 0;
          text-decoration: none;
          color: inherit;
        }
        /* The coloured continent, restored: the nav rewrite replaced it with
           a radial-gradient disc, and a disc denotes nothing. The silhouette
           is what lets the mark be read as the subject at 26 px. object-fit
           keeps the square asset undistorted. */
        .sh-brand-mark {
          width: 26px;
          height: 26px;
          flex: none;
          object-fit: contain;
        }
        .sh-brand-name {
          font-family: var(--afh-font-display);
          font-weight: 900;
          font-size: var(--afh-text-small);
          letter-spacing: -0.01em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
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
        .sh-axis-pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: var(--afh-text-small);
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
        .sh-panel {
          background: var(--afh-bg);
          border-bottom: 1px solid var(--afh-cat-ocre);
          padding: 20px 22px 22px;
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
          max-width: 1240px;
        }
        .sh-panel-title {
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
          max-width: 1240px;
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
        /* The hub leads the panel, so it is a column: its own link, then the
           facets underneath. It does not slide on hover like a destination
           card — the facets sit inside it, and a card that moves under a
           pointer aimed at one of them is a card that loses the click. */
        .sh-hub {
          flex-direction: column;
          align-items: stretch;
          gap: 9px;
          border-color: var(--accent);
        }
        .sh-hub:hover {
          transform: none;
        }
        /* Two columns of the panel grid, so the facet row fits on one line.
           A 205px card wrapped "Ses facettes" onto three lines, which reads
           as a stack of destinations rather than states of the hub above
           them. Scoped to the panel grid: the tray fold is a one-column
           grid, where a span would open an implicit second column. */
        .sh-grid .sh-hub[data-has-facets] {
          grid-column: span 2;
        }
        .sh-hub-main {
          display: flex;
          align-items: flex-start;
          gap: 11px;
          text-decoration: none;
          color: inherit;
          border-radius: var(--afh-radius-sm);
        }
        .sh-hub-main:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
        /* One line, always: the facets scroll sideways rather than wrap.
           The side padding keeps the pills' focus ring off the clipping
           edge that the overflow introduces. */
        .sh-facets {
          display: flex;
          flex-wrap: nowrap;
          align-items: center;
          gap: 6px;
          padding: 8px 2px 2px;
          border-top: 1px solid var(--afh-border);
          overflow-x: auto;
          scrollbar-width: thin;
          overscroll-behavior-x: contain;
        }
        .sh-facets-label {
          flex: none;
          font-size: var(--afh-caption);
          color: var(--afh-fg-muted);
        }
        .sh-facet {
          display: inline-flex;
          flex: none;
          align-items: center;
          white-space: nowrap;
          min-height: 32px;
          padding: 4px 10px;
          border: 1px solid var(--afh-border);
          border-radius: var(--afh-radius-full);
          font-size: var(--afh-caption);
          text-decoration: none;
          color: var(--afh-text);
        }
        .sh-facet:hover,
        .sh-facet[aria-current="page"] {
          border-color: var(--accent);
          color: var(--accent-ink);
        }
        .sh-facet:focus-visible {
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
        /* minmax(0, 1fr), not the implicit 1fr: a grid item's automatic
           minimum is its content, and the hub's nowrap facet row is wider
           than the tray. The column grew to fit it and carried every card's
           right edge off the screen with it. */
        .sh-fold-body {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 8px;
          padding: 0 18px 15px;
        }
        /* In the wide panel the facets stay on one line and scroll, because
           a 205px card wraps « Ses facettes » into what reads as a stack of
           destinations. The tray has neither that card nor a pointer to drag
           the row with, so here it wraps and every facet is simply legible.
           A sideways scrollbar inside a drawer that itself scrolls
           vertically is a control a thumb cannot find. */
        .sh-fold-body .sh-facets {
          flex-wrap: wrap;
          overflow-x: visible;
        }

        /* Mobile first: the phone gets the burger and the tray, and the
           three axes only appear once the bar is wide enough to hold them.
           One component, one switch, so the two branches cannot disagree
           about which viewport they are on. */
        .sh-bar {
          padding: 8px 16px;
        }
        .sh-axes,
        .sh-panel {
          display: none;
        }
        .sh-burger {
          display: inline-grid;
        }
        @media (min-width: ${NAV_BREAKPOINT_PX + 1}px) {
          .sh-bar {
            padding: 8px 22px;
          }
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
