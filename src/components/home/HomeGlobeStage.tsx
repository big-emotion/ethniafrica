"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";

import { HomeGlobeFallback } from "@/components/home/HomeGlobeFallback";
import { canCreateWebglContext } from "@/lib/home/webglSupport";

// No `loading` component on purpose: the chunk takes about a second to
// arrive, and painting the flat basemap for that second showed every
// visitor a map of Africa that then vanished — read as a glitch, not as a
// fallback. Nothing renders until the globe itself is ready.
const LazyHomeGlobe = dynamic(
  () => import("@/components/home/HomeGlobe").then((mod) => mod.HomeGlobe),
  { ssr: false }
);

/**
 * Capability gate (ARCH-014): the WebGL globe is a client island that only
 * mounts once a real WebGL context has been probed client-side, so the
 * server response never carries the WebGL runtime (REQ-112 AC4).
 *
 * The probe is tri-state — unknown until the effect runs — because
 * "not probed yet" and "no WebGL here" call for opposite renders. The
 * committed AfricaBasemap answers REQ-112 AC2 for a visitor whose browser
 * genuinely cannot run the globe; showing it while the probe and the chunk
 * are still in flight showed *every* visitor a flat map for a second
 * before it was replaced by the sphere. The stage holds its box open
 * instead, so nothing moves when the globe lands.
 *
 * The gate result renders inside .home-globe-stage (REQ-115): an in-flow,
 * centred box with a declared min-height per breakpoint, replacing the
 * previous position:absolute;inset:0 overlay that filled the whole hero
 * behind the copy. Both HomeGlobe and HomeGlobeFallback fill this box the
 * same way they filled the old overlay, so no change was needed there
 * beyond HomeGlobeFallback's alignment (see its own doc comment).
 */
// @req REQ-112
// @req REQ-115
export function HomeGlobeStage() {
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null);
  // The probe above only proves a context can be created. Compiling and
  // linking the globe's shaders on it can still fail — the common case on
  // low-end hardware — and by then the fallback has already been swapped
  // out. This latches that late failure so the committed basemap comes
  // back rather than leaving the hero blank (REQ-112 AC2).
  const [globeUnavailable, setGlobeUnavailable] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWebglSupported(canCreateWebglContext());
  }, []);

  const handleGlobeUnavailable = useCallback(() => {
    setGlobeUnavailable(true);
  }, []);

  const globeCanRun = webglSupported === true && !globeUnavailable;
  const noGlobePossible = webglSupported === false || globeUnavailable;

  return (
    <div className="home-globe-stage">
      {globeCanRun && <LazyHomeGlobe onUnavailable={handleGlobeUnavailable} />}
      {noGlobePossible && <HomeGlobeFallback />}
      <style>{`
        /* The reference demo's stage heights were 380 / 460: the globe
           reads as a body rather than a marble at those, and the flat map
           still fits its full Mercator height. Both were raised once by the
           height of the chrome, because the caption and the tools take rows
           of their own instead of being laid over the sphere — at the demo's
           heights the body itself would have absorbed the difference and
           come out a marble after all.

           Raised again here, with the max-width, because the globe is the
           subject of two pages now: the home's opening band and the Mercator
           game, where it is the argument the rounds are asked against. On
           both it has to read as a body one can turn, not as an illustration
           of one. The stage keeps a max-width so the sphere stops growing
           before it outruns the copy beside it. */
        .home-globe-stage {
          position: relative;
          box-sizing: border-box;
          width: 100%;
          max-width: 1120px;
          margin: 0 auto;
          min-height: 560px;
        }
        @media (min-width: 720px) {
          .home-globe-stage {
            min-height: 680px;
          }
        }
        /* This used to drop the floor entirely above 1200px and take
           whatever the hero band had left, through a flex chain rooted in
           that band's pinned 100dvh — the point being to keep the globe's
           tools inside the fold on a screen the band filled by itself.

           The band is gone: the module stands in its own section in the
           page flow now (FeaturedModule), and nothing above the stage
           supplies a height for it to take. A min-height of 0 there means
           "be zero", and .home-globe-layout — inset:0 on an empty box —
           paints the globe over whatever follows. That is the failure the
           Mercator page hit, and the scope that used to keep it off the
           home no longer describes anything.

           So: an ordinary floor, one step over the 680px below it, which
           the section is free to be taller than. */
        @media (min-width: 1200px) {
          .home-globe-stage {
            min-height: 720px;
          }
        }
      `}</style>
    </div>
  );
}

export default HomeGlobeStage;
