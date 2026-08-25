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
 */
// @req REQ-112
export function HomeGlobeStage() {
  const [webglSupported, setWebglSupported] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWebglSupported(canCreateWebglContext());
  }, []);

  if (!webglSupported) return <HomeGlobeFallback />;

  return <LazyHomeGlobe />;
}

export default HomeGlobeStage;
