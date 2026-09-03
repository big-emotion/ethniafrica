"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AfricaBasemap } from "@/components/system/AfricaBasemap";
import { useFacetCountryReading } from "@/components/hubs/facets/FacetCountryIndex";
import { buildContinentOverlay } from "@/lib/atlas/overlays";
import {
  buildCountryPickerTargets,
  continentTargetFacts,
} from "@/lib/atlas/targets";
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
 * and never evaluates it. A class assembled from a template literal — the width
 * held in a constant and interpolated into the variant — compiles to no rule at
 * all, and the failure is silent: the class reaches the DOM and matches nothing.
 *
 * The scanner reads comments with the same eyes, which is why the sentence
 * above describes that mistake instead of showing it. Written out, the example
 * was itself extracted as a candidate and took both real classes down with it:
 * the map would not fold, and the only reason half of it appeared to work was
 * that the contract test happened to contain the same string.
 */
const FOLD_CONTROL_CLASS = "min-[760px]:hidden";
const FOLDED_STAGE_CLASS = "max-[759px]:data-[globe-folded=true]:hidden";

export interface FacetGlobeIslandProps {
  /** ISO 3166-1 alpha-3 → documented peoples, the field the continent is shaded by. */
  peopleCountsByCountry: Record<string, number> | undefined;
  /**
   * Every country the corpus gives a fiche.
   *
   * The radial field and the choosable set are not the same thing.
   * `buildContinentOverlay` keeps at most twelve areas, because a field is a
   * claim about how much the corpus documents somewhere and past a dozen the
   * stage reads as a ranking. Choosing is a separate question, and this list
   * is its answer: `pickerTargets` is what makes all fifty-four reachable, and
   * AtlasGlobe marks each of them so the reader can see that they are.
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

  // Fed the counts as well as the ids: the drawn field covers twelve countries
  // and the offered set all fifty-four, so a target taking its count from the
  // overlay would have the other forty-two announce "0 peuples documentés".
  const pickerTargets = useMemo(
    () =>
      buildCountryPickerTargets(
        countryIds as CountryId[],
        peopleCountsByCountry
      ),
    [countryIds, peopleCountsByCountry]
  );

  /**
   * What the panel says about the country the reader aimed at.
   *
   * A map click always yields a country, so the panel answers the only
   * question the map can pose: what does the facet you are reading, narrowed
   * by the filters you set, have *here*. On the countries facet that is the
   * country itself; on peoples and families it is the handful of rows that
   * touch it. A country the current selection does not reach says so, rather
   * than opening empty — which is the difference between "nothing here" and
   * "still loading".
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
            {/* Above the rows, because it is the answer to their number:
                Ghana opens with eighty-six peoples, and a control to take
                them all into the list is no use under eighty-six names. */}
            {alreadyNarrowed ? (
              <p data-testid="facet-panel-narrowed">
                La liste est déjà réduite à ce pays.
              </p>
            ) : (
              narrowHref && (
                <Link
                  href={narrowHref}
                  data-testid="facet-panel-narrow"
                  style={{ color: "var(--accent-ink)" }}
                >
                  {/* "ce pays" rather than the name: French wants an article
                      before most of them — le Ghana, la Namibie, l'Angola,
                      les Comores, and none at all for Madagascar — and the
                      corpus stores no gender to pick one from. The panel is
                      titled with the country, so the deixis resolves on
                      screen; the colon carries the name to a reader hearing
                      this link out of its context, and needs no article. */}
                  Réduire la liste à ce pays
                  <span className="sr-only"> : {base.title}</span>
                </Link>
              )
            )}
            <ul data-testid="facet-panel-rows">
              {rows.map((row) => (
                <li key={row.id}>
                  <Link href={row.href}>{row.label}</Link>
                </li>
              ))}
            </ul>
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
          // A fixed band, never an aspect ratio. The stage is full-bleed, so
          // an aspect-ratio box takes its height from the *viewport* width: at
          // 1512px it asked for 1433px and the hub opened on a wall of night
          // with the map below the fold — measured on the deployed recette.
          // space.css records the same lesson for the fiche band, and this is
          // the token it records it in, so the shell and the globe inside it
          // agree by construction rather than by two numbers that match today.
          height: "var(--afh-globe-stage-height)",
          overflow: "hidden",
        }}
      >
        {visible ? (
          <AtlasGlobe
            overlay={overlay}
            missingMessage={missingMessage}
            targetFacts={facetFacts}
            readingCountryId={reading.focused}
            // Fifty-four labelled 22px pastilles overlap into noise at 430px,
            // so the list is what names them; AtlasGlobe still marks each one
            // on the stage, small and inert, so the map shows what it offers.
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
    </>
  );
}
