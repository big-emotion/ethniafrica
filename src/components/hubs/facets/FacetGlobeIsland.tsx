"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AfricaBasemap } from "@/components/system/AfricaBasemap";
import { useFacetCountryIndex } from "@/components/hubs/facets/FacetCountryIndex";
import { buildContinentOverlay } from "@/lib/atlas/overlays";
import {
  buildCountryPickerTargets,
  continentTargetFacts,
} from "@/lib/atlas/targets";
import type { AtlasTarget } from "@/lib/atlas/targets";
import type { CountryId } from "@/types/afrik";

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

export interface FacetGlobeIslandProps {
  /** ISO 3166-1 alpha-3 → documented peoples, the field the continent is shaded by. */
  peopleCountsByCountry: Record<string, number> | undefined;
  /**
   * Every country the corpus gives a fiche.
   *
   * The drawn field and the choosable set are not the same thing.
   * `buildContinentOverlay` keeps at most twelve areas and drops any whose
   * marker would overlap one already kept — a density rule, because fifty-four
   * pastilles at 430px overlap into noise and the small ones stop being
   * hittable. Without this list the *choosable* set collapses to that thinned
   * *drawn* set, and forty-odd countries become unreachable from the map
   * rather than merely unmarked. `pickerTargets` is the prop that separates
   * the two.
   */
  countryIds: readonly string[];
  missingMessage: string;
}

// @req REQ-116
export function FacetGlobeIsland({
  peopleCountsByCountry,
  countryIds,
  missingMessage,
}: FacetGlobeIslandProps) {
  const stage = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const countryIndex = useFacetCountryIndex();

  // The canvas gates its own rAF on intersection, but it still creates the GL
  // context and paints its texture at mount. Below the fold on a phone that
  // cost should simply never be paid. Copied from ExplorerContinent, which
  // learnt it first.
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

  const pickerTargets = useMemo(
    () => buildCountryPickerTargets(countryIds as CountryId[]),
    [countryIds]
  );

  /**
   * What the panel says about the country the reader aimed at.
   *
   * A map click always yields a country, so the panel answers the only
   * question the map can pose: what does the facet you are reading, narrowed
   * by the filters you set, have *here*. On the countries facet that is the
   * country itself; on peoples and families it is the rows that touch it. A
   * country the current selection does not reach says so, rather than opening
   * empty — which is the difference between "nothing here" and "still
   * loading".
   */
  const facetFacts = useCallback(
    (
      target: AtlasTarget
    ): {
      title: string;
      description: string;
      body: React.ReactNode;
    } => {
      const rows = countryIndex[target.countryId as CountryId] ?? [];
      const base = continentTargetFacts(target);

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
          <ul data-testid="facet-panel-rows">
            {rows.map((row) => (
              <li key={row.id}>
                <Link href={row.href}>{row.label}</Link>
              </li>
            ))}
          </ul>
        ),
      };
    },
    [countryIndex]
  );

  return (
    <div
      ref={stage}
      data-testid="facet-globe-island"
      data-globe-mounted={visible ? "true" : "false"}
      style={{
        position: "relative",
        width: "100vw",
        marginLeft: "calc(50% - 50vw)",
        marginRight: "calc(50% - 50vw)",
        // A fixed band, never an aspect ratio. The stage is full-bleed, so an
        // aspect-ratio box takes its height from the *viewport* width: at
        // 1512px it asked for 1433px of height and the hub opened on a wall of
        // night with the map somewhere below the fold. space.css records the
        // same lesson for the fiche band, and this is the token it records it
        // in — so the shell and the globe inside it agree by construction
        // rather than by two numbers that match today.
        height: "var(--afh-globe-stage-height)",
        backgroundColor: "var(--afh-night-ground)",
        containerType: "inline-size",
        overflow: "hidden",
      }}
    >
      {visible ? (
        <AtlasGlobe
          overlay={overlay}
          missingMessage={missingMessage}
          targetFacts={facetFacts}
          // Fifty-four countries as pastilles overlap into noise, which is why
          // the field is thinned; the list is how the other forty stay
          // reachable.
          targetPicker="list"
          pickerTargets={pickerTargets}
          areaNoun="l'atlas"
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
  );
}

export default FacetGlobeIsland;
