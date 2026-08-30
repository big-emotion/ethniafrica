"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { canCreateWebglContext } from "@/lib/home/webglSupport";
import type { AxisGraphLayer } from "@/lib/home/axisGraphLayer";

const LazyAxisGraphScene = dynamic(
  () =>
    import("@/components/home/AxisGraphScene").then(
      (mod) => mod.AxisGraphScene
    ),
  { ssr: false }
);

export interface AxisGraphCanvasProps {
  onLayerReady: (layer: AxisGraphLayer | null) => void;
}

/**
 * Capability gate for the axis panel's link graph (ARCH-014), the same
 * shape ContinentGlobeStage uses: the WebGL runtime is never in the server
 * response, and it only loads once a real context has been probed
 * client-side.
 *
 * There is no fallback rendering here because there is nothing to fall
 * back to — the panel's module cards are the content, and they are already
 * on the page. The graph draws the links between them or it draws nothing.
 */
// @req REQ-114
export function AxisGraphCanvas({ onLayerReady }: AxisGraphCanvasProps) {
  const [webglSupported, setWebglSupported] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWebglSupported(canCreateWebglContext());
  }, []);

  if (!webglSupported) return null;

  return <LazyAxisGraphScene onLayerReady={onLayerReady} />;
}

export default AxisGraphCanvas;
