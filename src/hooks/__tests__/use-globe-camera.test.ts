import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useGlobeCamera } from "@/hooks/use-globe-camera";
import {
  FLY_TO_DURATION_MS,
  MIN_ZOOM,
  PITCH_LIMIT_RADIANS,
  READER_MAX_ZOOM,
  panLimitForZoom,
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
  panX: 0,
  panY: 0,
  morph: 1,
};

/** One country of that footprint, biased for the sheet its facts open in. */
const CHOSEN_COUNTRY: CameraPose = {
  yaw: -0.41,
  pitch: -0.19,
  zoom: 1.55,
  offsetX: 0,
  offsetY: 0.54,
  panX: 0,
  panY: 0,
  morph: 1,
};

function renderCamera(
  destination: CameraPose | null = null,
  reducedMotion = false,
  autoRotate = false
) {
  return renderHook(
    (props: {
      destination: CameraPose | null;
      reducedMotion: boolean;
      autoRotate?: boolean;
    }) =>
      useGlobeCamera(
        props.destination,
        ENTITY_FRAME,
        props.reducedMotion,
        props.autoRotate
      ),
    { initialProps: { destination, reducedMotion, autoRotate } }
  );
}

describe("useGlobeCamera — opt-in home autoplay (REQ-117)", () => {
  // @req REQ-117
  it("turns gently only when autoplay is explicitly enabled", () => {
    const { result } = renderCamera(null, false, true);

    runOneFrame(0);
    const atStart = result.current.pose.yaw;
    runOneFrame(1000);

    expect(result.current.pose.yaw).not.toBe(atStart);
    expect(result.current.autoRotating).toBe(true);
  });

  // @req REQ-117
  it("stops autoplay permanently when the reader takes control", () => {
    const { result } = renderCamera(null, false, true);

    runOneFrame(0);
    runOneFrame(1000);
    act(() => result.current.stopAutoRotation());
    const stoppedAt = result.current.pose.yaw;

    expect(queuedFrames.size).toBe(0);
    expect(result.current.autoRotating).toBe(false);
    runOneFrame(1000);
    expect(result.current.pose.yaw).toBe(stoppedAt);
  });

  // @req REQ-117
  it("does not start autoplay when reduced motion is requested", () => {
    const { result } = renderCamera(null, true, true);

    expect(result.current.autoRotating).toBe(false);
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  });
});

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

describe("useGlobeCamera — the reader's own dolly (REQ-117)", () => {
  // @req REQ-117
  it("magnifies without turning, so a zoom does not move what is under the finger", () => {
    const { result } = renderCamera();

    act(() => {
      result.current.zoomBy(2);
    });

    expect(result.current.pose.zoom).toBeCloseTo(ENTITY_FRAME.zoom * 2);
    expect(result.current.pose.yaw).toBeCloseTo(ENTITY_FRAME.yaw);
    expect(result.current.pose.pitch).toBeCloseTo(ENTITY_FRAME.pitch);
    expect(queuedFrames.size).toBe(0);
  });

  // @req REQ-117
  it("compounds presses instead of restarting from the frame's own zoom", () => {
    const { result } = renderCamera();

    act(() => {
      result.current.zoomBy(1.5);
    });
    act(() => {
      result.current.zoomBy(1.5);
    });

    expect(result.current.pose.zoom).toBeCloseTo(ENTITY_FRAME.zoom * 2.25);
  });

  // @req REQ-117
  it("holds at the reader's ceiling and at the whole hemisphere", () => {
    const { result } = renderCamera();

    act(() => {
      result.current.zoomBy(1000);
    });
    expect(result.current.pose.zoom).toBe(READER_MAX_ZOOM);

    act(() => {
      result.current.zoomBy(0.0001);
    });
    expect(result.current.pose.zoom).toBe(MIN_ZOOM);
  });

  // @req REQ-117
  it("takes the globe out of a flight rather than being multiplied into it", () => {
    const { result, rerender } = renderCamera();

    rerender({ destination: CHOSEN_COUNTRY, reducedMotion: false });
    runOneFrame(0);
    runOneFrame(FLY_TO_DURATION_MS / 4);
    expect(queuedFrames.size).toBe(1);

    act(() => {
      result.current.zoomBy(1.35);
    });

    expect(queuedFrames.size).toBe(0);
    expect(result.current.pose.zoom).not.toBeCloseTo(CHOSEN_COUNTRY.zoom);
  });

  // @req REQ-117
  it("gives the entity's own framing back when the reader recentres", () => {
    const { result } = renderCamera();

    act(() => {
      result.current.zoomBy(3);
    });
    act(() => {
      result.current.recentre();
    });
    runUntilStill();

    expect(result.current.pose.zoom).toBeCloseTo(ENTITY_FRAME.zoom);
  });
});

describe("useGlobeCamera — the reader's own pan (REQ-117)", () => {
  // @req REQ-117
  it("moves the map without turning or magnifying it", () => {
    const { result } = renderCamera();

    act(() => {
      result.current.zoomBy(3);
    });
    act(() => {
      result.current.panBy(0.4, -0.2);
    });

    expect(result.current.pose.panX).toBeCloseTo(0.4);
    expect(result.current.pose.panY).toBeCloseTo(-0.2);
    expect(result.current.pose.yaw).toBeCloseTo(ENTITY_FRAME.yaw);
    expect(result.current.pose.pitch).toBeCloseTo(ENTITY_FRAME.pitch);
    expect(queuedFrames.size).toBe(0);
  });

  // @req REQ-117
  it("leaves the panel's bias alone, which is the reason the pan is its own field", () => {
    const { result } = renderCamera();

    act(() => {
      result.current.zoomBy(3);
    });
    act(() => {
      result.current.panBy(0.5, 0.5);
    });

    expect(result.current.pose.offsetX).toBe(ENTITY_FRAME.offsetX);
    expect(result.current.pose.offsetY).toBe(ENTITY_FRAME.offsetY);
  });

  // @req REQ-117
  it("refuses to move a map that has no slack, so an unzoomed globe cannot be lost", () => {
    const { result } = renderHook(() =>
      useGlobeCamera(null, { ...ENTITY_FRAME, zoom: 1 }, false)
    );

    act(() => {
      result.current.panBy(0.9, 0.9);
    });

    expect(result.current.pose.panX).toBe(0);
    expect(result.current.pose.panY).toBe(0);
  });

  // @req REQ-117
  it("holds at the edge of what the dolly revealed", () => {
    const { result } = renderCamera();

    act(() => {
      result.current.zoomBy(READER_MAX_ZOOM);
    });
    const limit = panLimitForZoom(result.current.pose.zoom);

    act(() => {
      result.current.panBy(99, -99);
    });

    expect(result.current.pose.panX).toBeCloseTo(limit);
    expect(result.current.pose.panY).toBeCloseTo(-limit);
  });

  /**
   * Pulling back shrinks the slack that made the pan legal. Left alone, a
   * reader who panned to the edge at 6x and then zoomed out landed on a map
   * stuck off-centre, with nothing telling them why.
   */
  // @req REQ-117
  it("brings a pan back inside the slack when the reader zooms out", () => {
    const { result } = renderCamera();

    act(() => {
      result.current.zoomBy(READER_MAX_ZOOM);
    });
    act(() => {
      result.current.panBy(99, 99);
    });
    expect(result.current.pose.panX).toBeGreaterThan(0);

    act(() => {
      result.current.zoomBy(1 / READER_MAX_ZOOM ** 2);
    });

    expect(result.current.pose.zoom).toBe(MIN_ZOOM);
    expect(result.current.pose.panX).toBe(0);
    expect(result.current.pose.panY).toBe(0);
  });

  // @req REQ-117
  it("gives the entity's own framing back when the reader recentres", () => {
    const { result } = renderCamera();

    act(() => {
      result.current.zoomBy(3);
    });
    act(() => {
      result.current.panBy(0.6, 0.6);
    });
    act(() => {
      result.current.recentre();
    });
    runUntilStill();

    expect(result.current.pose.panX).toBeCloseTo(0);
    expect(result.current.pose.panY).toBeCloseTo(0);
  });

  // @req REQ-117
  it("takes the map out of a flight rather than being added into it", () => {
    const { result, rerender } = renderCamera();

    rerender({ destination: CHOSEN_COUNTRY, reducedMotion: false });
    runOneFrame(0);
    runOneFrame(FLY_TO_DURATION_MS / 4);
    expect(queuedFrames.size).toBe(1);

    act(() => {
      result.current.panBy(0.1, 0);
    });

    expect(queuedFrames.size).toBe(0);
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
