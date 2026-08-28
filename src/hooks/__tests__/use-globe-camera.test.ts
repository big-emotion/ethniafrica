import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useGlobeCamera } from "@/hooks/use-globe-camera";
import {
  FLY_TO_DURATION_MS,
  PITCH_LIMIT_RADIANS,
  type CameraPose,
} from "@/lib/atlas/camera";

/**
 * This file did not exist while the globe drifted at 0.1 rad/s on every fiche,
 * and that is not a coincidence: nothing here could have failed, so nothing
 * stopped a permanent animation from shipping. The first test is the one that
 * would have.
 *
 * Frames are driven by hand rather than by a timer. A fly-to lasts 720 ms and
 * asks for its next frame from inside the last one, so a wall-clock test would
 * either sleep or race; stepping the queue makes the arrival exact.
 */
let now = 0;
let queuedFrames: Map<number, FrameRequestCallback>;
let nextFrameId = 1;

beforeEach(() => {
  now = 1000;
  queuedFrames = new Map();
  nextFrameId = 1;
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    const id = nextFrameId;
    nextFrameId += 1;
    queuedFrames.set(id, callback);
    return id;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
    queuedFrames.delete(id);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function runOneFrame(elapsedMs: number): void {
  now += elapsedMs;
  const due = [...queuedFrames.values()];
  queuedFrames.clear();
  act(() => {
    for (const callback of due) callback(now);
  });
}

/** Steps frames until the loop stops asking for them — a flight that never arrives fails here rather than hanging. */
function runUntilStill(): void {
  const framesPerFlight = 24;
  const step = FLY_TO_DURATION_MS / 8;
  for (let frame = 0; frame < framesPerFlight; frame += 1) {
    if (queuedFrames.size === 0) return;
    runOneFrame(step);
  }
  throw new Error("the camera never stopped requesting frames");
}

/** A family's whole footprint: where a fiche globe sits with nothing chosen. */
const ENTITY_FRAME: CameraPose = {
  yaw: 0.24,
  pitch: 0.1,
  zoom: 1.28,
  offsetX: 0,
  offsetY: 0,
  morph: 1,
};

/** One country of that footprint, biased for the sheet its facts open in. */
const CHOSEN_COUNTRY: CameraPose = {
  yaw: -0.41,
  pitch: -0.19,
  zoom: 1.55,
  offsetX: 0,
  offsetY: 0.54,
  morph: 1,
};

function renderCamera(
  destination: CameraPose | null = null,
  reducedMotion = false
) {
  return renderHook(
    (props: { destination: CameraPose | null; reducedMotion: boolean }) =>
      useGlobeCamera(props.destination, ENTITY_FRAME, props.reducedMotion),
    { initialProps: { destination, reducedMotion } }
  );
}

describe("useGlobeCamera — a fiche globe at rest (REQ-117)", () => {
  // @req REQ-117
  it("does not drift: an unchosen globe requests no animation frame at all", () => {
    const { result } = renderCamera();

    expect(result.current.pose).toEqual(ENTITY_FRAME);
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
    expect(queuedFrames.size).toBe(0);
  });

  // @req REQ-117
  it("stays on its subject across re-renders, instead of turning under the reader", () => {
    const { result, rerender } = renderCamera();

    rerender({ destination: null, reducedMotion: false });
    rerender({ destination: null, reducedMotion: false });

    expect(result.current.pose).toEqual(ENTITY_FRAME);
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  });

  // @req REQ-117
  it("stops requesting frames once a flight has arrived", () => {
    const { result, rerender } = renderCamera();

    rerender({ destination: CHOSEN_COUNTRY, reducedMotion: false });
    runUntilStill();

    expect(result.current.pose).toEqual(CHOSEN_COUNTRY);
    expect(queuedFrames.size).toBe(0);
  });
});

describe("useGlobeCamera — the reader's own turn (REQ-117)", () => {
  // @req REQ-117
  it("keeps the turn: nothing pulls the globe back on its own", () => {
    const { result } = renderCamera();

    act(() => {
      result.current.turnBy(0.5, 0.2);
    });
    const turned = result.current.pose;

    expect(turned.yaw).toBeCloseTo(ENTITY_FRAME.yaw + 0.5);
    expect(turned.pitch).toBeCloseTo(ENTITY_FRAME.pitch + 0.2);
    expect(queuedFrames.size).toBe(0);
  });

  // @req REQ-117
  it("survives a parent that recomputes an equal rest pose", () => {
    // The rest pose is a derived object, so a re-render hands the hook a new
    // one every time. Comparing by identity would fly the globe home mid-drag.
    const { result, rerender } = renderHook(
      (props: { restPose: CameraPose }) =>
        useGlobeCamera(null, props.restPose, false),
      { initialProps: { restPose: { ...ENTITY_FRAME } } }
    );

    act(() => {
      result.current.turnBy(0.5, 0);
    });
    const turned = result.current.pose;

    rerender({ restPose: { ...ENTITY_FRAME } });

    expect(result.current.pose).toEqual(turned);
    expect(queuedFrames.size).toBe(0);
  });

  // @req REQ-117
  it("gives the globe to the reader's hand mid-flight rather than fighting it", () => {
    const { result, rerender } = renderCamera();

    rerender({ destination: CHOSEN_COUNTRY, reducedMotion: false });
    runOneFrame(0);
    runOneFrame(FLY_TO_DURATION_MS / 4);
    expect(queuedFrames.size).toBe(1);

    act(() => {
      result.current.turnBy(0.3, 0);
    });
    const seized = result.current.pose;

    expect(queuedFrames.size).toBe(0);
    expect(seized).not.toEqual(CHOSEN_COUNTRY);
  });

  // @req REQ-117
  it("stops the reader tipping a pole further than the horizon allows", () => {
    const { result } = renderCamera();

    act(() => {
      result.current.turnBy(0, 99);
    });
    expect(result.current.pose.pitch).toBe(PITCH_LIMIT_RADIANS);

    act(() => {
      result.current.turnBy(0, -99);
    });
    expect(result.current.pose.pitch).toBe(-PITCH_LIMIT_RADIANS);
  });

  // @req REQ-117
  it("lands a choice on the chosen country, not beside it, after the reader has turned the globe", () => {
    // The turn used to be a delta added on top of the animated pose, so a
    // fly-to arrived at its target plus whatever the reader had dragged — the
    // one country the reader asked to see was the one country off centre.
    const { result, rerender } = renderCamera();

    act(() => {
      result.current.turnBy(0.7, 0.2);
    });
    rerender({ destination: CHOSEN_COUNTRY, reducedMotion: false });
    runUntilStill();

    expect(result.current.pose).toEqual(CHOSEN_COUNTRY);
  });
});

describe("useGlobeCamera — recentring (REQ-112)", () => {
  // @req REQ-112
  it("brings the globe back to the entity's own frame after a turn", () => {
    const { result } = renderCamera();

    act(() => {
      result.current.turnBy(0.9, 0.3);
    });
    act(() => {
      result.current.recentre();
    });
    runUntilStill();

    expect(result.current.pose).toEqual(ENTITY_FRAME);
  });

  // @req REQ-112
  it("recentres a globe the reader only turned, which no change of choice can do", () => {
    // Clearing the choice re-aims the camera; a reader who chose nothing has
    // no choice to clear, and that reader is exactly who needs the button.
    const { result } = renderCamera();

    act(() => {
      result.current.turnBy(1.2, 0);
    });
    expect(result.current.pose.yaw).not.toBeCloseTo(ENTITY_FRAME.yaw);

    act(() => {
      result.current.recentre();
    });
    runUntilStill();

    expect(result.current.pose.yaw).toBeCloseTo(ENTITY_FRAME.yaw);
  });

  // @req REQ-112
  it("returns from a chosen country to the whole entity", () => {
    const { result, rerender } = renderCamera(CHOSEN_COUNTRY);
    expect(result.current.pose).toEqual(CHOSEN_COUNTRY);

    rerender({ destination: null, reducedMotion: false });
    act(() => {
      result.current.recentre();
    });
    runUntilStill();

    expect(result.current.pose).toEqual(ENTITY_FRAME);
  });
});

describe("useGlobeCamera — reduced motion (REQ-117)", () => {
  // @req REQ-117
  it("lands a choice without a single frame, so a target stays as reachable", () => {
    const { result, rerender } = renderCamera(null, true);

    rerender({ destination: CHOSEN_COUNTRY, reducedMotion: true });

    expect(result.current.pose).toEqual(CHOSEN_COUNTRY);
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  });

  // @req REQ-117
  it("recentres and turns without animating either", () => {
    const { result } = renderCamera(CHOSEN_COUNTRY, true);

    act(() => {
      result.current.turnBy(0.4, 0);
    });
    expect(result.current.pose.yaw).toBeCloseTo(CHOSEN_COUNTRY.yaw + 0.4);

    act(() => {
      result.current.recentre();
    });

    expect(result.current.pose).toEqual(ENTITY_FRAME);
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  });
});
