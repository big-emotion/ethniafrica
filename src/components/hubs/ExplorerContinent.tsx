"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AfricaBasemap } from "@/components/system/AfricaBasemap";
import { BASEMAP_VIEWBOX } from "@/lib/atlas/projection";
import { buildContinentOverlay } from "@/lib/atlas/overlays";
import {
  buildCountryPickerTargets,
  continentTargetFacts,
} from "@/lib/atlas/targets";
import { getLocalizedRoute } from "@/lib/routing";
import type { AtlasTarget } from "@/lib/atlas/targets";
import type { CountryId } from "@/types/afrik";

/**
 * Explorer's scene (REQ-114/REQ-116/REQ-117): the continent, with a radial
 * field over the countries the corpus documents best.
 *
 * Client, and not by preference — `targetFacts` is a function, and a
 * function cannot cross the server/client boundary. That is the same
 * reason the three fiche routes do not pass one either.
 */
const AtlasGlobe = dynamic(
  () => import("@/components/atlas/AtlasGlobe").then((m) => m.AtlasGlobe),
  { ssr: false }
);

export interface ExplorerContinentProps {
  /**
   * ISO 3166-1 alpha-3 → number of documented peoples. A plain record
   * because it crosses the server boundary; the overlay is derived here so
   * the server ships counts rather than geometry.
   */
  peopleCountsByCountry: Record<string, number> | undefined;
  /**
   * Every country the corpus documents — what the reader may *choose*, which
   * is wider than what the field draws. `buildContinentOverlay` ranks twelve
   * and the scene pins a labelled marker on each; this list is what makes the
   * other forty-two reachable, and AtlasGlobe gives each of them a small inert
   * mark so the scene shows the whole of what it offers.
   */
  countryIds: readonly string[];
  missingMessage: string;
}

// @req REQ-116
export function ExplorerContinent({
  peopleCountsByCountry,
  countryIds,
  missingMessage,
}: ExplorerContinentProps) {
  const stage = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  // The canvas gates its own rAF on intersection, but it still creates the
  // GL context and paints its texture at mount. Below the fold on a phone
  // that cost should simply never be paid.
  useEffect(() => {
    const node = stage.current;
    if (!node) return;

    // No observer (older browsers, jsdom): mount on the next frame rather
    // than never. Deferred, not synchronous, so the placeholder still gets
    // its paint and React is not re-entered from inside the effect body.
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

  // Carries the counts as well as the ids, so a country beyond the twelve the
  // field draws opens on its own figure rather than on "0 peuples documentés".
  const pickerTargets = useMemo(
    () =>
      buildCountryPickerTargets(
        countryIds as CountryId[],
        peopleCountsByCountry
      ),
    [countryIds, peopleCountsByCountry]
  );

  // The marker opens the panel; the panel is where the fiche link lives, so
  // a mis-hit at 430px costs a dismissal rather than a navigation and a
  // back-trip (REQ-117). Only the caller knows a country has a fiche, which
  // is why AtlasGlobe leaves this to targetFacts rather than linking itself.
  const factsWithFiche = useCallback(
    (target: AtlasTarget) => ({
      ...continentTargetFacts(target),
      body: (
        <Link
          data-testid="explorer-continent-fiche-link"
          href={`${getLocalizedRoute("fr", "countries")}/${target.countryId}`}
        >
          Voir la fiche du pays
        </Link>
      ),
    }),
    []
  );

  return (
    <div
      ref={stage}
      data-testid="explorer-continent"
      data-globe-mounted={visible ? "true" : "false"}
      style={{
        width: "100%",
        aspectRatio: `${BASEMAP_VIEWBOX.width} / ${BASEMAP_VIEWBOX.height}`,
      }}
    >
      {visible ? (
        <AtlasGlobe
          overlay={overlay}
          pickerTargets={pickerTargets}
          missingMessage={missingMessage}
          targetFacts={factsWithFiche}
        />
      ) : (
        // Rendered on the server and on the first paint, so the hub reads
        // cartographic before anything is fetched or measured. The trace is
        // already in the bundle, so it costs no request.
        <AfricaBasemap
          data-testid="explorer-continent-placeholder"
          aria-hidden="true"
          style={{ width: "100%", height: "100%", opacity: 0.18 }}
        />
      )}
    </div>
  );
}

export default ExplorerContinent;
