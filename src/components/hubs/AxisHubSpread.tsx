import Image from "next/image";
import Link from "next/link";
import { createElement } from "react";

import type { HubModule } from "@/lib/hubs/moduleAvailability";
import { TILES_EARNING_A_FLOOR, type HubSpread } from "@/lib/hubs/hubSpread";
import { glyphForModule } from "@/lib/hubs/moduleGlyphs";
import { getModuleHref } from "@/lib/hubs/moduleHref";
import {
  ACCENT_BY_ACCESS_MODE,
  type AccessMode,
} from "@/lib/hubs/moduleRegistry";
import { getTranslation } from "@/lib/translations";
import { cn } from "@/lib/utils";
import type { Language } from "@/types/shared";

/**
 * The axis hub, as brand charter §8.6 rules it: two blocks and nothing else.
 *
 * ETNI-1555 deleted `/fr/atlas` and `/fr/jeux` for a fault of the band they
 * carried rather than of the pages — viewport-tall and bottom-aligned, so the
 * reader met the masthead, a screen of empty parchment, and the title they had
 * asked for past the fold. This spread earns its height instead of asserting
 * it: the text column holds the axis's whole menu set, and the floor that
 * makes the two columns meet applies only from 768px, where those tiles are
 * side by side rather than stacked.
 *
 * It repeats the header; it does not extend it. The tiles are the axis's nav
 * modules, wearing the shared table's glyph and the shared dictionary's label,
 * and the sentence under the title is the one the panel shows above the same
 * set. A hub that composed its own would be a second account of one axis, and
 * the reader would have no way to tell which was current.
 *
 * No `PageHero`: the block below names the axis in its own first line, and a
 * plate above it would print that name twice.
 */
interface AxisHubSpreadProps {
  axis: AccessMode;
  language: Language;
  /** The axis's nav modules with their availability already resolved. */
  modules: HubModule[];
  /** Drawn once by the server for this request. */
  spread: HubSpread;
}

// @req REQ-114
export function AxisHubSpread({
  axis,
  language,
  modules,
  spread,
}: AxisHubSpreadProps) {
  const t = getTranslation(language);
  const hub = t.hubs[axis];
  const { plate } = spread;

  /**
   * The sentence an axis owes when most of it is withheld.
   *
   * Brand charter §3: a hub that lists four modules and marks three
   * **Bientôt** is the interface telling a reader the corpus is thinner than
   * it is — and the reader is owed the reason, not the count. The dossiers
   * axis is the case: its readings are being rewritten, and the index that
   * used to stand here said so in as many words.
   *
   * Derived from what the registry actually answered rather than from the
   * axis's name, so the line disappears on its own when the readings come
   * back, and so no axis is special-cased in this file — which is the drift
   * that once gave the dossiers panel a navigation unlike its neighbours.
   */
  const withheld = modules.filter((module) => !module.available).length;
  const status =
    "frozenStatus" in hub && withheld > modules.length - withheld
      ? hub.frozenStatus
      : null;

  return (
    <section
      data-testid="hub-spread"
      data-orientation={spread.orientation}
      // Whether this axis's text column has enough in it to fill a screen.
      // Declared on the page rather than assumed by the stylesheet, because
      // the answer differs per axis and it is the registry that decides it.
      data-earns-floor={modules.length >= TILES_EARNING_A_FLOOR}
      className={cn("hub-spread", ACCENT_BY_ACCESS_MODE[axis])}
    >
      <div className="afh-shell hub-spread-inner">
        {/* Text first in the DOM in both draws. The die takes the painting
            order — `order` on the grid children — and never the reading one:
            a tab sequence that changes with a coin toss is a bug that
            reproduces half the time. */}
        <header data-testid="hub-spread-text" className="hub-spread-text">
          <h1 className="page-title-gradient hub-spread-title">{hub.title}</h1>
          <p className="hub-spread-blurb">{hub.menuBlurb}</p>
          {status ? (
            <p data-testid="hub-spread-status" className="hub-spread-status">
              {status}
            </p>
          ) : null}

          <ul className="hub-spread-tiles">
            {modules.map((module) => (
              <li key={module.id}>
                <HubTile
                  module={module}
                  language={language}
                  label={t.hubs.moduleNames[module.id] ?? module.name}
                  unavailableLabel={t.hubs.unavailableLabel}
                />
              </li>
            ))}
          </ul>
        </header>

        <figure data-testid="hub-spread-plate" className="hub-spread-plate">
          <div className="hub-spread-plate-frame">
            <Image
              src={plate.src}
              alt={plate.alt}
              fill
              sizes="(min-width: 1200px) 520px, (min-width: 768px) 46vw, calc(100vw - 32px)"
              style={{ objectPosition: plate.position }}
            />
          </div>
          {/* §9: the licence is published, not named. A public-domain plate
              carries no second link because it owes no notice — it is still
              credited, and its own file is still reachable. */}
          <figcaption>
            {plate.sourceUri ? (
              <a href={plate.sourceUri} rel="noreferrer">
                {plate.credit}
              </a>
            ) : (
              plate.credit
            )}
            {plate.licenceUri ? (
              <>
                {" — "}
                <a href={plate.licenceUri} rel="license noreferrer">
                  {t.hubs.plateLicenceLabel}
                </a>
              </>
            ) : null}
          </figcaption>
        </figure>
      </div>

      <style>{`
        .hub-spread-inner {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: var(--afh-space-8xl);
          padding-block: var(--afh-space-8xl);
        }

        .hub-spread-title {
          font-size: var(--afh-text-hero);
          font-weight: 900;
          line-height: 1.05;
          margin: 0;
        }

        .hub-spread-blurb {
          margin: var(--afh-space-2xl) 0 0;
          font-size: var(--afh-text-lead);
          color: var(--afh-text-soft);
          max-width: 46ch;
        }

        /* Reads as a note about the list below it, not as a second blurb: the
           accent rule tells the reader it belongs to this axis, and the size
           keeps it under the sentence it qualifies. */
        .hub-spread-status {
          margin: var(--afh-space-2xl) 0 0;
          padding-left: var(--afh-space-lg);
          border-left: 2px solid var(--accent);
          font-size: var(--afh-text-small);
          color: var(--afh-text-soft);
          max-width: 46ch;
          text-align: left;
        }

        .hub-spread-tiles {
          list-style: none;
          margin: var(--afh-space-6xl) 0 0;
          padding: 0;
          display: grid;
          gap: var(--afh-space-lg);
        }

        /* The menu's card, on parchment rather than on a panel. Same three
           parts in the same order, so a module is the same object in both
           places; the surface differs because the grounds do. */
        .hub-tile {
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
        .hub-tile:hover {
          border-color: var(--accent);
          transform: translateX(3px);
        }
        .hub-tile:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
        .hub-tile[aria-disabled="true"] {
          opacity: 0.62;
          pointer-events: none;
        }

        .hub-tile-glyph {
          width: 28px;
          height: 28px;
          border-radius: var(--afh-radius-sm);
          flex: none;
          display: grid;
          place-items: center;
          color: var(--accent-ink);
          background: color-mix(in srgb, var(--accent) 14%, transparent);
        }

        .hub-tile-text {
          min-width: 0;
          /* Opts out of the mobile centring styles/mobile-text.css puts on the
             body below 768px, the way that file says a component should. A
             tile is a destination in a list, not composition: the glyph sets
             the reading edge and every name starts on it. */
          text-align: left;
        }
        .hub-tile-name {
          display: block;
          font-size: var(--afh-text-small);
          font-weight: 700;
          line-height: 1.35;
        }

        .hub-tile-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 7px;
          font-size: var(--afh-text-caption);
          font-weight: 700;
          padding: 3px 10px;
          border-radius: var(--afh-radius-full);
          border: 1px solid currentColor;
          color: var(--afh-conf-low-ink);
        }
        .hub-tile-chip-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
          flex: none;
        }

        .hub-spread-plate {
          margin: 0;
          display: flex;
          flex-direction: column;
        }
        .hub-spread-plate-frame {
          position: relative;
          width: 100%;
          aspect-ratio: 4 / 3;
          border-radius: var(--afh-radius-lg);
          overflow: hidden;
          border: 1px solid var(--afh-border);
          background: var(--afh-bg-warm);
        }
        .hub-spread-plate-frame img {
          object-fit: cover;
        }
        .hub-spread-plate figcaption {
          margin-top: var(--afh-space-lg);
          font-size: var(--afh-text-caption);
          color: var(--afh-text-soft);
        }
        .hub-spread-plate figcaption a {
          color: inherit;
        }

        @media (min-width: 768px) {
          .hub-spread-inner {
            grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
            gap: var(--afh-space-9xl);
          }

          /* The §8.2 exception, and the only viewport measure in this file.
             Two conditions, both of them the ones the charter licensed it
             under: the tiles sit beside the plate rather than above it, and
             there are enough of them to fill the height being asked for.
             Jouer draws two, so Jouer takes its content's height like every
             other band on the site. */
          .hub-spread[data-earns-floor="true"] .hub-spread-inner {
            min-height: calc(
              100svh - var(--afh-header-height) - var(--afh-space-8xl)
            );
          }

          /* The die, and only here: the columns swap where they are painted,
             never where they are read. */
          .hub-spread[data-orientation="plate-first"] .hub-spread-text {
            order: 2;
          }
          .hub-spread[data-orientation="plate-first"] .hub-spread-plate {
            order: 1;
          }

          /* What fills the floor is the plate, not empty parchment.
             Centring the items floated the whole block in the middle of the
             height it had just asked for — 500px of content in a 792px band,
             measured at 1440 on 7 September 2026, which is §8.2's own failure
             at a third of the scale. The plate has no intrinsic height to
             defend, so it is the half that stretches; the tiles keep theirs
             and sit centred against it. */
          .hub-spread-text {
            align-self: center;
          }
          .hub-spread-plate-frame {
            flex: 1;
            aspect-ratio: auto;
            min-height: 320px;
          }

          .hub-spread-tiles {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
      `}</style>
    </section>
  );
}

interface HubTileProps {
  module: HubModule;
  language: Language;
  label: string;
  unavailableLabel: string;
}

/**
 * One module as a card.
 *
 * Two questions, as the atlas charter §3 asks them: the route has to resolve,
 * *and* what sits behind it has to be worth the trip. An unbuilt route and a
 * module in preparation get the same inert row deliberately — the reader is
 * told there is nothing there yet, and owed no account of which of the two
 * produced it.
 */
function HubTile({ module, language, label, unavailableLabel }: HubTileProps) {
  const href = getModuleHref(module, language);
  const offered = href !== null && module.available;

  const body = (
    <>
      <span className="hub-tile-glyph" aria-hidden="true">
        {/* `createElement` rather than a capitalised local: the sign is
            resolved by a call, and a call that returns a component reads to
            `react-hooks/static-components` as a component declared inside a
            render. The header dodges it only because its own glyph arrives as
            a property of an already-built entry. */}
        {createElement(glyphForModule(module.id), {
          size: 15,
          strokeWidth: 1.9,
        })}
      </span>
      <span className="hub-tile-text">
        <span className="hub-tile-name">{label}</span>
        {offered ? null : (
          <span className="hub-tile-chip">
            <span className="hub-tile-chip-dot" aria-hidden="true" />
            {unavailableLabel}
          </span>
        )}
      </span>
    </>
  );

  // No anchor at all, and no focus stop: an anchor without an href would still
  // be a link the keyboard could reach.
  if (!offered) {
    return (
      <span
        data-testid={`hub-tile-${module.id}`}
        aria-disabled="true"
        tabIndex={-1}
        className="hub-tile"
      >
        {body}
      </span>
    );
  }

  return (
    <Link
      href={href}
      data-testid={`hub-tile-${module.id}`}
      className="hub-tile"
    >
      {body}
    </Link>
  );
}
