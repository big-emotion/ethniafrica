import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { BinaryChoice } from "@/components/play/BinaryChoice";
import type { BinaryRound } from "@/lib/games/gameKinds";
import { getPeopleRoute } from "@/lib/routing";

const ROUND: BinaryRound = {
  kind: "binary",
  gameId: "appellations",
  subjectId: "PPL_YORUBA",
  promptFr: "Lequel de ces deux noms ce peuple se donne-t-il",
  reveal: {
    textFr: "Le terme Yoruba vient du haoussa.",
    fieldPath: "content.appellations.originOfExonyms",
    sources: [],
    confidence: null,
    ficheHref: getPeopleRoute("fr", "PPL_TEST"),
  },
  options: [
    { labelFr: "Yorùbá", name: { autonym: "Yorùbá", exonym: "Yoruba" } },
    { labelFr: "Nagot" },
  ],
  correctIndex: 0,
};

const ROUND_WITH_STIMULUS: BinaryRound = {
  ...ROUND,
  stimulus: {
    familyFr: "Niger-Congo",
    countriesFr: ["Nigeria", "Bénin"],
    subjectName: { autonym: "Yorùbá", exonym: "Yoruba" },
    scaleFr: "environ 47 000 000 personnes",
  },
};

describe("BinaryChoice — the round says who it is about (REQ-120)", () => {
  // @req REQ-120
  it("names the people, its family and its countries above the question", () => {
    render(<BinaryChoice round={ROUND_WITH_STIMULUS} onAnswer={vi.fn()} />);

    const stimulus = screen.getByTestId("round-stimulus");
    expect(stimulus).toHaveTextContent("Yorùbá");
    expect(stimulus).toHaveTextContent("Niger-Congo");
    expect(stimulus).toHaveTextContent("Nigeria");
    expect(stimulus).toHaveTextContent("Bénin");
    expect(stimulus).toHaveTextContent("environ 47 000 000 personnes");
  });

  // pays-davant and mercator carry no stimulus on purpose — one would give
  // the answer away, the other names both countries in its own options.
  // @req REQ-120
  it("renders nothing at all for a round that carries no stimulus", () => {
    render(<BinaryChoice round={ROUND} onAnswer={vi.fn()} />);

    expect(screen.queryByTestId("round-stimulus")).not.toBeInTheDocument();
  });
});

describe("BinaryChoice (Jouer hub engine, REQ-120)", () => {
  // @req REQ-120
  it("renders the round question above the two choices", () => {
    render(<BinaryChoice round={ROUND} onAnswer={vi.fn()} />);

    expect(
      screen.getByText("Lequel de ces deux noms ce peuple se donne-t-il")
    ).toBeInTheDocument();
  });

  // @req REQ-120
  it("offers exactly two buttons, one per option", () => {
    render(<BinaryChoice round={ROUND} onAnswer={vi.fn()} />);

    expect(screen.getAllByRole("button")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Nagot" })).toBeInTheDocument();
  });

  // @req REQ-120
  it("keeps the exonym beside the autonym in the accessible name", () => {
    render(<BinaryChoice round={ROUND} onAnswer={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: "Yorùbá (Yoruba)" })
    ).toBeInTheDocument();
  });

  // @req REQ-120
  it("reports the index of the option the reader chose", async () => {
    const user = userEvent.setup();
    const onAnswer = vi.fn();
    render(<BinaryChoice round={ROUND} onAnswer={onAnswer} />);

    await user.click(screen.getByRole("button", { name: "Nagot" }));

    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(onAnswer).toHaveBeenCalledWith(1);
  });

  // @req REQ-120
  it("stops reporting choices once the round is answered", async () => {
    const user = userEvent.setup();
    const onAnswer = vi.fn();
    render(<BinaryChoice round={ROUND} onAnswer={onAnswer} disabled />);

    await user.click(screen.getByRole("button", { name: "Nagot" }));

    expect(onAnswer).not.toHaveBeenCalled();
  });

  // @req REQ-120
  it("gives every choice the 44px thumb-tap minimum", () => {
    render(<BinaryChoice round={ROUND} onAnswer={vi.fn()} />);

    for (const button of screen.getAllByRole("button")) {
      expect(button.className).toMatch(/min-h-11/);
    }
  });
});
