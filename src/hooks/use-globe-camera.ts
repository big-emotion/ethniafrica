"use client";

import { useEffect, useRef, useState } from "react";

import {
  FLY_TO_DURATION_MS,
  IDLE_POSE,
  advanceYaw,
  easeInOutCubic,
  interpolatePose,
  type CameraPose,
} from "@/lib/atlas/camera";

/** Idle drift of the unchosen globe, unchanged from the REQ-116 canvas this hook took the loop from. */
const AUTO_ROTATE_RADIANS_PER_SECOND = 0.1;

interface Journey {
  from: CameraPose;
  to: CameraPose;
  /** Negative until the first frame, whose timestamp becomes the origin. */
  startedAt: number;
}

/**
 * The fiche globe's single camera (REQ-117, ARCH-015). It holds the pose for
 * every renderer at once — the WebGL canvas draws it and the marker buttons are
 * positioned from it — which is the only way the buttons can stay on top of the
 * shapes they name.
 *
 * `destination` is the pose of the chosen target, or null for no choice, in
 * which case the globe drifts as it did before anything was chosen.
 *
 * Reduced motion is not a shorter animation, it is no animation: the pose is
 * the destination from the first render and no frame loop ever starts, so a
 * target stays exactly as reachable as it is with motion enabled.
 */
// @req REQ-117
export function useGlobeCamera(
  destination: CameraPose | null,
  reducedMotion: boolean
): CameraPose {
  const [animatedPose, setAnimatedPose] = useState<CameraPose>(
    () => destination ?? IDLE_POSE
  );
  const poseRef = useRef(animatedPose);
  const journeyRef = useRef<Journey | null>(null);

  useEffect(() => {
    if (reducedMotion) {
      // Nothing to traverse, so nothing to hold: the returned pose below IS
      // the destination. Only the ref is kept current, in case the reader
      // turns motion back on and the next flight needs a departure point.
      journeyRef.current = null;
      poseRef.current = destination ?? IDLE_POSE;
      return;
    }

    journeyRef.current = {
      from: poseRef.current,
      to: destination ?? IDLE_POSE,
      startedAt: -1,
    };
  }, [destination, reducedMotion]);

  useEffect(() => {
    if (reducedMotion) return;

    let frameId: number | null = null;
    let previousTimestamp: number | null = null;

    const step = (timestamp: number) => {
      const journey = journeyRef.current;

      // Arrived, and there is something to stay on: stop burning frames.
      if (!journey && destination) return;

      let next: CameraPose;
      if (journey) {
        if (journey.startedAt < 0) journey.startedAt = timestamp;
        const elapsed =
          (timestamp - journey.startedAt) / Math.max(FLY_TO_DURATION_MS, 1);
        if (elapsed >= 1) {
          next = journey.to;
          journeyRef.current = null;
        } else {
          next = interpolatePose(
            journey.from,
            journey.to,
            easeInOutCubic(elapsed)
          );
        }
      } else {
        const seconds =
          previousTimestamp === null
            ? 0
            : (timestamp - previousTimestamp) / 1000;
        next = {
          ...IDLE_POSE,
          yaw: advanceYaw(
            poseRef.current.yaw,
            AUTO_ROTATE_RADIANS_PER_SECOND * seconds
          ),
        };
      }

      previousTimestamp = timestamp;
      poseRef.current = next;
      setAnimatedPose(next);
      frameId = window.requestAnimationFrame(step);
    };

    frameId = window.requestAnimationFrame(step);
    return () => {
      if (frameId !== null) window.cancelAnimationFrame(frameId);
    };
  }, [destination, reducedMotion]);

  return reducedMotion ? (destination ?? IDLE_POSE) : animatedPose;
}
