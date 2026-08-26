"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";

import { HomeGlobeFallback } from "@/components/home/HomeGlobeFallback";

const LazyHomeGlobe = dynamic(
  () => import("@/components/home/HomeGlobe").then((mod) => mod.HomeGlobe),
  { ssr: false, loading: () => <HomeGlobeFallback /> }
);

function canCreateWebglContext(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl")
    );
  } catch {
    return false;
  }
}

/**
 * Capability gate (ARCH-014): the WebGL globe is a client island that only
 * mounts once a real WebGL context has been probed client-side. Until that
 * check resolves — and whenever it fails — the committed AfricaBasemap
 * fallback renders instead, so the hero is never empty (REQ-112 AC2) and
 * the server response never carries the WebGL runtime (REQ-112 AC4): the
 * initial state below is the SSR-safe fallback, and useEffect only ever
 * runs client-side.
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
  const [webglSupported, setWebglSupported] = useState(false);
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

  return (
    <div className="home-globe-stage">
      {webglSupported && !globeUnavailable ? (
        <LazyHomeGlobe onUnavailable={handleGlobeUnavailable} />
      ) : (
        <HomeGlobeFallback />
      )}
      <style>{`
        /* The reference demo's stage heights were 380 / 460: the globe
           reads as a body rather than a marble at those, and the flat map
           still fits its full Mercator height. Both are raised by the
           height of the chrome, because the caption and the tools now take
           rows of their own instead of being laid over the sphere — at the
           old heights the body itself would have absorbed the difference
           and come out a marble after all. */
        .home-globe-stage {
          position: relative;
          box-sizing: border-box;
          width: 100%;
          max-width: 960px;
          margin: 0 auto;
          min-height: 460px;
        }
        @media (min-width: 720px) {
          .home-globe-stage {
            min-height: 540px;
          }
        }
        /* From 1200 up the hero is pinned to the viewport height, so the
           floors above would push the tools past the fold — which is the
           one thing that height was calculated to prevent. Here the stage
           takes whatever the band has left instead, and .home-globe-surface
           carries the only floor the sphere still needs. */
        @media (min-width: 1200px) {
          .home-globe-stage {
            flex: 1 1 auto;
            min-height: 0;
          }
        }
      `}</style>
    </div>
  );
}

export default HomeGlobeStage;
