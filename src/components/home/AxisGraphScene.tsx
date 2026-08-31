"use client";

import { useEffect, useRef } from "react";

import {
  createAxisGraphLayer,
  type AxisGraphLayer,
} from "@/lib/home/axisGraphLayer";

const MAX_DEVICE_PIXEL_RATIO = 2;

/** The accent an axis panel paints its links in, when the token is unreadable. */
const ACCENT_FALLBACK: [number, number, number] = [0.788, 0.51, 0.122];

function parseHexAccent(value: string): [number, number, number] | null {
  const hex = value.trim().replace("#", "");
  const expanded =
    hex.length === 3
      ? hex
          .split("")
          .map((char) => char + char)
          .join("")
      : hex;
  if (!/^[0-9a-f]{6}$/i.test(expanded)) return null;
  return [
    parseInt(expanded.slice(0, 2), 16) / 255,
    parseInt(expanded.slice(2, 4), 16) / 255,
    parseInt(expanded.slice(4, 6), 16) / 255,
  ];
}

/**
 * The axis accent, read off the --accent custom property the panel's
 * ACCENT_BY_ACCESS_MODE class sets. Colours belong in tokens, so the
 * shader asks the cascade what colour it is rather than carrying three
 * literals that would then have to be kept in step with color.css.
 */
function readAccent(element: HTMLElement): [number, number, number] {
  const value = window.getComputedStyle(element).getPropertyValue("--accent");
  return parseHexAccent(value) ?? ACCENT_FALLBACK;
}

export interface AxisGraphSceneProps {
  /**
   * Handed the layer once it is drawable, and null when it goes away. The
   * panel drives the render loop because it also positions the module
   * cards on the very points this layer connects — one loop, one set of
   * coordinates.
   */
  onLayerReady: (layer: AxisGraphLayer | null) => void;
}

// @req REQ-114
export function AxisGraphScene({ onLayerReady }: AxisGraphSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = canvas?.parentElement;
    if (!canvas || !stage) return;

    const gl = (canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: false,
      antialias: true,
    }) ||
      canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) {
      onLayerReady(null);
      return;
    }

    const layer = createAxisGraphLayer(gl, readAccent(stage));
    if (!layer) {
      onLayerReady(null);
      return;
    }

    const applySize = () => {
      const ratio = Math.min(
        window.devicePixelRatio || 1,
        MAX_DEVICE_PIXEL_RATIO
      );
      const width = stage.clientWidth;
      const height = stage.clientHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      layer.resize(width, height, ratio);
    };

    applySize();
    const observer = new ResizeObserver(applySize);
    observer.observe(stage);
    onLayerReady(layer);

    return () => {
      observer.disconnect();
      onLayerReady(null);
      layer.dispose();
    };
  }, [onLayerReady]);

  return <canvas ref={canvasRef} aria-hidden="true" className="axis-graph" />;
}

export default AxisGraphScene;
