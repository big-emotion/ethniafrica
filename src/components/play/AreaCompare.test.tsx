import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AreaCompare } from "@/components/play/AreaCompare";
import type { AreaCompareRound } from "@/lib/games/gameKinds";

/**
 * Two squares sharing a corner: 10° x 10° against 5° x 5°. Chosen so the
 * expected viewBox coordinates are exact integers and the assertions can read
 * as geometry rather than as float tolerance.
 */
const ROUND: AreaCompareRound = {
  kind: "areaCompare",
  gameId: "vraie-taille",
  subjectId: "NGA",
  promptFr: "Deux formes, à la même échelle",
  questionFr: "Laquelle est la plus grande",
  reveal: {
    textFr: "Le Nigeria couvre 923 768 km carrés.",
    fieldPath: "afrik_countries.area_km2",
  },
  shapes: [
    {
      labelFr: "Nigeria",
      captionFr: "923 768 km carrés",
      areaKm2: 923768,
      rings: [
        [
          { lon: 0, lat: 0 },
          { lon: 10, lat: 0 },
          { lon: 10, lat: 10 },
          { lon: 0, lat: 10 },
        ],
      ],
    },
    {
      labelFr: "Ghana",
      captionFr: "238 535 km carrés",
      areaKm2: 238535,
      rings: [
        [
          { lon: 0, lat: 0 },
          { lon: 5, lat: 0 },
          { lon: 5, lat: 5 },
          { lon: 0, lat: 5 },
        ],
      ],
    },
  ],
  correctIndex: 0,
};

function stagePaths(): SVGPathElement[] {
  const stage = screen.getByTestId("area-compare-stage");
  return Array.from(stage.querySelectorAll("path"));
}

describe("AreaCompare (Jouer hub engine, REQ-120)", () => {
  // @req REQ-120
  it("renders the standing prompt and the comparison question", () => {
    render(<AreaCompare round={ROUND} onAnswer={vi.fn()} />);

    expect(
      screen.getByText("Deux formes, à la même échelle")
    ).toBeInTheDocument();
    expect(screen.getByText("Laquelle est la plus grande")).toBeInTheDocument();
  });

  // @req REQ-120
  it("overlays both outlines in a single svg so they are judged by eye", () => {
    const { container } = render(
      <AreaCompare round={ROUND} onAnswer={vi.fn()} />
    );

    expect(
      container.querySelectorAll("[data-testid='area-compare-stage']")
    ).toHaveLength(1);
    expect(stagePaths()).toHaveLength(2);
  });

  // @req REQ-120
  it("normalises both shapes into one shared viewBox at one scale", () => {
    render(<AreaCompare round={ROUND} onAnswer={vi.fn()} />);

    const [larger, smaller] = stagePaths();
    expect(larger).toHaveAttribute("d", "M 0 100 L 100 100 L 100 0 L 0 0 Z");
    expect(smaller).toHaveAttribute("d", "M 0 100 L 50 100 L 50 50 L 0 50 Z");
  });

  // @req REQ-120
  it("inverts latitude so the northern vertex sits higher on screen", () => {
    render(<AreaCompare round={ROUND} onAnswer={vi.fn()} />);

    // (0,0) is the southern corner, (0,10) the northern one.
    const [larger] = stagePaths();
    const d = larger.getAttribute("d") ?? "";
    const southY = Number(d.match(/^M \d+ (\d+)/)?.[1]);
    const northY = Number(d.match(/L 0 (\d+) Z$/)?.[1]);
    expect(northY).toBeLessThan(southY);
  });

  // @req REQ-120
  it("separates the two outlines by stroke style, never by colour alone", () => {
    render(<AreaCompare round={ROUND} onAnswer={vi.fn()} />);

    const styles = stagePaths().map((path) =>
      path.getAttribute("data-stroke-style")
    );
    expect(styles).toEqual(["solid", "dashed"]);
  });

  // @req REQ-120
  it("labels each choice with its name and its verbatim caption", () => {
    render(<AreaCompare round={ROUND} onAnswer={vi.fn()} />);

    expect(screen.getByRole("button", { name: /Nigeria/ })).toHaveTextContent(
      "923 768 km carrés"
    );
    expect(screen.getByRole("button", { name: /Ghana/ })).toHaveTextContent(
      "238 535 km carrés"
    );
  });

  // @req REQ-120
  it("reports the index of the shape the reader chose", async () => {
    const user = userEvent.setup();
    const onAnswer = vi.fn();
    render(<AreaCompare round={ROUND} onAnswer={onAnswer} />);

    await user.click(screen.getByRole("button", { name: /Ghana/ }));

    expect(onAnswer).toHaveBeenCalledWith(1);
  });

  // @req REQ-120
  it("stops reporting choices once the round is answered", async () => {
    const user = userEvent.setup();
    const onAnswer = vi.fn();
    render(<AreaCompare round={ROUND} onAnswer={onAnswer} disabled />);

    await user.click(screen.getByRole("button", { name: /Nigeria/ }));

    expect(onAnswer).not.toHaveBeenCalled();
  });

  // @req REQ-120
  it("gives every choice the 44px thumb-tap minimum", () => {
    render(<AreaCompare round={ROUND} onAnswer={vi.fn()} />);

    for (const button of screen.getAllByRole("button")) {
      expect(button.className).toMatch(/min-h-11/);
    }
  });
});
