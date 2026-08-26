"use client";

import { useEffect, useRef, useState } from "react";

import { createSphereLayer, type SphereLayer } from "@/lib/atlas/sphereLayer";
import { resolveGlobePalette } from "@/lib/atlas/globePalette";
import { AFRICA_CENTER_LON, buildRotationMatrix } from "@/lib/atlas/projection";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

const MAX_DEVICE_PIXEL_RATIO = 2;
const DRAG_RADIANS_PER_PIXEL = 0.006;
const DRAG_PITCH_RADIANS_PER_PIXEL = 0.004;
const KEY_STEP_RADIANS = 0.12;
const PITCH_LIMIT_RADIANS = 1.1;
const EASE = 0.085;
/** Below this, the remaining travel is under a pixel — stop the loop. */
const SETTLED = 0.0005;

const HOME_YAW = -(AFRICA_CENTER_LON * Math.PI) / 180;
const HOME_PITCH = 0;
/** The body occupies 1/1.14 of the frame, as the reference demo does. */
const HERO_FIT_MARGIN = 1 / 1.14;

const clampPitch = (value: number): number =>
  Math.min(PITCH_LIMIT_RADIANS, Math.max(-PITCH_LIMIT_RADIANS, value));

/** Percentage on the slider, where 0 is the flat map and 100 the globe. */
const MORPH_MAX = 100;

/**
 * What the reader is looking at, said plainly. The figure is the one claim
 * the demonstration rests on: Africa's real area is 30.4 M km², and a flat
 * Mercator map is what hides it.
 */
function readoutFor(morph: number): string {
  if (morph > 0.92) {
    return "Globe — chaque pastille retrouve sa surface réelle. L'Afrique fait 30,4 M km².";
  }
  if (morph < 0.08) {
    return "Carte plate — Mercator gonfle les surfaces de sec²(latitude) : ×4 à 60°, ×9 à 70°.";
  }
  return "En cours de repli — regarde les pastilles reprendre la même taille.";
}

/**
 * The home hero's globe (REQ-112): the shared textured sphere, turned by
 * pointer drag or arrow keys, with a slider that closes the flat Mercator
 * map back into a globe so the reader watches Africa recover its true size
 * rather than being told it does. Tissot's indicatrices make the argument
 * measurable — every disc covers the same real area, so the swelling on
 * the flat map is the projection's doing and nothing else.
 *
 * The sphere itself lives in src/lib/atlas/sphereLayer.ts — the same layer
 * every fiche's atlas draws — so this component only owns the canvas, the
 * input and the easing.
 */
// @req REQ-112
// @req REQ-115
export function HomeGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  const yaw = useRef(HOME_YAW);
  const yawTarget = useRef(HOME_YAW);
  const pitch = useRef(HOME_PITCH);
  const pitchTarget = useRef(HOME_PITCH);
  const morph = useRef(1);
  const morphTarget = useRef(1);
  const dragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const reducedMotionRef = useRef(reducedMotion);
  const requestFrame = useRef<(() => void) | null>(null);
  const drawNow = useRef<(() => void) | null>(null);
  const layerRef = useRef<SphereLayer | null>(null);

  const [morphPercent, setMorphPercent] = useState(MORPH_MAX);
  const [tissotOn, setTissotOn] = useState(true);
  const [readout, setReadout] = useState(() => readoutFor(1));

  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
  }, [reducedMotion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = canvas?.parentElement;
    if (!canvas || !stage) return;

    const gl = (canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) return;

    const layer = createSphereLayer(
      gl,
      resolveGlobePalette(),
      document.createElement("canvas"),
      // The hero has no overlay to align to, so the body is pulled in from
      // the canvas edge and keeps its lit limb visible as it turns.
      HERO_FIT_MARGIN,
      true
    );
    if (!layer) return;
    layerRef.current = layer;

    let aspect = 1;
    let disposed = false;
    let visible = true;
    let frameId: number | null = null;

    const resize = () => {
      const ratio = Math.min(
        window.devicePixelRatio || 1,
        MAX_DEVICE_PIXEL_RATIO
      );
      const width = canvas.clientWidth || stage.clientWidth;
      const height = canvas.clientHeight || stage.clientHeight;

      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      aspect = canvas.height > 0 ? canvas.width / canvas.height : 1;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const draw = () => {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      layer.draw({
        rotation: buildRotationMatrix(yaw.current, pitch.current),
        morph: morph.current,
        aspect,
      });
    };
    drawNow.current = draw;

    const settled = () =>
      Math.abs(yawTarget.current - yaw.current) < SETTLED &&
      Math.abs(pitchTarget.current - pitch.current) < SETTLED &&
      Math.abs(morphTarget.current - morph.current) < SETTLED;

    // The globe does not spin on its own, so once it has caught up with
    // the reader's last input there is nothing left to animate. Stopping
    // the loop there is what keeps an idle landing page off the battery.
    const scheduleFrame = () => {
      if (disposed || !visible || frameId !== null) return;
      if (reducedMotionRef.current) return;

      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        if (disposed || !visible) return;

        yaw.current += (yawTarget.current - yaw.current) * EASE;
        pitch.current += (pitchTarget.current - pitch.current) * EASE;
        morph.current += (morphTarget.current - morph.current) * EASE;
        draw();

        if (!settled()) scheduleFrame();
      });
    };

    const snapAndDraw = () => {
      yaw.current = yawTarget.current;
      pitch.current = pitchTarget.current;
      morph.current = morphTarget.current;
      draw();
    };

    requestFrame.current = () => {
      if (reducedMotionRef.current) snapAndDraw();
      else scheduleFrame();
    };

    const handleResize = () => {
      resize();
      draw();
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries.find(({ target }) => target === canvas);
        if (!entry) return;

        visible = entry.isIntersecting;
        if (!visible && frameId !== null) {
          window.cancelAnimationFrame(frameId);
          frameId = null;
        } else if (visible) {
          scheduleFrame();
        }
      },
      { threshold: 0.05 }
    );
    const resizeObserver = new ResizeObserver(handleResize);

    resize();
    observer.observe(canvas);
    resizeObserver.observe(stage);
    window.addEventListener("resize", handleResize);

    // The globe opens already at its home orientation, so the first paint
    // is a single frame and nothing needs animating until the reader acts.
    draw();

    return () => {
      disposed = true;
      requestFrame.current = null;
      drawNow.current = null;
      layerRef.current = null;
      observer.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      layer.dispose();
    };
  }, []);

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    dragging.current = true;
    lastPointer.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragging.current) return;

    const dx = event.clientX - lastPointer.current.x;
    const dy = event.clientY - lastPointer.current.y;
    lastPointer.current = { x: event.clientX, y: event.clientY };

    // A drag moves the globe itself, not a target it eases toward: under a
    // finger the surface has to keep up with the finger, and easing here
    // reads as the globe refusing to follow.
    // buildRotationMatrix sends the facing point to y = -sin(pitch), so a
    // downward drag has to raise pitch for the surface to travel down with
    // the finger. Subtracting here is what made the globe climb when the
    // reader pulled it down.
    yawTarget.current += dx * DRAG_RADIANS_PER_PIXEL;
    pitchTarget.current = clampPitch(
      pitchTarget.current + dy * DRAG_PITCH_RADIANS_PER_PIXEL
    );
    yaw.current = yawTarget.current;
    pitch.current = pitchTarget.current;
    drawNow.current?.();
  };

  const stopDragging = () => {
    dragging.current = false;
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    switch (event.key) {
      case "ArrowLeft":
        yawTarget.current -= KEY_STEP_RADIANS;
        break;
      case "ArrowRight":
        yawTarget.current += KEY_STEP_RADIANS;
        break;
      // Same convention as the drag: up sends the surface up, which is a
      // decrease in pitch.
      case "ArrowUp":
        pitchTarget.current = clampPitch(
          pitchTarget.current - KEY_STEP_RADIANS
        );
        break;
      case "ArrowDown":
        pitchTarget.current = clampPitch(
          pitchTarget.current + KEY_STEP_RADIANS
        );
        break;
      default:
        return;
    }
    event.preventDefault();
    requestFrame.current?.();
  };

  const applyMorph = (percent: number) => {
    setMorphPercent(percent);
    morphTarget.current = percent / MORPH_MAX;
    setReadout(readoutFor(morphTarget.current));
    requestFrame.current?.();
  };

  const recentre = () => {
    yawTarget.current = HOME_YAW;
    pitchTarget.current = HOME_PITCH;
    applyMorph(MORPH_MAX);
  };

  const toggleTissot = () => {
    const next = !tissotOn;
    setTissotOn(next);
    layerRef.current?.setTissot(next);
    drawNow.current?.();
  };

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <p className="home-globe-readout" data-testid="home-globe-readout">
        {readout}
      </p>

      <button
        type="button"
        aria-label="Globe interactif de l'Afrique. Glissez ou utilisez les flèches du clavier pour le faire pivoter."
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        onPointerLeave={stopDragging}
        onKeyDown={handleKeyDown}
        style={{
          position: "absolute",
          inset: 0,
          border: "none",
          background: "none",
          padding: 0,
          margin: 0,
          cursor: "grab",
          touchAction: "none",
        }}
      >
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        />
      </button>

      <div className="home-globe-tools">
        <div className="home-globe-morph">
          <label htmlFor="home-globe-morph-range">Carte plate</label>
          <input
            id="home-globe-morph-range"
            type="range"
            min={0}
            max={MORPH_MAX}
            value={morphPercent}
            data-testid="home-globe-morph-range"
            aria-label="Morphing de la carte plate vers le globe"
            onChange={(event) => applyMorph(Number(event.target.value))}
          />
          <label htmlFor="home-globe-morph-range">Globe</label>
        </div>
        <button
          type="button"
          onClick={recentre}
          data-testid="home-globe-recentre"
          className="home-globe-tool"
        >
          Recentrer sur l&apos;Afrique
        </button>
        <button
          type="button"
          onClick={toggleTissot}
          aria-pressed={tissotOn}
          data-testid="home-globe-tissot"
          className="home-globe-tool"
          data-active={tissotOn ? "true" : "false"}
        >
          Pastilles
        </button>
      </div>

      <style>{`
        .home-globe-readout {
          position: absolute;
          left: 14px;
          top: 14px;
          z-index: 1;
          margin: 0;
          max-width: calc(100% - 28px);
          padding: 8px 11px;
          border: 1px solid var(--afh-night-line);
          border-radius: var(--afh-radius-sm);
          background: color-mix(in srgb, var(--afh-night-surface) 88%, transparent);
          font-family: var(--afh-font-mono);
          font-size: 11.5px;
          line-height: 1.5;
          color: var(--afh-night-ink-2);
          font-variant-numeric: tabular-nums;
          pointer-events: none;
        }

        .home-globe-tools {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 16px;
          display: flex;
          gap: 10px;
          justify-content: center;
          align-items: center;
          flex-wrap: wrap;
          padding: 0 16px;
          z-index: 1;
        }

        .home-globe-morph {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 14px;
          border-radius: var(--afh-radius-full);
          border: 1px solid var(--afh-night-line);
          background: color-mix(in srgb, var(--afh-night-surface) 88%, transparent);
          backdrop-filter: blur(6px);
        }
        .home-globe-morph label {
          font-family: var(--afh-font-mono);
          font-size: 11px;
          color: var(--afh-night-ink-3);
          white-space: nowrap;
        }
        .home-globe-morph input[type="range"] {
          width: 150px;
          min-height: 44px;
          accent-color: var(--afh-cat-ocre);
          cursor: pointer;
        }
        .home-globe-morph input[type="range"]:focus-visible {
          outline: 2px solid var(--afh-cat-ocre);
          outline-offset: 3px;
        }

        .home-globe-tool {
          min-height: 44px;
          padding: 7px 14px;
          border-radius: var(--afh-radius-full);
          border: 1px solid var(--afh-night-line);
          background: color-mix(in srgb, var(--afh-night-surface) 82%, transparent);
          color: var(--afh-night-ink-2);
          font-family: var(--afh-font-body);
          font-size: 12.5px;
          cursor: pointer;
          backdrop-filter: blur(6px);
          transition: border-color var(--afh-duration-fast) var(--afh-ease-out),
            color var(--afh-duration-fast) var(--afh-ease-out);
        }
        .home-globe-tool:hover {
          border-color: var(--afh-cat-ocre);
          color: var(--afh-night-ink);
        }
        .home-globe-tool:focus-visible {
          outline: 2px solid var(--afh-cat-ocre);
          outline-offset: 2px;
        }
        .home-globe-tool[data-active="true"] {
          background: var(--afh-cat-teal);
          border-color: var(--afh-cat-teal);
          color: #08201b;
          font-weight: 700;
        }

        /* At 430 the readout would otherwise sit on top of the globe it is
           describing, and the three tools would need two rows of their own. */
        @media (max-width: 700px) {
          .home-globe-readout { font-size: 10.5px; padding: 6px 9px; }
          .home-globe-morph input[type="range"] { width: 110px; }
          .home-globe-tools { gap: 8px; bottom: 12px; }
        }
      `}</style>
    </div>
  );
}

export default HomeGlobe;
