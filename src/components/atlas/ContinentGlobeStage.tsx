"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { AtlasGlobe } from "@/components/atlas/AtlasGlobe";
import type { GlobeSurface } from "@/lib/atlas/globePalette";
import { buildContinentOverlay } from "@/lib/atlas/overlays";
import { canCreateWebglContext } from "@/lib/home/webglSupport";

/**
 * The continent, on the one globe the repository has (ETNI-1360).
 *
 * This is the surface the home's opening module and the Mercator game both
 * stand on. They used to stand on a second engine of their own — a 639-line
 * point cloud with its own GLSL, its own fallback and its own tests, drawing
 * the same continent as AtlasGlobeCanvas. Two engines for one visual object is
 * the drift this stage exists to end: a change to how the continent is drawn
 * now lands on both surfaces at once.
 *
 * What it adds over mounting AtlasGlobe directly is the box and the gate.
 */
export interface ContinentGlobeStageProps {
  /**
   * Documented peoples per country, the continent scene's own signal (REQ-116).
   *
   * The page is allowed to lose it — it is one Supabase round trip, and the
   * explorer hub already catches its own failure — in which case the globe
   * names what is missing rather than drawing an unexplained empty continent.
   */
  peopleCountsByCountry?: Record<string, number>;
  /**
   * The projection, when a round owns it rather than the reader (REQ-120).
   * Forwarded verbatim; see AtlasGlobeProps for what pinning means.
   */
  pinnedProjection?: "flat" | "sphere";
  /** Why the projection will not move. Required whenever it is pinned. */
  pinnedProjectionNote?: string;
  /**
   * The homepage treats the sphere as an editorial figure: its projection
   * band follows the visual instead of covering it.
   */
  presentation?: "standard" | "hero";
  /** Enables the homepage's gentle arrival motion; disabled for shared scenes by default. */
  autoRotate?: boolean;
}

/**
 * Capability gate (ARCH-014): the globe is a client island that only mounts
 * once a real WebGL context has been probed client-side, so the server
 * response never carries the WebGL runtime (REQ-112 AC4).
 *
 * The probe is tri-state — unknown until the effect runs — because "not probed
 * yet" and "no WebGL here" call for opposite renders. The committed
 * AfricaBasemap answers REQ-112 AC2 for a visitor whose browser genuinely
 * cannot run the globe; showing it while the probe is still in flight showed
 * *every* visitor a flat map that then vanished, read as a glitch rather than
 * as a fallback. The stage holds its box open instead, so nothing moves when
 * the globe lands.
 *
 * The answer is then handed to AtlasGlobe as `probedWebglSupport`, because the
 * globe's own probe is an effect too and would otherwise spend its first
 * commit assuming the flat map this gate exists to avoid.
 */
// @req REQ-112
// @req REQ-115
// @req REQ-116
// @req REQ-120
export function ContinentGlobeStage({
  peopleCountsByCountry,
  pinnedProjection,
  pinnedProjectionNote,
  presentation = "standard",
  autoRotate = false,
}: ContinentGlobeStageProps) {
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null);

  /**
   * This stage is not a fiche, so DEC-022 does not license the night ground
   * here (brand-charter §5.1): the globe is the page's *subject*, filling the
   * opening band, and pinned to night it read as a hole punched through a
   * parchment page. It follows the reader's own choice instead — which is what
   * the engine deleted in ETNI-1360 did, and what the consolidation dropped on
   * the way across.
   *
   * Parchment before next-themes has answered, deliberately: it is the site's
   * ground, so guessing it costs nothing on a light page and spares every
   * other reader a black band that repaints one frame later.
   */
  const { resolvedTheme } = useTheme();
  const surface: GlobeSurface =
    resolvedTheme === "dark" ? "night" : "parchment";

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWebglSupported(canCreateWebglContext());
  }, []);

  const overlay = buildContinentOverlay(peopleCountsByCountry);

  return (
    <div
      className={`home-globe-stage${
        presentation === "hero" ? " home-globe-stage--hero" : ""
      }`}
    >
      {webglSupported !== null && (
        <AtlasGlobe
          overlay={overlay}
          surface={surface}
          probedWebglSupport={webglSupported}
          pinnedProjection={pinnedProjection}
          pinnedProjectionNote={pinnedProjectionNote}
          presentation={presentation === "hero" ? "editorial" : "standard"}
          viewScale={presentation === "hero" ? 0.84 : 1}
          autoRotate={autoRotate}
          /* Tissot's indicatrices, as the engine deleted in ETNI-1360 drew
             them: on by default on the two surfaces that stand here. Both
             argue that a flat map lies about surface, and the discs are what
             lets a reader measure it — each covers the same real area, so the
             swelling is the projection's doing and nothing else. Without them
             the reader gets « Ce que la carte plate en fait » and a map that
             changes shape with nothing to compare. */
          showTissot
          missingMessage="Le corpus ne renseigne encore aucun peuple par pays."
          fallbackNote="Carte de l'Afrique, à plat : ce navigateur ne peut pas afficher le globe."
          wholeAreaLabel="Tout le continent"
          areaNoun="le continent"
          /*
           * This scene opens no country (atlas-charter §1).
           *
           * It reached the home's featured module and /jouer/mercator reusing
           * `buildContinentOverlay` — the Explorer hub's scene — and inherited
           * the hub's whole offer with it: twelve pinned countries, a tap
           * anywhere on the sphere selecting the nearest one, and a legend
           * promising « appuyez sur un point pour ouvrir le pays ». Neither
           * surface is browsing the corpus. Both are making one claim about
           * what a flat map does to area, and a mark saying « this country
           * opens » is a second, unrelated offer laid over the argument — on
           * /jouer/mercator, a way out of a standing round.
           *
           * The frame still draws all fifty-four outlines: the continent is
           * the body whose surface is being argued about, and it is the
           * marks, not the geography, that made a promise this scene cannot
           * keep.
           */
          targetPicker="none"
          /*
           * And it is argued with the bar rather than the button: the
           * demonstration is the movement, and the reader has to be able to
           * stop in the middle of it.
           */
          projectionControl="morph"
        />
      )}
      <style>{`
        /* The demo's stage heights were 380 / 460: the globe reads as a marble
           at those, and they were raised once by the height of the chrome,
           because the caption and the tools take rows of their own instead of
           being laid over the sphere.

           Raised again because the globe is the subject of two pages — the
           home's opening module and the Mercator game, where it is the
           argument the rounds are asked against. On both it has to read as a
           body one can turn, not as an illustration of one. The max-width
           stops the sphere growing past the copy beside it.

           The floor is the stage's own at every width. It used to be dropped
           above 1200px so the globe could take whatever the hero band had
           left; the band is gone, nothing above supplies a height, and a
           min-height of 0 there meant "be zero" — which is how this collapsed
           to 0px on /jouer/mercator with every test still green. */
        .home-globe-stage {
          position: relative;
          box-sizing: border-box;
          width: 100%;
          max-width: 1120px;
          margin: 0 auto;
          min-height: 560px;
          /* AtlasGlobe sizes itself from this token, whose atlas default
             (470/520, space.css) is shorter than the floors below. Left alone,
             the box and the figure inside it disagree at every breakpoint. */
          --afh-globe-stage-height: 560px;
        }
        /* The external range and its compact figure tools are absolutely
           anchored immediately after the visual stage. Reserving their full
           height here keeps the counters from climbing underneath them on
           narrow screens. */
        .home-globe-stage--hero {
          padding-bottom: 184px;
        }
        @media (min-width: 720px) {
          .home-globe-stage {
            min-height: 680px;
            --afh-globe-stage-height: 680px;
          }
        }
        @media (min-width: 1200px) {
          .home-globe-stage {
            min-height: 720px;
            --afh-globe-stage-height: 720px;
          }
        }
      `}</style>
    </div>
  );
}

export default ContinentGlobeStage;
