"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { AfricaBasemap } from "@/components/system/AfricaBasemap";
import { useFacetCountryReading } from "@/components/hubs/facets/FacetCountryIndex";
import { buildContinentOverlay } from "@/lib/atlas/overlays";
import { continentTargetFacts } from "@/lib/atlas/targets";
import { BASEMAP_VIEWBOX } from "@/lib/atlas/projection";
import type { AtlasTarget } from "@/lib/atlas/targets";
import type { CountryId } from "@/types/afrik";
import { cn } from "@/lib/utils";

/**
 * Mounted by the Explorer layout, once, for all three facets.
 *
 * Per-facet it would be a different component on every switch, and a
 * different component means a new WebGL context three times over — the
 * expensive half of the page thrown away to change which list is under it.
 * Sitting in the layout, it is the same element across the three sibling
 * routes, so switching facet repaints the reading and leaves the map alone.
 */
const AtlasGlobe = dynamic(
  () => import("@/components/atlas/AtlasGlobe").then((m) => m.AtlasGlobe),
  { ssr: false }
);

/**
 * Where the map folds, written out rather than composed.
 *
 * The fold is at 760px — not one of the layout breakpoints (md 720 / xl 800),
 * because those size a text column and this sizes a map. A full-bleed globe on
 * a phone is a screen of scrolling before the first row of the list, and the
 * list is the facet's guaranteed access path, so the reading comes first and
 * the map is offered.
 *
 * Both variants are whole literals because Tailwind's scanner reads source text
 * and never evaluates it: `min-[${WIDTH}px]:hidden` compiles to no rule at all,
 * and the failure is a class that silently does nothing.
 */
const FOLD_CONTROL_CLASS = "min-[760px]:hidden";
const FOLDED_STAGE_CLASS = "max-[759px]:data-[globe-folded=true]:hidden";

export interface FacetGlobeIslandProps {
  /** ISO 3166-1 alpha-3 → documented peoples, the field the continent is shaded by. */
  peopleCountsByCountry: Record<string, number> | undefined;
  missingMessage: string;
}

// @req REQ-116
export function FacetGlobeIsland({
  peopleCountsByCountry,
  missingMessage,
}: FacetGlobeIslandProps) {
  const stage = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [unfolded, setUnfolded] = useState(false);
  const reading = useFacetCountryReading();

  // The canvas gates its own rAF on intersection, but it still creates the GL
  // context and paints its texture at mount. Below the fold on a phone that
  // cost should simply never be paid. Copied from ExplorerContinent, which
  // learnt it first.
  //
  // Folded, the stage is `display: none` and never intersects anything, so on a
  // phone this also keeps the globe unbuilt until the reader asks for it — the
  // fold pays for itself twice. Unfolding needs no second observer: an element
  // coming back from `display: none` is a transition the one below reports.
  useEffect(() => {
    const node = stage.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      const frame = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const overlay = buildContinentOverlay(peopleCountsByCountry);

  /**
   * What the panel says about the country the reader aimed at.
   *
   * A map click always yields a country, so the panel answers the only
   * question the map can pose: what does the facet you are reading, narrowed
   * by the filters you set, have *here*. On the countries facet that is the
   * country itself; on peoples and families it is the handful of rows that
   * touch it. A country the current selection does not reach says so, rather
   * than opening empty.
   *
   * And it closes the loop back to the list. The map is a second channel of
   * selection, not a viewer: where the facet takes a country filter, the panel
   * offers the address of the whole reading narrowed to this country — a plain
   * anchor, so the narrowed view is somewhere a reader can be sent rather than
   * a state only their own clicking can reach.
   */
  const facetFacts = useCallback(
    (
      target: AtlasTarget
    ): {
      title: string;
      description: string;
      body: React.ReactNode;
    } => {
      const countryId = target.countryId as CountryId;
      const rows = reading.index[countryId] ?? [];
      const base = continentTargetFacts(target);
      const narrowHref = reading.narrowing[countryId];
      const alreadyNarrowed = reading.focused === countryId;

      if (rows.length === 0) {
        return {
          ...base,
          body: (
            <p data-testid="facet-panel-empty">
              Cette sélection ne documente rien dans ce pays.
            </p>
          ),
        };
      }

      return {
        ...base,
        body: (
          <>
            <ul data-testid="facet-panel-rows">
              {rows.map((row) => (
                <li key={row.id}>
                  <Link href={row.href}>{row.label}</Link>
                </li>
              ))}
            </ul>
            {alreadyNarrowed ? (
              <p data-testid="facet-panel-narrowed">
                La liste ne montre déjà que {base.title}.
              </p>
            ) : (
              narrowHref && (
                <Link
                  href={narrowHref}
                  data-testid="facet-panel-narrow"
                  style={{ color: "var(--accent-ink)" }}
                >
                  Ne garder que {base.title} dans la liste
                </Link>
              )
            )}
          </>
        ),
      };
    },
    [reading]
  );

  return (
    <>
      {/*
        The fold's control, and only ever the fold's: hidden from 760px up,
        where the map is simply on screen. It is a button rather than an anchor
        or a `<details>` because there is nothing to fold until the script has
        run — the globe is `ssr: false`, so with no JavaScript this control and
        the thing it opens are both absent and the list is the whole page. That
        is the intended degradation, not a gap to paper over.
      */}
      <button
        type="button"
        data-testid="facet-globe-fold"
        aria-expanded={unfolded}
        aria-controls="facet-globe-stage"
        onClick={() => setUnfolded((open) => !open)}
        className={cn(
          "min-h-11 w-full rounded-afh-lg border border-afh-border bg-afh-surface px-4 py-2 text-afh-body text-afh-text",
          FOLD_CONTROL_CLASS
        )}
      >
        {unfolded ? "Masquer la carte" : "Afficher la carte"}
      </button>

      <div
        id="facet-globe-stage"
        ref={stage}
        data-testid="facet-globe-island"
        data-globe-mounted={visible ? "true" : "false"}
        data-globe-folded={unfolded ? "false" : "true"}
        // Folded only below the fold width: from 760px up the attribute is
        // inert and the stage is always shown, so the desktop map owes nothing
        // to a state the reader never sets there.
        className={FOLDED_STAGE_CLASS}
        style={{
          position: "relative",
          width: "100vw",
          marginLeft: "calc(50% - 50vw)",
          marginRight: "calc(50% - 50vw)",
          backgroundColor: "var(--afh-night-ground)",
          containerType: "inline-size",
          aspectRatio: `${BASEMAP_VIEWBOX.width} / ${BASEMAP_VIEWBOX.height}`,
        }}
      >
        {visible ? (
          <AtlasGlobe
            overlay={overlay}
            missingMessage={missingMessage}
            targetFacts={facetFacts}
            readingCountryId={reading.focused}
          />
        ) : (
          // Server-rendered and painted first, so the hub reads cartographic
          // before anything is fetched or measured. The trace is already in the
          // bundle, so it costs no request.
          <AfricaBasemap
            data-testid="facet-globe-placeholder"
            aria-hidden="true"
            style={{ width: "100%", height: "100%", opacity: 0.18 }}
          />
        )}
      </div>
    </>
  );
}

export default FacetGlobeIsland;
