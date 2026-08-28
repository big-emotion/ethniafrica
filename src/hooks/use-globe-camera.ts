"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  FLY_TO_DURATION_MS,
  advanceYaw,
  clampPitch,
  easeInOutCubic,
  interpolatePose,
  posesMatch,
  type CameraPose,
} from "@/lib/atlas/camera";

interface Journey {
  from: CameraPose;
  to: CameraPose;
  /** Negative until the first frame, whose timestamp becomes the origin. */
  startedAt: number;
}

export interface GlobeCamera {
  pose: CameraPose;
  /**
   * The reader's own turn, applied to the live pose rather than accumulated
   * beside it. A delta added on top of the animated pose — the shape this had
   * — could never centre anything: a fly-to landed on its target plus whatever
   * the reader had dragged, and « Recentrer » had no way to reach the drift it
   * was fighting.
   */
  turnBy: (deltaYaw: number, deltaPitch: number) => void;
  /** Back to `restPose`, whatever the reader has turned or chosen since. */
  recentre: () => void;
}

/**
 * The camera of a fiche globe, and the only thing that moves it (REQ-117,
 * ARCH-015). It holds the pose every renderer reads at once — the WebGL canvas
 * draws it and the marker buttons are positioned from it — which is the only
 * way the buttons can stay on top of the shapes they name.
 *
 * Three things aim it, and they are ranked: the reader's own turn beats a
 * fly-to in progress, a fly-to beats the rest pose, and the rest pose is where
 * the globe sits when nothing else is asking.
 *
 * - `destination` — the pose of the chosen target, or null for no choice.
 * - `restPose` — where the globe sits unchosen, and where `recentre` returns
 *   it. A fiche passes its entity's own frame, so an untouched globe shows its
 *   subject and « Recentrer » gives that subject back rather than the planet.
 *
 * The globe does not drift. It used to turn at 0.1 rad/s whenever nothing was
 * chosen — which is every fiche until the reader picks something: a subject
 * sliding out of frame on its own, and React state written at 60 fps for a
 * motion nobody asked for. A globe at rest now requests no frame at all.
 *
 * Reduced motion is not a shorter animation, it is no animation: every aim
 * lands during the render that brings it and no loop ever starts, so a target
 * stays exactly as reachable as it is with motion enabled.
 */
// @req REQ-117
export function useGlobeCamera(
  destination: CameraPose | null,
  restPose: CameraPose,
  reducedMotion: boolean
): GlobeCamera {
  const aim = destination ?? restPose;
  const [pose, setPose] = useState<CameraPose>(aim);

  /**
   * The committed pose, so a flight starts from where the globe actually is.
   * Written after the commit rather than during render: a ref assigned while
   * rendering is a second source of truth, and StrictMode writes it twice.
   */
  const poseRef = useRef(pose);
  useEffect(() => {
    poseRef.current = pose;
  }, [pose]);

  const journeyRef = useRef<Journey | null>(null);
  const frameRef = useRef<number | null>(null);

  /**
   * Where the camera was last aimed. Held as state so a new aim can land
   * during the render that brings it under reduced motion — React's own way of
   * adjusting state when a prop changes — which is what keeps that landing out
   * of an effect, and the reduced-motion globe free of animation frames.
   */
  const [aimedAt, setAimedAt] = useState<CameraPose>(aim);
  if (!posesMatch(aimedAt, aim)) {
    setAimedAt(aim);
    if (reducedMotion) setPose(aim);
  }

  const settle = useCallback((next: CameraPose) => {
    poseRef.current = next;
    setPose(next);
  }, []);

  const cancelFlight = useCallback(() => {
    journeyRef.current = null;
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, []);

  /**
   * Stable across renders because it reads refs only, which is what lets the
   * effect below re-aim the camera without tearing down a flight in progress.
   */
  const flyTo = useCallback(
    (to: CameraPose) => {
      // Already there: land nothing and start nothing. This is what keeps an
      // untouched globe still — no destination and no turn means the aim is
      // the pose, so no frame is ever requested.
      if (posesMatch(poseRef.current, to)) {
        cancelFlight();
        return;
      }
      // Already on the way there. Without this, a re-render recomputing the
      // same destination would restart the easing from wherever the last
      // flight had reached, and the globe would crawl.
      if (journeyRef.current && posesMatch(journeyRef.current.to, to)) return;

      cancelFlight();

      const journey: Journey = { from: poseRef.current, to, startedAt: -1 };
      journeyRef.current = journey;

      const step = (timestamp: number) => {
        frameRef.current = null;
        // Superseded by a later flight, or abandoned by the reader's hand.
        if (journeyRef.current !== journey) return;

        if (journey.startedAt < 0) journey.startedAt = timestamp;
        const progress =
          (timestamp - journey.startedAt) / Math.max(FLY_TO_DURATION_MS, 1);

        if (progress >= 1) {
          journeyRef.current = null;
          settle(journey.to);
          return;
        }

        settle(
          interpolatePose(journey.from, journey.to, easeInOutCubic(progress))
        );
        frameRef.current = window.requestAnimationFrame(step);
      };

      frameRef.current = window.requestAnimationFrame(step);
    },
    [cancelFlight, settle]
  );

  useEffect(() => {
    // Reduced motion has already landed during render; there is nothing to fly.
    if (reducedMotion) return;
    // `aimedAt`, not `aim`: it changes identity only when the aim changed in
    // value, so a parent that recomputes an equal rest pose re-renders without
    // flying the globe out of the reader's hand.
    flyTo(aimedAt);
  }, [aimedAt, reducedMotion, flyTo]);

  useEffect(() => cancelFlight, [cancelFlight]);

  const turnBy = useCallback(
    (deltaYaw: number, deltaPitch: number) => {
      // Under a finger the surface has to keep up with the finger, so the
      // reader's turn ends any flight rather than being added on top of one.
      cancelFlight();
      const current = poseRef.current;
      settle({
        ...current,
        yaw: advanceYaw(current.yaw, deltaYaw),
        pitch: clampPitch(current.pitch + deltaPitch),
      });
    },
    [cancelFlight, settle]
  );

  const recentre = useCallback(() => {
    if (reducedMotion) {
      cancelFlight();
      settle(restPose);
      return;
    }
    flyTo(restPose);
  }, [cancelFlight, flyTo, reducedMotion, restPose, settle]);

  return { pose, turnBy, recentre };
}
