"use client";

import { useEffect, useRef } from "react";

import { africaDots } from "@/lib/continentDots";

const DOT_RADIUS = 1.6;
const TWINKLE_TIME_STEP = 0.016;
const MAX_DEVICE_PIXEL_RATIO = 2;

// Mirrors --afh-cat-ocre in src/styles/tokens/color.css (charter categorical
// ochre) — kept as a hex constant because a canvas 2D fillStyle cannot
// resolve a CSS custom property directly. See DottedContinent.test.tsx for
// the cross-check against the token sheet.
// @req REQ-091
export const CHARTER_OCRE_HEX = "#c9821f";

interface CanvasSize {
  width: number;
  height: number;
}

interface DottedContinentProps {
  dotColorHex?: string;
}

function hexToRgbChannels(hex: string): string {
  const value = hex.replace("#", "");
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  return `${r},${g},${b}`;
}

// @req REQ-091
export function DottedContinent({
  dotColorHex = CHARTER_OCRE_HEX,
}: DottedContinentProps = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    const parent = canvas?.parentElement;
    if (!canvas || !context || !parent) return;

    const dotColorRgb = hexToRgbChannels(dotColorHex);
    const dots = africaDots();
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    let size: CanvasSize = { width: 0, height: 0 };
    let time = 0;
    let visible = true;
    let disposed = false;
    let frameId: number | null = null;

    const resize = () => {
      const width = canvas.clientWidth || parent.clientWidth;
      const height = parent.clientHeight || canvas.clientHeight;
      const devicePixelRatio = Math.min(
        window.devicePixelRatio || 1,
        MAX_DEVICE_PIXEL_RATIO
      );

      canvas.width = Math.round(width * devicePixelRatio);
      canvas.height = Math.round(height * devicePixelRatio);
      context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      size = { width, height };
    };

    const draw = (staticFrame: boolean) => {
      const { width, height } = size;
      context.clearRect(0, 0, width, height);

      const scale = Math.max(width, 1.15 * height);
      const offsetX = width - 0.92 * scale;
      const offsetY = 0.5 * height - 0.42 * scale;

      if (!staticFrame) time += TWINKLE_TIME_STEP;

      for (const [x, y, phase] of dots) {
        const twinkle = staticFrame
          ? 0.55
          : 0.38 + 0.3 * Math.sin(1.1 * time + phase);
        context.fillStyle = `rgba(${dotColorRgb},${(0.45 * twinkle).toFixed(3)})`;
        context.beginPath();
        context.arc(offsetX + x * scale, offsetY + y * scale, DOT_RADIUS, 0, 7);
        context.fill();
      }
    };

    const requestFrame = () => {
      if (disposed || reducedMotion || !visible || frameId !== null) return;

      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        if (disposed || !visible) return;
        draw(false);
        requestFrame();
      });
    };

    const handleResize = () => {
      resize();
      if (reducedMotion) draw(true);
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
          requestFrame();
        }
      },
      { threshold: 0.05 }
    );
    const resizeObserver = new ResizeObserver(handleResize);

    resize();
    observer.observe(canvas);
    resizeObserver.observe(parent);
    window.addEventListener("resize", handleResize);

    if (reducedMotion) draw(true);
    else requestFrame();

    return () => {
      disposed = true;
      observer.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
      if (frameId !== null) window.cancelAnimationFrame(frameId);
    };
  }, [dotColorHex]);

  return (
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
  );
}
