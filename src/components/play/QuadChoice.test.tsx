import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { QuadChoice } from "@/components/play/QuadChoice";
import type { QuadRound } from "@/lib/games/gameKinds";

const ROUND: QuadRound = {
  kind: "quad",
  gameId: "familles",
  subjectId: "PPL_WOLOF",
  promptFr: "À quelle famille linguistique ce peuple appartient-il",
  reveal: {
    textFr: "Les Wolof relèvent de la famille nigéro-congolaise.",
    fieldPath: "content.linguistics.familyId",
  },
  options: [
    { labelFr: "Nigéro-congolaise" },
    { labelFr: "Afro-asiatique" },
    { labelFr: "Nilo-saharienne" },
    { labelFr: "Khoïsan" },
  ],
  correctIndex: 0,
};

describe("QuadChoice (Jouer hub engine, REQ-120)", () => {
  // @req REQ-120
  it("renders the round question above the four choices", () => {
    render(<QuadChoice round={ROUND} onAnswer={vi.fn()} />);

    expect(
      screen.getByText("À quelle famille linguistique ce peuple appartient-il")
    ).toBeInTheDocument();
  });

  // @req REQ-120
  it("offers one button per corpus option, none invented", () => {
    render(<QuadChoice round={ROUND} onAnswer={vi.fn()} />);

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(4);
    expect(buttons.map((button) => button.textContent)).toEqual([
      "Nigéro-congolaise",
      "Afro-asiatique",
      "Nilo-saharienne",
      "Khoïsan",
    ]);
  });

  // @req REQ-120
  it("reports the index of the option the reader chose", async () => {
    const user = userEvent.setup();
    const onAnswer = vi.fn();
    render(<QuadChoice round={ROUND} onAnswer={onAnswer} />);

    await user.click(screen.getByRole("button", { name: "Nilo-saharienne" }));

    expect(onAnswer).toHaveBeenCalledWith(2);
  });

  // @req REQ-120
  it("stops reporting choices once the round is answered", async () => {
    const user = userEvent.setup();
    const onAnswer = vi.fn();
    render(<QuadChoice round={ROUND} onAnswer={onAnswer} disabled />);

    await user.click(screen.getByRole("button", { name: "Khoïsan" }));

    expect(onAnswer).not.toHaveBeenCalled();
  });

  // @req REQ-120
  it("stacks the options on mobile and pairs them from md up", () => {
    render(<QuadChoice round={ROUND} onAnswer={vi.fn()} />);

    const grid = screen.getByTestId("quad-choice-options");
    expect(grid.className).toMatch(/grid-cols-1/);
    expect(grid.className).toMatch(/md:grid-cols-2/);
  });

  // @req REQ-120
  it("gives every choice the 44px thumb-tap minimum", () => {
    render(<QuadChoice round={ROUND} onAnswer={vi.fn()} />);

    for (const button of screen.getAllByRole("button")) {
      expect(button.className).toMatch(/min-h-11/);
    }
  });
});
