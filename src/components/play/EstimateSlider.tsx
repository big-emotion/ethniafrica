"use client";

import { useState } from "react";

import { frenchNumber } from "@/lib/games/format";
import type { EstimateRound } from "@/lib/games/gameKinds";
import { cn } from "@/lib/utils";

const COPY_FR = {
  commit: "Valider mon estimation",
  hint: "Faites glisser, puis validez.",
} as const;

export interface EstimateSliderProps {
  round: EstimateRound;
  onAnswer: (value: number) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * The Jouer hub's second gesture (REQ-120): one track, one number, one commit.
 *
 * `BinaryChoice` answers on the tap because a two-way choice *is* the answer.
 * A slider is not: every value the thumb crosses on the way would be an
 * answer, so the reader states one explicitly. That extra press is the same
 * one the quiz makes for a considered answer, and this round is considered by
 * construction — the reader is being asked to weigh a magnitude, not to
 * recognise a name.
 *
 * The track opens at its floor rather than its middle. A midpoint start reads
 * as a suggestion, and on a round about how far off an intuition is, the
 * interface must not supply the intuition.
 */
// @req REQ-120
export const EstimateSlider = ({
  round,
  onAnswer,
  disabled = false,
  className,
}: EstimateSliderProps) => {
  const [estimate, setEstimate] = useState(round.min);

  const valueFr = `${frenchNumber.format(estimate)} ${round.unitFr}`;
  const trackId = `estimate-track-${round.subjectId}`;

  return (
    <section
      data-testid="estimate-slider"
      aria-labelledby={`estimate-prompt-${round.subjectId}`}
      className={cn("flex flex-col gap-4", className)}
    >
      <h2
        id={`estimate-prompt-${round.subjectId}`}
        className="font-afh-display text-afh-h3 font-bold text-afh-text"
      >
        {round.promptFr}
      </h2>

      {/*
        Polite rather than assertive: the reader is dragging, so the
        announcement should follow the gesture instead of cutting across it —
        the same choice the globe's readout makes.
      */}
      <p
        data-testid="estimate-readout"
        aria-live="polite"
        className="font-afh-display text-afh-h2 font-black tabular-nums text-afh-text"
      >
        {valueFr}
      </p>

      <label htmlFor={trackId} className="sr-only">
        {round.promptFr}
      </label>
      <input
        id={trackId}
        type="range"
        min={round.min}
        max={round.max}
        step={round.step}
        value={estimate}
        disabled={disabled}
        aria-valuetext={valueFr}
        onChange={(event) => setEstimate(Number(event.target.value))}
        className="min-h-11 w-full cursor-pointer accent-afh-cat-ocre disabled:cursor-not-allowed disabled:opacity-50"
      />

      <p className="text-afh-small text-afh-text-soft">{COPY_FR.hint}</p>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onAnswer(estimate)}
        className="min-h-11 w-full rounded-afh-lg px-4 py-2 font-medium disabled:cursor-not-allowed disabled:opacity-50"
        style={{
          backgroundColor: "var(--accent)",
          color: "var(--accent-foreground)",
        }}
      >
        {COPY_FR.commit}
      </button>
    </section>
  );
};

export default EstimateSlider;
