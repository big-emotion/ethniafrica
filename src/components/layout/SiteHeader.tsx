"use client";

import { getLocalizedRoute } from "@/lib/routing";

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
  BookUser,
  Castle,
  ChevronDown,
  Circle,
  Crown,
  Drum,
  Eye,
  Flame,
  FolderTree,
  Gem,
  Globe,
  Handshake,
  HelpCircle,
  History,
  Landmark,
  Languages,
  Link2,
  Maximize2,
  MapPin,
  Menu,
  Network,
  Route,
  Ruler,
  Scale,
  Scissors,
  Search,
  Signature,
  Sparkles,
  ChartNoAxesColumnIncreasing,
  Tag,
  Tags,
  Users,
  type LucideIcon,
} from "lucide-react";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { ActionLink } from "@/components/ui/ActionLink";
import { useHeaderReveal } from "@/hooks/use-header-reveal";
import { PRODUCT_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { getTranslation } from "@/lib/translations";
import {
  ACCENT_BY_ACCESS_MODE,
  ACCENT_CYCLE,
  ACCESS_MODES,
  RUBRIC_FILED_AXES,
  RUBRIC_MENU_LIMIT,
  RUBRIC_PANEL_LIMIT,
  accentForModule,
  getNavModules,
  type AccessMode,
  type HubModuleDefinition,
  type ModuleGroupId,
} from "@/lib/hubs/moduleRegistry";
import { getGroupedModules } from "@/lib/hubs/moduleGroups";
import { useDossierMenu } from "@/components/dossiers/DossierMenuProvider";
import type { DossierMenuEntry } from "@/lib/dossiers/menu";
import type { DossierRubric } from "@/lib/afrik/parsers/dossierTypes";
import { getModuleHref } from "@/lib/hubs/moduleHref";
import { isModuleOffered } from "@/lib/hubs/moduleOffer";
import { useModuleAvailability } from "@/components/hubs/ModuleAvailabilityProvider";
import type { Language } from "@/types/shared";

/**
 * The header carries three intentions, not ten modules (atlas charter §3).
 * Explorer when the reader knows what they are looking for, Comprendre when
 * they want to know where what they are reading comes from, Jouer when they
 * want the corpus to answer. The modules live behind the click — a panel on
 * a wide viewport, a tray below 768px — and both are generated from
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
const NAV_BREAKPOINT_PX = 768;

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
  // Three modules had been reaching the fallback in silence — `anecdotes`
  // since the bank shipped, `langues` and `patronymes` since ETNI-1801 added
  // them. Each was wearing a blank disc beside twenty modules carrying a sign,
  // which no test could see and no diff showed. The contract suite of the
  // Nommer dossier now holds this map.
  langues: Languages,
  patronymes: BookUser,
  nommer: Signature,
  anecdotes: Sparkles,
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

/**
 * A glyph per rubric, not per dossier.
 *
 * Seven dossiers used to carry one each, and four of them shipped without: they
 * wore the blank `Circle` fallback beside twenty modules carrying a sign, which
 * no test could see and no diff showed. A corpus that grows by a file cannot
 * also grow by an icon import, so the sign belongs to the domain — every
 * dossier under Organisation shows the same castle, which is what a rubric
 * means.
 */
const RUBRIC_GLYPHS: Record<DossierRubric, LucideIcon> = {
  noms: Signature,
  organisation: Castle,
  religions: Flame,
  territoires: Ruler,
  populations: ChartNoAxesColumnIncreasing,
  economie: Gem,
};

/** What a card of the menu needs, whether a module or a dossier declared it. */
interface MenuEntry {
  id: string;
  href: string | null;
  label: string;
  offered: boolean;
  glyph: LucideIcon;
  accent: string;
  group?: ModuleGroupId;
}

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
  const axisLabel = (axis: AccessMode) => t.hubs[axis].title;
  // Resolved once per request by the `[lang]` layout; `null` on any surface
  // rendered without it, which `isModuleOffered` reads as "declared half only".
  const moduleAvailability = useModuleAvailability();
  const dossierMenu = useDossierMenu();

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
  // Escape, a destination in the panel, or a press on the page below.
  const barRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
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

  // Aiming at the page is the reader's own way of saying they are done with
  // the menu. `pointerdown` rather than `click`, so the panel is out of the
  // way before the press it covers resolves — on `click` the first press is
  // spent dismissing and the reader has to aim twice. The focus is left
  // where the press sends it: unlike Escape, they are not coming back to the
  // trigger. The bar is excluded so its own trigger stays a toggle, and the
  // panel so a destination inside it is still reachable.
  useEffect(() => {
    if (!openAxis) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (barRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpenAxis(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
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

  /**
   * One card of the menu, whatever declared it.
   *
   * Two things reach this now: a module, which is a surface of the axis, and a
   * dossier, which is a record of the corpus. They render identically because
   * a reader choosing between them is choosing between two readings, not
   * between two kinds of declaration.
   */
  const navEntry = (entry: MenuEntry) => {
    const Glyph = entry.glyph;
    const testId = `site-nav-module-${entry.id}`;

    const body = (
      <>
        <span className="sh-glyph" aria-hidden="true">
          <Glyph size={15} strokeWidth={1.9} />
        </span>
        <span className="sh-entry-text">
          <span className="sh-entry-name">{entry.label}</span>
          {entry.offered ? null : (
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
    // which of the two questions produced that. An unbuilt route and a reading
    // in preparation get the same row deliberately — an anchor without an
    // href would still be a link the keyboard could reach.
    if (!entry.offered || entry.href === null) {
      return (
        <span
          key={entry.id}
          data-testid={testId}
          aria-disabled="true"
          tabIndex={-1}
          className={cn("sh-entry", entry.accent)}
        >
          {body}
        </span>
      );
    }

    return (
      <Link
        key={entry.id}
        href={entry.href}
        data-testid={testId}
        aria-current={isCurrentRoute(pathname, entry.href) ? "page" : undefined}
        className={cn("sh-entry", entry.accent)}
      >
        {body}
      </Link>
    );
  };

  const moduleAsEntry = (definition: HubModuleDefinition): MenuEntry => {
    const href = getModuleHref(definition, language);
    return {
      id: definition.id,
      href,
      label: t.hubs.moduleNames[definition.id] ?? definition.name,
      // Two questions, and the menu used to ask only the first (charter §3):
      // the route has to exist, *and* what sits behind it has to be worth the
      // trip. Asking only "does this resolve" is what had the header linking
      // modules the home and the hub were both marking Bientôt.
      offered: href !== null && isModuleOffered(definition, moduleAvailability),
      glyph: MODULE_GLYPHS[definition.id] ?? Circle,
      accent: accentForModule(definition),
      group: definition.group,
    };
  };

  /**
   * A dossier of the corpus as a card.
   *
   * Its glyph comes from its rubric, not from itself: a per-dossier glyph is
   * one more file to edit per publication, and it is what let four dossiers
   * ship wearing the blank fallback disc without any gate noticing. Its accent
   * cycles by position for the same reason — declared per entry, it is a
   * chance per entry to file a duplicate beside its neighbour.
   */
  const dossierAsEntry = (
    dossier: DossierMenuEntry,
    index: number
  ): MenuEntry => ({
    id: dossier.id,
    href: dossier.href,
    label: dossier.title,
    offered: dossier.offered,
    glyph: RUBRIC_GLYPHS[dossier.rubric] ?? Circle,
    accent: ACCENT_CYCLE[index % ACCENT_CYCLE.length],
    group: `dossiers-${dossier.rubric}` as ModuleGroupId,
  });

  /**
   * An axis's modules, filed under rubric headings where the axis declares
   * them (`RUBRIC_FILED_AXES`) and flat where it does not.
   *
   * The dossiers axis grew to eleven modules and the panel still drew one row
   * of eleven cards, four of them about the Congo — so the reader met a wave
   * of publication where the axis meant to show a set of subjects. Filing is
   * declared on the registry rather than tested for here, because
   * `axis === "dossiers"` written in this file is what once gave that axis a
   * navigation unlike its two neighbours.
   *
   * The panel and the tray file the same rubrics and cut them differently.
   * The panel hangs off a pinned bar, so its constraint is height: one reading
   * per rubric (`RUBRIC_PANEL_LIMIT`), six rubrics abreast, and a way out to
   * the hub when the rubric can open more than that one. The tray scrolls and
   * is the whole of the phone's navigation, so it lists the axis down to
   * `RUBRIC_MENU_LIMIT` and counts what it withholds — which is also why a
   * dossier in preparation is still listed there, inert, rather than dropped.
   *
   * The heading rank follows: `h3` under the panel's `h2`, `h4` under the
   * tray's `h3`. Same label, different rank.
   */
  const axisModules = (axis: AccessMode, surface: "panel" | "tray") => {
    const modules = getNavModules(axis).map(moduleAsEntry);
    if (!RUBRIC_FILED_AXES.includes(axis)) return modules.map(navEntry);

    // The axis's surfaces and its corpus, in one list. The dossiers arrive
    // newest first (`getDossierMenuEntries`), which is the order the cap keeps.
    const entries = [
      ...modules,
      ...dossierMenu.map((dossier, index) =>
        dossierAsEntry(dossier, modules.length + index)
      ),
    ];

    const Heading = surface === "panel" ? "h3" : "h4";
    return getGroupedModules(entries).map((rubric) => {
      const open = rubric.modules.filter((entry) => entry.offered);

      // The panel spends its one card on a reading the click opens, and falls
      // back to the first in preparation when the rubric has none: five of the
      // six rubrics have no open reading today, and dropping their card would
      // leave the row a set of bare headings. The chip is what a reader is owed
      // there — there is a reading here, and it is not ready.
      const shown =
        surface === "panel"
          ? (open.length > 0 ? open : rubric.modules).slice(
              0,
              RUBRIC_PANEL_LIMIT
            )
          : rubric.modules.slice(0, RUBRIC_MENU_LIMIT);

      // What the way out is worth reaching for. The panel counts *open*
      // readings, because the hub holds nothing more it can open once the
      // rubric's only published dossier is already on the card; the tray
      // counts everything it withheld, listed or not.
      const withheld =
        surface === "panel"
          ? open.length - RUBRIC_PANEL_LIMIT
          : rubric.modules.length - shown.length;

      return (
        <section key={rubric.id} className="sh-rubric">
          <Heading className="sh-rubric-name">
            {t.hubs.moduleGroupNames[rubric.id]}
          </Heading>
          <div className="sh-rubric-entries">
            {shown.map(navEntry)}
            {/* A menu is not an index. Past the cap the rubric stops listing
                and points at the hub, which is the surface that owes a reader
                every dossier. Without this a rubric holding a hundred readings
                would print a hundred cards into every page of the site. */}
            {withheld > 0 ? (
              <Link
                href={getLocalizedRoute(language, "dossiersHub")}
                data-testid={`site-nav-rubric-more-${rubric.id}`}
                className="sh-rubric-more"
              >
                {surface === "panel"
                  ? t.hubs.seeMoreInRubric
                  : t.hubs.moreInRubric(withheld)}
              </Link>
            ) : null}
          </div>
        </section>
      );
    });
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
      <nav ref={barRef} className="sh-bar" aria-label={t.chrome.mainNavigation}>
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
            <span className="sh-brand-tagline">{t.chrome.headerTagline}</span>
          </span>
        </Link>

        <div className="sh-axes" role="group" aria-label={t.chrome.entryPoints}>
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
                {axisLabel(axis)}
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
            aria-label={t.chrome.search}
            className="sh-icon min-h-11"
          >
            <span className="sh-icon-circle">
              <Search size={14} strokeWidth={2.2} aria-hidden="true" />
            </span>
          </button>

          {/* REQ-115 — the surface switch is reachable from every route. It
              is the one control the mockup's bar does not draw. */}
          <ThemeToggle language={language} />

          {/* REQ-140 — the other locale. In the bar only above the
              breakpoint: at 430px a fourth 44px control leaves the lockup
              155px, which cuts the tagline, so the phone gets it as the
              tray's first row instead (see the tray below). */}
          <LanguageSwitcher language={language} />

          <button
            type="button"
            onClick={() => setTrayOpen(true)}
            data-testid="site-nav-burger"
            aria-label={t.chrome.openMenu}
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
          ref={panelRef}
          id="site-megapanel"
          data-testid="site-megapanel"
          aria-labelledby={`sh-axis-${openAxis}`}
          className={cn("sh-panel", ACCENT_BY_ACCESS_MODE[openAxis])}
        >
          <div className="sh-panel-head">
            <h2 className="sh-panel-title">
              {openAxis === "dossiers" ? (
                <ActionLink href={getLocalizedRoute(language, "dossiersHub")}>
                  {axisLabel(openAxis)}
                </ActionLink>
              ) : (
                axisLabel(openAxis)
              )}
            </h2>
            <p className="sh-panel-blurb">{t.hubs[openAxis].menuBlurb}</p>
          </div>
          {/* One panel shape for the three axes.

              Dossiers used to render a theme directory here instead — eight
              bare text links with an arrow, beside two axes drawing module
              cards. A reader crossing the bar met two different navigations
              under one bar, and the axis that reads as unfinished is the one
              that looks unlike its neighbours. It also had nowhere to put
              **Bientôt**, so a withdrawn dossier and a published one were
              spelled identically.

              The theme directory came back as headings rather than as links:
              filing eleven dossiers under six domain rubrics gives the reader
              the subjects without promising six pages the editorial has not
              written. */}
          <div
            className={cn(
              "sh-grid",
              RUBRIC_FILED_AXES.includes(openAxis) && "sh-grid-filed"
            )}
          >
            {axisModules(openAxis, "panel")}
          </div>
        </div>
      ) : null}

      <Sheet open={trayOpen} onOpenChange={setTrayOpen}>
        <SheetContent side="right" className="sh-tray">
          <SheetTitle className="sh-tray-title">{t.hubs.menuLabel}</SheetTitle>
          <LanguageSwitcher language={language} appearance="row" />
          {ACCESS_MODES.map((axis) => {
            // Everything the fold opens onto, not everything the registry
            // declares: the dossiers axis also carries its corpus, and a
            // badge reading 4 over eleven entries is a count that contradicts
            // the list under it.
            const entryCount =
              getNavModules(axis).length +
              (RUBRIC_FILED_AXES.includes(axis) ? dossierMenu.length : 0);
            const expanded = openTrayAxis === axis;

            return (
              <div
                key={axis}
                className={cn("sh-fold", ACCENT_BY_ACCESS_MODE[axis])}
              >
                <h3 aria-label={axisLabel(axis)} className="sh-fold-heading">
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={`sh-fold-${axis}`}
                    onClick={() => setOpenTrayAxis(expanded ? null : axis)}
                    className="sh-fold-trigger min-h-11"
                  >
                    <span className="sh-seed" aria-hidden="true" />
                    {axisLabel(axis)}
                    <span className="sh-fold-count">{entryCount}</span>
                    <ChevronDown
                      className="sh-caret"
                      size={13}
                      aria-hidden="true"
                    />
                  </button>
                </h3>
                {expanded ? (
                  <div id={`sh-fold-${axis}`} className="sh-fold-body">
                    {axis === "dossiers" ? (
                      <ActionLink
                        href={getLocalizedRoute(language, "dossiersHub")}
                        onClick={() => setTrayOpen(false)}
                      >
                        {t.chrome.allDossiers}
                      </ActionLink>
                    ) : null}
                    {axisModules(axis, "tray")}
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
        /* The locale code inside the third disc, dressed like the chip
           below: caption size, 700. It takes the disc's own ink — this is
           chrome, not the page speaking, so it never reads --accent. */
        .sh-lang-code {
          font-size: var(--afh-text-caption);
          font-weight: 700;
          letter-spacing: 0.04em;
          text-decoration: none;
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
        /* The six rubrics abreast, across the width of the bar.

           Three shapes were measured before this one. Full-width bands, one
           per rubric, pushed the last two rubrics below the fold. An auto-fill
           grid of columns fixed the height but not the holes: six rubrics into
           five tracks wraps the sixth onto a second row that starts below the
           tallest of the first, so a 240px void opened in the middle. Flowed
           CSS columns closed the void and cost the row — a flowed column fills
           to its own height before starting the next, which is what put
           Territoires and Économie *under* Organisation rather than beside it.

           None of the three was survivable while a rubric was four cards tall.
           Now that it is one (RUBRIC_PANEL_LIMIT), equal grid tracks hold: the
           rubrics are the same height, so there is no void to balance, and the
           narrow desktop widths where six tracks will not fit wrap into a
           second row that costs one card-height instead of four.

           auto-fit rather than a literal repeat(6, ...): the rubrics come from
           MODULE_GROUP_ORDER and an empty one is dropped, so their number is a
           property of the corpus.

           172px is the floor a rubric name needs, not a round number: a name
           is a single word under 0.16em of tracking, so it has nowhere to wrap
           and a narrower track lets it run out over its neighbour — measured
           at 900px, where ORGANISATION (166px of ink) sat across RELIGIONS. It
           still admits six tracks at the 1200px desktop reference. */
        .sh-grid-filed {
          grid-template-columns: repeat(auto-fit, minmax(172px, 1fr));
          gap: 9px 12px;
        }
        .sh-rubric {
          /* Kept from the flowed-column layout it replaces: a rubric that
             split across a break would put a heading over some of its
             dossiers and the rest under the next heading. */
          break-inside: avoid;
        }
        .sh-rubric-entries {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 9px;
        }
        /* Deliberately not a card: it is a way out of the rubric, not one more
           reading in it, and a reader scanning four cards must not take the
           count for a fifth. */
        .sh-rubric-more {
          font-size: var(--afh-text-small);
          color: var(--afh-fg-muted);
          text-decoration: none;
          padding: 4px 2px;
          min-height: 44px;
          display: flex;
          align-items: center;
          text-align: left;
        }
        .sh-rubric-more:hover,
        .sh-rubric-more:focus-visible {
          color: var(--afh-text);
          text-decoration: underline;
        }
        .sh-rubric-name {
          margin: 0 0 7px;
          /* Sized at --afh-text-small rather than at the kicker's 12px:
             brand-charter.md §8.5 — a label that keeps only its tracking and
             loses its size stops filing the block and reads as a caption
             between cards. It carries no colour of its own so it does not
             compete with the per-module accents on the tiles below it. */
          font-size: var(--afh-text-small);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.16em;
          color: var(--afh-fg-muted);
          /* Opts out of the mobile centring styles/mobile-text.css puts on
             the body below 768px, the way that file says a component should:
             a rubric files the cards under it, so it has to start on the same
             reading edge they do. */
          text-align: left;
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
          /* Opts out of the mobile centring that styles/mobile-text.css puts
             on the body below 768px, the way that file says a component
             should. A menu entry is a destination in a list, not composition:
             the glyph sets the reading edge, and every name has to start on
             it. It only ever showed on a name long enough to wrap — the atlas
             and the games have none, and the dossiers axis drew no cards at
             all until this file stopped special-casing it, so "Lunda :
             alliances et circulations" was the first entry to reveal it. */
          text-align: left;
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
        /* The switch as a tray row: the same box as a fold trigger, so the
           four rows of the tray share one left edge and one height. */
        .sh-lang-row {
          display: flex;
          align-items: center;
          padding: 15px 18px;
          border-bottom: 1px solid var(--afh-border);
          font-size: var(--afh-text-small);
          font-weight: 700;
          color: var(--sh-ink);
          text-decoration: none;
        }
        .sh-lang-row:hover {
          text-decoration: underline;
          text-underline-offset: 4px;
        }
        .sh-lang-row:focus-visible {
          outline: 2px solid var(--afh-cat-ocre);
          outline-offset: -2px;
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
        /* The fold's own 8px separates two cards; two rubrics are two
           subjects and need to read as further apart than that. */
        .sh-fold-body .sh-rubric + .sh-rubric {
          margin-top: 7px;
        }

        /* Mobile first: the phone gets the burger and the tray, and the
           three axes only appear once the bar is wide enough to hold them.
           One component, one switch, so the two branches cannot disagree
           about which viewport they are on. */
        .sh-axes,
        .sh-panel,
        .sh-lang {
          display: none;
        }
        .sh-burger {
          display: inline-grid;
        }
        @media (min-width: ${NAV_BREAKPOINT_PX}px) {
          .sh-axes {
            display: flex;
          }
          .sh-controls {
            margin-left: 0;
          }
          .sh-panel {
            display: block;
          }
          /* The switch and the burger trade places: the bar has room for
             a third disc once the burger is gone, and the tray row that
             carried the switch on the phone can no longer be opened. */
          .sh-lang {
            display: inline-grid;
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
