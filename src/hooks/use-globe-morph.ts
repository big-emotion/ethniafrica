"use client";

import { useEffect, useRef, useState } from "react";

import { easeInOutCubic } from "@/lib/atlas/camera";

/**
 * How long the surface takes to unroll from sphere to Mercator.
 *
 * Longer than a fly-to on purpose: the flattening is the argument, not a
 * transition between two views. The reader has to watch Africa shrink against
 * the high latitudes to see what the projection does to it — done quickly it
 * reads as a toggle between two pictures instead of one distortion.
 */
// @req REQ-116
export const FLATTEN_DURATION_MS = 900;

const SPHERE = 1;
const PLANE = 0;

/**
 * The morph between the globe and the flat map, as the terrain and the overlay
 * both consume it (1 = sphere, 0 = Mercator).
 *
 * Under `prefers-reduced-motion` the surface is simply in its destination state
 * on the render that asks for it — no frame loop is ever started. The charter
 * (§6) asks for a jump rather than a shortened animation, so nothing is
 * unreachable while a movement the reader opted out of plays.
 */
// @req REQ-116
export function useGlobeMorph(
  flattened: boolean,
  reducedMotion: boolean
): number {
  const target = flattened ? PLANE : SPHERE;
  const [morph, setMorph] = useState(target);
  const morphRef = useRef(morph);

  useEffect(() => {
    morphRef.current = morph;
  }, [morph]);

  useEffect(() => {
    if (reducedMotion) {
      morphRef.current = target;

      setMorph(target);
      return;
    }

    const from = morphRef.current;
    if (from === target) return;

    let frameId: number | null = null;
    let startedAt: number | null = null;

    const step = (timestamp: number) => {
      startedAt ??= timestamp;
      const progress = Math.min(
        (timestamp - startedAt) / FLATTEN_DURATION_MS,
        1
      );
      setMorph(from + (target - from) * easeInOutCubic(progress));
      frameId = progress < 1 ? requestAnimationFrame(step) : null;
    };

    frameId = requestAnimationFrame(step);
    return () => {
      if (frameId !== null) cancelAnimationFrame(frameId);
    };
  }, [target, reducedMotion]);

  return reducedMotion ? target : morph;
}
