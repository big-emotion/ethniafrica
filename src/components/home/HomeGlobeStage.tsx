"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWebglSupported(canCreateWebglContext());
  }, []);

  return (
    <div className="home-globe-stage">
      {webglSupported ? <LazyHomeGlobe /> : <HomeGlobeFallback />}
      <style>{`
        /* 380 / 460 px are the reference demo's own stage heights: the
           globe reads as a body rather than a marble at those, and the
           flat map still fits its full Mercator height. */
        .home-globe-stage {
          position: relative;
          box-sizing: border-box;
          width: 100%;
          max-width: 960px;
          margin: 0 auto;
          padding: 0 20px 24px;
          min-height: 380px;
        }
        @media (min-width: 720px) {
          .home-globe-stage {
            min-height: 460px;
          }
        }
        @media (min-width: 1200px) {
          .home-globe-stage {
            flex: 1 1 auto;
          }
        }
      `}</style>
    </div>
  );
}

export default HomeGlobeStage;
