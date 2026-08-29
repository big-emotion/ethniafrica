import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { EstimateSlider } from "@/components/play/EstimateSlider";
import type { EstimateRound } from "@/lib/games/gameKinds";

const ROUND: EstimateRound = {
  kind: "estimate",
  gameId: "mercator",
  subjectId: "GRL",
  promptFr: "Combien de fois le Groenland tient-il dans l'Afrique ?",
  subjectFr: "le Groenland",
  unitFr: "fois",
  min: 1,
  max: 20,
  step: 0.5,
  correctValue: 14,
  toleranceRatio: 0.2,
  reveal: {
    textFr: "14 fois.",
    fieldPath: "lib/atlas/assets/worldCompare",
    sources: [],
    confidence: null,
    ficheHref: "/fr/explorer",
  },
};

describe("EstimateSlider (Jouer hub engine, REQ-120)", () => {
  // @req REQ-120
  it("leads with the question as the section's heading", () => {
    render(<EstimateSlider round={ROUND} onAnswer={vi.fn()} />);

    expect(
      screen.getByRole("heading", { level: 2, name: /Combien de fois/ })
    ).toBeInTheDocument();
  });

  // @req REQ-120
  it("offers a slider spanning the round's own track", () => {
    render(<EstimateSlider round={ROUND} onAnswer={vi.fn()} />);

    const slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute("min", "1");
    expect(slider).toHaveAttribute("max", "20");
    expect(slider).toHaveAttribute("step", "0.5");
  });

  /**
   * The reader has to see the number they are committing to. A bare track
   * with no readout is a gesture without a value, and the reveal would then
   * be comparing their answer to something they never actually read.
   */
  // @req REQ-120
  it("reads the current estimate back, with its unit", () => {
    render(<EstimateSlider round={ROUND} onAnswer={vi.fn()} />);

    expect(screen.getByTestId("estimate-readout")).toHaveTextContent(/fois/);
  });

  // @req REQ-120
  it("opens at the foot of the track, never near the answer", () => {
    render(<EstimateSlider round={ROUND} onAnswer={vi.fn()} />);

    expect((screen.getByRole("slider") as HTMLInputElement).value).toBe("1");
  });

  // @req REQ-120
  it("reports the committed number, not every value passed on the way", async () => {
    const user = userEvent.setup();
    const onAnswer = vi.fn();
    render(<EstimateSlider round={ROUND} onAnswer={onAnswer} />);

    // The track is driven by a change event rather than by arrow keys:
    // happy-dom does not implement a range input's keyboard stepping, so the
    // keys would assert the environment rather than the component.
    fireEvent.change(screen.getByRole("slider"), { target: { value: "7.5" } });

    expect(onAnswer).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /Valider/ }));

    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(onAnswer).toHaveBeenCalledWith(7.5);
  });

  // @req REQ-120
  it("stops reporting once the round is answered", async () => {
    const user = userEvent.setup();
    const onAnswer = vi.fn();
    render(<EstimateSlider round={ROUND} onAnswer={onAnswer} disabled />);

    await user.click(screen.getByRole("button", { name: /Valider/ }));

    expect(onAnswer).not.toHaveBeenCalled();
  });

  // @req REQ-120
  it("gives the track and the commit button the 44px thumb minimum", () => {
    render(<EstimateSlider round={ROUND} onAnswer={vi.fn()} />);

    expect(screen.getByRole("slider").className).toMatch(/min-h-11/);
    expect(screen.getByRole("button", { name: /Valider/ }).className).toMatch(
      /min-h-11/
    );
  });

  /**
   * A screen reader announcing « 7 » says nothing. The value has to carry the
   * unit and the subject, which is the semantic a sighted reader gets from
   * the readout beside the track.
   */
  // @req REQ-120
  it("announces the value with its unit rather than as a bare number", () => {
    render(<EstimateSlider round={ROUND} onAnswer={vi.fn()} />);

    expect(screen.getByRole("slider")).toHaveAttribute(
      "aria-valuetext",
      expect.stringContaining("fois")
    );
  });
});
