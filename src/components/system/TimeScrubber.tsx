"use client";

import * as SliderPrimitive from "@radix-ui/react-slider";
import * as React from "react";

import { formatYearFr } from "@/lib/atlas/formatYearFr";
import { cn } from "@/lib/utils";

export interface TimeScrubberProps {
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  eraStep?: number;
  formatYear?: (year: number) => string;
  disabled?: boolean;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  return reduced;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// @req REQ-101
export function TimeScrubber({
  min,
  max,
  value,
  onChange,
  step = 1,
  eraStep = 100,
  formatYear = formatYearFr,
  disabled = false,
}: TimeScrubberProps) {
  const reducedMotion = usePrefersReducedMotion();

  // Radix's own PageUp/PageDown handling multiplies `step` by a fixed 10x
  // (see @radix-ui/react-slider SliderOrientation), which cannot express an
  // independent eraStep. Intercepting the two keys here and calling
  // preventDefault() short-circuits composeEventHandlers so Radix's internal
  // handler never runs for them; every other key (arrows, Home, End) still
  // falls through to Radix's default behavior untouched.
  function handleKeyDown(event: React.KeyboardEvent) {
    if (disabled) return;
    if (event.key !== "PageUp" && event.key !== "PageDown") return;
    event.preventDefault();
    const direction = event.key === "PageUp" ? 1 : -1;
    onChange(clamp(value + direction * eraStep, min, max));
  }

  return (
    <SliderPrimitive.Root
      data-testid="time-scrubber"
      data-motion={reducedMotion ? "instant" : "smooth"}
      min={min}
      max={max}
      step={step}
      value={[value]}
      disabled={disabled}
      onValueChange={([next]) => {
        if (next !== undefined) onChange(next);
      }}
      onKeyDown={handleKeyDown}
      className="relative flex h-11 w-full touch-none select-none items-center"
    >
      <SliderPrimitive.Track
        className={cn(
          "relative h-2 w-full grow overflow-hidden rounded-afh-sm bg-afh-bg-warm",
          reducedMotion ? "transition-none" : "transition-all duration-afh-base"
        )}
      >
        <SliderPrimitive.Range
          className={cn(
            "absolute h-full bg-afh-terracotta",
            reducedMotion
              ? "transition-none"
              : "transition-all duration-afh-base"
          )}
        />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        aria-label="Année"
        aria-valuetext={formatYear(value)}
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-full",
          "outline-none focus-visible:ring-2 focus-visible:ring-afh-gold focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          reducedMotion ? "transition-none" : "transition-transform"
        )}
      >
        <span
          aria-hidden="true"
          className="h-5 w-5 rounded-full border-2 border-afh-terracotta bg-afh-surface"
        />
      </SliderPrimitive.Thumb>
    </SliderPrimitive.Root>
  );
}

export default TimeScrubber;
