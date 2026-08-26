"use client";

import { useCallback, useRef, useState, type PointerEvent } from "react";

/**
 * Drag sensitivity, shared with the home hero so one globe does not feel
 * heavier than another.
 */
const DRAG_RADIANS_PER_PIXEL = 0.006;
const DRAG_PITCH_RADIANS_PER_PIXEL = 0.004;
const MAX_PITCH_RADIANS = Math.PI / 2 - 0.05;

const clampPitch = (value: number): number =>
  Math.min(MAX_PITCH_RADIANS, Math.max(-MAX_PITCH_RADIANS, value));

export interface GlobeNudge {
  yaw: number;
  pitch: number;
}

const NO_NUDGE: GlobeNudge = { yaw: 0, pitch: 0 };

/**
 * Turning a fiche's globe by hand.
 *
 * The camera itself belongs to `useGlobeCamera`, which eases toward a chosen
 * target; this is the offset the reader adds on top of wherever that camera
 * sits. Keeping the two apart is what lets a drag survive a fly-to argument —
 * and what lets choosing a country cancel the drag, since a fly-to that landed
 * somewhere other than the country it named would be lying.
 *
 * A country on the far side of the sphere has no marker to click. Without this
 * it is simply unreachable; the picker in the globe toolbar is the other half
 * of the same problem, for readers who are not dragging anything.
 */
// @req REQ-117
export function useGlobeDrag() {
  const [nudge, setNudge] = useState<GlobeNudge>(NO_NUDGE);
  const dragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });

  const resetNudge = useCallback(() => setNudge(NO_NUDGE), []);

  const onPointerDown = useCallback((event: PointerEvent<HTMLElement>) => {
    dragging.current = true;
    lastPointer.current = { x: event.clientX, y: event.clientY };
    // Capture keeps the surface following a finger that leaves the stage,
    // instead of stopping dead at the edge mid-gesture.
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }, []);

  const onPointerMove = useCallback((event: PointerEvent<HTMLElement>) => {
    if (!dragging.current) return;

    const dx = event.clientX - lastPointer.current.x;
    const dy = event.clientY - lastPointer.current.y;
    lastPointer.current = { x: event.clientX, y: event.clientY };

    // Applied straight, with no easing: under a finger the surface has to keep
    // up with the finger, and easing here reads as the globe refusing to
    // follow. Same sign convention as the home hero — buildRotationMatrix
    // sends the facing point to y = -sin(pitch), so a downward drag raises
    // pitch for the surface to travel down with the hand.
    setNudge((current) => ({
      yaw: current.yaw + dx * DRAG_RADIANS_PER_PIXEL,
      pitch: clampPitch(current.pitch + dy * DRAG_PITCH_RADIANS_PER_PIXEL),
    }));
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  return {
    nudge,
    resetNudge,
    dragHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
    },
  };
}
