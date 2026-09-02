"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { AxisModulePanel } from "@/components/home/AxisModulePanel";
import { SectionHeading } from "@/components/home/SectionHeading";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";
import { getModuleHref } from "@/lib/hubs/moduleHref";
import {
  ACCENT_BY_ACCESS_MODE,
  ACCESS_MODE_LABELS,
  ACCESS_MODES,
  getModulesForAccessMode,
  type AccessMode,
} from "@/lib/hubs/moduleRegistry";
import type { HubModule } from "@/lib/hubs/moduleAvailability";
import type { Language } from "@/types/shared";
import type { CorpusCounts } from "@/lib/home/corpusCounts";
import {
  MAX_PANEL_WIDTH,
  OPENED_CARD_HEIGHT,
  OPENED_CARD_WIDTH,
  SCENE_MIN_WIDTH,
} from "@/lib/home/axisGraphGeometry";

/**
 * The three entry points (REQ-113): not a menu to read, three targets to
 * hit. Each carries a live glyph, a figure and one verb — and the modules
 * behind it deploy on the home itself, around the card the reader clicked,
 * rather than on a hub page one load away (REQ-114).
 *
 * Every figure counts entries that exist. The card that once promised
 * "3 000 ans" was describing a span the corpus never held (ETNI-1198).
 */
interface AxisDefinition {
  id: AccessMode;
  cta: string;
  /**
   * What the reader finds behind the card, in one line.
   *
   * It used to state the registry's filing criterion as a rhetorical figure
   * — « Il arrive avec un nom. Il repart avec une fiche. » — which describes
   * the reader rather than the destination. A card has exactly one line to
   * say where the click lands, and spending it on the figure left a reader
   * who did not already know the difference between the three axes to guess.
   * The line now names the contents, in the same register as the header
   * panel's `menuBlurb`, which had always done it this way.
   */
  stake: string;
  figure: (counts: CorpusCounts) => string;
}

const plural = (count: number, singular: string, many = `${singular}s`) =>
  `${count} ${count > 1 ? many : singular}`;

const AXES: AxisDefinition[] = [
  {
    id: "atlas",
    cta: "Parcourir",
    stake:
      // « Le corpus » is the team's word for the collection, not the
      // reader's: it names the thing from the inside, and a first-time
      // visitor has no way to guess it means "the fiches on this site".
      "Les fiches du site : peuples, pays, langues et familles linguistiques.",
    figure: (counts) =>
      `${plural(counts.peoples, "peuple")} · ${plural(counts.countries, "pays", "pays")}`,
  },
  {
    id: "dossiers",
    cta: "Remonter",
    stake:
      "D'où viennent les noms, par où sont passés les peuples, et sur quelles sources.",
    figure: (counts) => `${plural(counts.migrations, "repère")} · 1 doctrine`,
  },
  {
    id: "jeux",
    cta: "Se tester",
    stake:
      "Des jeux et des quiz tirés des fiches, dont chaque réponse est sourcée.",
    // Counted off the registry, not written down: the axis promised
    // « 2 peuples face à face » back when Jouer held one comparison module,
    // and that sentence survived REQ-120 turning the hub into twelve games
    // as a plain falsehood. A count that reads itself cannot go stale again.
    //
    // Filtered through the same lock the hub uses, so the card and the hub
    // behind it count the same entries: a module behind a dark flag is not
    // listed there and must not be counted here.
    figure: () => plural(getModulesForAccessMode("jeux").length, "jeu", "jeux"),
  },
];

/**
 * Each glyph animates the thing its axis actually does, so the motion is a
 * second reading of the label rather than an ornament on it.
 */
function AxisGlyph({
  axis,
  animated,
}: {
  axis: AccessMode;
  animated: boolean;
}) {
  const cls = (name: string) => (animated ? name : undefined);

  if (axis === "atlas") {
    // Peoples scattered across the continent, briefly finding each other.
    const dots: Array<[number, number]> = [
      [14, 18],
      [26, 12],
      [38, 20],
      [20, 30],
      [33, 34],
      [12, 40],
      [40, 41],
    ];
    return (
      <svg viewBox="0 0 52 52" fill="none" aria-hidden="true">
        <path
          className={cls("g-thread")}
          d="M14 18 L26 12 L38 20"
          stroke="currentColor"
          strokeWidth="1.2"
          style={animated ? { animationDelay: ".2s" } : undefined}
        />
        <path
          className={cls("g-thread")}
          d="M20 30 L33 34 L40 41"
          stroke="currentColor"
          strokeWidth="1.2"
          style={animated ? { animationDelay: "1.5s" } : undefined}
        />
        {dots.map(([x, y], index) => (
          <circle
            key={`${x}-${y}`}
            className={cls("g-dot")}
            cx={x}
            cy={y}
            r="3"
            fill="currentColor"
            style={
              animated
                ? { animationDelay: `${(index * 0.34).toFixed(2)}s` }
                : undefined
            }
          />
        ))}
      </svg>
    );
  }

  if (axis === "dossiers") {
    // A trajectory writing itself across time.
    return (
      <svg viewBox="0 0 52 52" fill="none" aria-hidden="true">
        <path
          d="M8 40 H44"
          stroke="currentColor"
          strokeWidth="1.2"
          opacity=".3"
        />
        <path
          className={cls("g-arc")}
          d="M10 38 Q20 10 30 24 T44 14"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <circle cx="10" cy="38" r="2.4" fill="currentColor" opacity=".55" />
        <circle cx="44" cy="14" r="2.4" fill="currentColor" opacity=".55" />
      </svg>
    );
  }

  // Two entries brought face to face, and what they share.
  return (
    <svg viewBox="0 0 52 52" fill="none" aria-hidden="true">
      <circle
        className={cls("g-disc")}
        cx="20"
        cy="26"
        r="11"
        stroke="currentColor"
        strokeWidth="2"
        style={{ ["--shift" as string]: "5px" }}
      />
      <circle
        className={cls("g-disc")}
        cx="32"
        cy="26"
        r="11"
        stroke="currentColor"
        strokeWidth="2"
        style={{ ["--shift" as string]: "-5px" }}
      />
    </svg>
  );
}

/**
 * An axis is only as live as the modules behind it — and since the card now
 * deploys those very modules, it reads its promise off the same resolved
 * list it is about to show. That is stricter than asking the registry: the
 * server has probed each backing table, so an axis whose only module is a
 * route over an empty table stops promising. It starts promising again by
 * itself the day that table fills, with nothing here to remember to undo.
 */
function axisHasLiveModule(modules: HubModule[]): boolean {
  return modules.some((module) => module.available);
}

/**
 * Where the card sends a reader who never runs its JavaScript, and where a
 * crawler follows.
 *
 * It was the axis landing page until ETNI-1555 deleted the three of them, so
 * the fallback is now the first module the axis actually offers — the same
 * place the panel's first row leads, one load earlier. An axis offering
 * nothing yet has no honest destination at all, and says so by returning
 * null: the card renders as the button it has always behaved as.
 */
function fallbackAxisHref(
  modules: HubModule[],
  language: Language
): string | null {
  const first = modules.find((module) => module.available);
  return first ? getModuleHref(first, language) : null;
}

const PENDING_CTA = "Bientôt";

function pendingFigure(modules: HubModule[]): string {
  const count = modules.length;
  return `${count} module${count > 1 ? "s" : ""} en préparation`;
}

export interface AccessAxesProps {
  language: Language;
  counts: CorpusCounts;
  modulesByAxis: Record<AccessMode, HubModule[]>;
}

// @req REQ-113
// @req REQ-114
export function AccessAxes({
  language,
  counts,
  modulesByAxis,
}: AccessAxesProps) {
  const reducedMotion = usePrefersReducedMotion();
  const animated = !reducedMotion;

  const [openAxis, setOpenAxis] = useState<AccessMode | null>(null);
  // The card is an anchor when the axis has somewhere to send a reader
  // without JavaScript, and a button when it has not — the close handler only
  // ever asks it to take focus.
  const cardRefs = useRef<Partial<Record<AccessMode, HTMLElement>>>({});

  const close = useCallback(() => {
    setOpenAxis((current) => {
      // The card is where the reader's attention was when they opened the
      // panel, so it is where the focus has to come back to.
      if (current) cardRefs.current[current]?.focus();
      return null;
    });
  }, []);

  useEffect(() => {
    if (!openAxis) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [openAxis, close]);

  return (
    <>
      {/* Outside the <nav>, which is itself the grid: a child of it would be
          laid out as a fourth cell.

          It is a heading now, where it used to be a paragraph. The old line
          — « Avec quoi le lecteur arrive, avec quoi il repart. » — named the
          rule by which modules are filed behind the three axes, which is a
          statement about the shelving, not about the choice being asked of
          the reader. The section is the page's entry point; it says so, and
          the outline gains the rung it was missing. */}
      <SectionHeading
        eyebrow="Par où commencer"
        title="Trois chemins, selon ce que vous cherchez."
        testId="home-axes-heading"
        className="access-axes-heading"
      />

      <nav
        aria-label="Les trois axes"
        data-testid="access-axes"
        data-open={openAxis ?? "none"}
        className="access-axes"
      >
        {AXES.map((axis, index) => {
          const modules = modulesByAxis[axis.id] ?? [];
          const available = axisHasLiveModule(modules);
          const open = openAxis === axis.id;
          const fallbackHref = fallbackAxisHref(modules, language);

          const cardProps = {
            ref: (element: HTMLElement | null) => {
              if (element) cardRefs.current[axis.id] = element;
            },
            "data-testid": `access-axis-${axis.id}`,
            // The click never leaves the home, and the route interstitial
            // has no other way to know: it reads clicks off the document,
            // where a card cancelling its own navigation and Next's Link
            // cancelling the native one look identical.
            "data-opens-in-place": "true",
            "data-available": available ? "true" : "false",
            "data-state": open ? "open" : undefined,
            "aria-expanded": open,
            "aria-controls": `axis-panel-${axis.id}`,
            onClick: (event: { preventDefault: () => void }) => {
              event.preventDefault();
              if (open) close();
              else setOpenAxis(axis.id);
            },
            className: cn(
              "access-axis min-h-11",
              ACCENT_BY_ACCESS_MODE[axis.id],
              animated && !openAxis && "access-axis-reveal",
              !available && "access-axis-pending"
            ),
            style:
              animated && !openAxis
                ? { animationDelay: `${index * 90}ms` }
                : undefined,
          };

          const card = (
            <>
              <span
                data-testid={`access-axis-glyph-${axis.id}`}
                aria-hidden="true"
                className="access-axis-glyph"
              >
                <AxisGlyph axis={axis.id} animated={animated} />
              </span>
              {/* h3: the card is an item of the section whose heading sits
                  above the grid, not a sibling of it. */}
              <h3 id={`access-axis-title-${axis.id}`}>
                {ACCESS_MODE_LABELS[axis.id]}
              </h3>
              <p
                data-testid={`access-axis-stake-${axis.id}`}
                className="access-axis-stake"
              >
                {axis.stake}
              </p>
              <p
                data-testid={`access-axis-figure-${axis.id}`}
                className="access-axis-figure"
              >
                {available ? axis.figure(counts) : pendingFigure(modules)}
              </p>
              {/* The verb is a promise about the click. Once the click has
                  landed and the modules are deployed around the card,
                  there is nothing left for it to promise. */}
              {open ? null : (
                <span
                  data-testid={`access-axis-cta-${axis.id}`}
                  className="access-axis-cta"
                >
                  {available ? axis.cta : PENDING_CTA}
                  <span className="access-axis-arrow" aria-hidden="true">
                    →
                  </span>
                </span>
              )}
            </>
          );

          // With JavaScript the click never spends a page load on the href:
          // it deploys the modules here, and the next click is the module
          // itself. The href only ever served the reader who runs none, and
          // the crawler — which is why an axis with nothing to offer drops it
          // rather than invent a destination.
          return fallbackHref ? (
            <Link key={axis.id} href={fallbackHref} {...cardProps}>
              {card}
            </Link>
          ) : (
            <button key={axis.id} type="button" {...cardProps}>
              {card}
            </button>
          );
        })}

        {openAxis ? (
          <div className="axis-stage">
            <AxisModulePanel
              language={language}
              mode={openAxis}
              modules={modulesByAxis[openAxis] ?? []}
              labelledBy={`access-axis-title-${openAxis}`}
              onClose={close}
            />
          </div>
        ) : null}
      </nav>

      <style>{`
        /* Only the width and the alignment: the dress is the shared unit's
           (src/styles/section-heading.css), so this section cannot drift
           away from the four others. */
        .access-axes-heading {
          max-width: ${MAX_PANEL_WIDTH}px;
          margin-inline: auto;
        }

        .access-axes {
          display: grid;
          grid-template-columns: repeat(${ACCESS_MODES.length}, 1fr);
          gap: 18px;
          max-width: ${MAX_PANEL_WIDTH}px;
          margin: 0 auto;
        }

        /* An axis opens on the page rather than on a route of its own: the
           group becomes a stage, the two other cards step out of it, and
           the chosen one takes the centre with its modules deployed
           around it. */
        .access-axes:not([data-open="none"]) {
          display: block;
          position: relative;
        }
        .access-axes:not([data-open="none"])
          .access-axis:not([data-state="open"]) {
          display: none;
        }
        .access-axes:not([data-open="none"]) .access-axis[data-state="open"] {
          position: absolute;
          left: 50%;
          top: 50%;
          /* The scene deploys around this card and has to keep off it, so
             the box it holds is the box the geometry reserves. Read from
             there rather than set here: the reservation was a hand-tuned
             number that stopped matching the card the day it grew a stake
             line, and the two middle modules ended up across its title. */
          width: ${OPENED_CARD_WIDTH}px;
          min-height: ${OPENED_CARD_HEIGHT}px;
          transform: translate(-50%, -50%);
          /* Sits mid-stack on purpose: the module nodes carry a z-index
             derived from their depth, so the ones behind the ring pass
             behind the card and the ones in front pass over it. Putting
             the card on top would flatten the scene it stands in. */
          z-index: 10;
          animation: axis-card-centre var(--afh-duration-slow)
            var(--afh-ease-out) both;
        }
        @keyframes axis-card-centre {
          from {
            opacity: 0.5;
            transform: translate(-50%, -50%) scale(0.88);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        .axis-stage {
          position: relative;
        }

        .access-axis {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 14px;
          background: var(--afh-surface);
          border: 1px solid var(--afh-border);
          border-radius: var(--afh-radius-md);
          padding: 24px 22px;
          text-decoration: none;
          color: var(--afh-text);
          position: relative;
          overflow: hidden;
          transition: border-color var(--afh-duration-fast) var(--afh-ease-out),
            transform var(--afh-duration-base) var(--afh-ease-out);
        }

        /* A wash of the axis colour rises from the floor on approach. */
        .access-axis::after {
          content: "";
          position: absolute;
          inset: auto 0 0 0;
          height: 0;
          background: linear-gradient(
            to top,
            color-mix(in srgb, var(--accent) 14%, transparent),
            transparent
          );
          transition: height var(--afh-duration-base) var(--afh-ease-out);
          pointer-events: none;
        }
        .access-axis:hover,
        .access-axis:focus-visible {
          border-color: var(--accent);
          transform: translateY(-3px);
        }
        .access-axis:hover::after,
        .access-axis:focus-visible::after {
          height: 100%;
        }
        .access-axis:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }

        .access-axis-glyph {
          width: 52px;
          height: 52px;
          flex: none;
          position: relative;
          z-index: 1;
          color: var(--accent);
        }
        .access-axis-glyph svg {
          width: 100%;
          height: 100%;
        }

        /* --afh-text-h2, not the fixed 26px it used to carry: the section
           heading above is --afh-text-h1, and a fixed card title overtook
           it below ~700px — the group heading ended up smaller than the
           three cards it heads, on mobile, which is the width most readers
           arrive at. A fluid step keeps the two in order at every size. */
        .access-axis h3 {
          font-family: var(--afh-font-display);
          font-weight: 900;
          font-size: var(--afh-text-h2);
          margin: 0;
          letter-spacing: -0.015em;
          position: relative;
          z-index: 1;
        }

        .access-axis-stake {
          /* On the card's own rhythm, like every other pair in it. Pulling
             the stake up by 6px and the figure by 10px left the three text
             lines 8px then 4px apart where every other neighbouring pair
             on the card sits 14px apart, so the block read as one crowded
             paragraph rather than a statement and its evidence. */
          margin: 0;
          font-size: var(--home-text-axis-stake);
          line-height: 1.4;
          /* Content at small type, so it takes the muted *pair* token that
             clears AA on both cards — never --afh-text-muted, which clears
             it on neither. */
          color: var(--afh-fg-muted);
          position: relative;
          z-index: 1;
        }

        .access-axis-figure {
          margin: 0;
          font-family: var(--afh-font-mono);
          font-size: var(--home-text-axis-figure);
          /* The count is content, not chrome, and it is the smallest type
             on the page. --afh-text-muted clears AA on neither card
             (3.29:1 parchment, 4.21:1 night); the muted *pair* token does,
             on both. */
          color: var(--afh-fg-muted);
          font-variant-numeric: tabular-nums;
          position: relative;
          z-index: 1;
        }

        /* Pending, not disabled: the hub behind it is where the reader
           sees what is coming, so it stays reachable and keyboard-
           operable. Only the promise is dialled back.

           The glyph alone is softened. It is aria-hidden decoration, so
           no contrast rule applies to it; dimming the CTA text with it
           took that text under the AA bar, which axe caught on the live
           route. The word already reads "Bientôt" — it does not need to
           be faint to say so. */
        .access-axis-pending .access-axis-glyph {
          opacity: 0.62;
        }

        .access-axis-cta {
          margin-top: auto;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-height: 44px;
          /* The actions charter files control labels under the small role.
             The card is itself the link, so this span cannot be an
             ActionLink — it wears form A's dress without being a second
             link. */
          font-size: var(--afh-text-small);
          font-weight: 600;
          /* Text, so it takes --accent-ink, not the --accent fill: the fill
             measures 3.10-4.39:1 on the card and drops further once the hover
             wash tints the floor behind it. The glyph above keeps --accent —
             it is aria-hidden decoration, not text. */
          color: var(--accent-ink);
          position: relative;
          z-index: 1;
        }
        .access-axis-arrow {
          transition: transform var(--afh-duration-base) var(--afh-ease-out);
        }
        .access-axis:hover .access-axis-arrow {
          transform: translateX(5px);
        }

        /* Glyph motion — each one shows what its axis does. */
        @keyframes g-pulse {
          0%, 100% { opacity: .35; r: 2.6; }
          50% { opacity: 1; r: 3.6; }
        }
        @keyframes g-thread {
          0%, 100% { opacity: 0; }
          45%, 55% { opacity: .85; }
        }
        @keyframes g-draw {
          0% { stroke-dashoffset: 92; }
          55%, 100% { stroke-dashoffset: 0; }
        }
        @keyframes g-approach {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(var(--shift)); }
        }
        @keyframes access-axis-reveal {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: none; }
        }

        .g-dot { animation: g-pulse 2.8s ease-in-out infinite; }
        .g-thread { animation: g-thread 3.6s ease-in-out infinite; }
        .g-arc {
          stroke-dasharray: 92;
          animation: g-draw 3.4s ease-in-out infinite;
        }
        .g-disc { animation: g-approach 3s ease-in-out infinite; }
        .access-axis:hover .g-dot,
        .access-axis:hover .g-thread,
        .access-axis:hover .g-arc,
        .access-axis:hover .g-disc {
          animation-duration: 1.4s;
        }
        .access-axis-reveal {
          animation: access-axis-reveal var(--afh-duration-pageload)
            var(--afh-ease-out) both;
        }

        /* On a phone the stacked card wasted most of its height on air. The
           same three targets become rows: glyph, label, arrow — one thumb's
           reach each, and the whole set visible without scrolling twice.

           It folds at the width the module panel drops its scene at, which
           is the project's mobile bound — the two have to be the same
           number, or a card laid out as a row would host a scene placing
           its modules around a centre that card no longer has. The 0.02px
           keeps this fold and the panel's own min-width query from both
           answering true at exactly SCENE_MIN_WIDTH. */
        @media (max-width: ${SCENE_MIN_WIDTH - 0.02}px) {
          .access-axes {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          /* No stage on a phone: the opened card stays in flow and its
             modules stack under it, which is also where AxisModulePanel
             drops the graph and its second WebGL context.

             It also leaves the three-column row below — that grid places
             its children by named area, and the panel that follows the
             card has no area of its own. */
          .access-axes:not([data-open="none"]) .access-axis[data-state="open"] {
            position: static;
            width: auto;
            /* The box the scene keeps clear of is a scene concern. Down
               here the modules are rows under the card, so holding it open
               to 240px only buys the phone a screenful of air. */
            min-height: 0;
            transform: none;
            animation: none;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
            padding: 18px;
          }
          .access-axis {
            display: grid;
            grid-template-columns: auto minmax(0, 1fr);
            /* A named row per line, or the element is simply not placed.
               The stake sits between the name and the figure: it is what
               orients the reader, the count only backs it up. */
            grid-template-areas:
              "glyph name"
              "glyph stake"
              "glyph figure"
              "cta   cta";
            align-items: center;
            column-gap: 16px;
            row-gap: 2px;
            padding: 16px 18px;
          }
          .access-axis-glyph { grid-area: glyph; width: 42px; height: 42px; }
          .access-axis h3 { grid-area: name; }
          .access-axis-stake {
            grid-area: stake;
            margin: 0;
          }
          .access-axis-figure {
            grid-area: figure;
            margin: 0;
          }
          /* Pending, not disabled: the hub behind it is where the reader
           sees what is coming, so it stays reachable and keyboard-
           operable. Only the promise is dialled back.

           The glyph alone is softened. It is aria-hidden decoration, so
           no contrast rule applies to it; dimming the CTA text with it
           took that text under the AA bar, which axe caught on the live
           route. The word already reads "Bientôt" — it does not need to
           be faint to say so. */
        .access-axis-pending .access-axis-glyph {
          opacity: 0.62;
        }

          /* The verb keeps its words here. It used to be zeroed out below
             this breakpoint, which left the reader a bare
             arrow and no promise — on a mobile-first product, on the
             one element of the card whose whole job is to say what the
             click does. It takes a row of its own rather than a third
             column: at 320px a column wide enough for « Parcourir → »
             leaves the stake too little to be read. */
          .access-axis-cta { grid-area: cta; margin: 0; }
          .access-axis:hover { transform: none; }
        }
      `}</style>
    </>
  );
}
