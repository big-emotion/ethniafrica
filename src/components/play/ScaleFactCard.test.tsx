import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ScaleFactCard } from "@/components/play/ScaleFactCard";
import { buildScaleFacts } from "@/lib/games/scaleFacts";

const FACT = buildScaleFacts()[0];

describe("ScaleFactCard (REQ-120)", () => {
  // @req REQ-120
  it("states the measured claim and its explanation", () => {
    render(<ScaleFactCard fact={FACT} />);

    expect(screen.getByText(FACT.headlineFr)).toBeInTheDocument();
    expect(screen.getByText(FACT.bodyFr)).toBeInTheDocument();
  });

  /**
   * A sentence with a number in it is a claim, and this surface says where
   * every claim was measured — the same rule the reveal obeys.
   */
  // @req REQ-120
  it("names where the figures were measured", () => {
    render(<ScaleFactCard fact={FACT} />);

    expect(screen.getByTestId("scale-fact-card")).toHaveTextContent(/D'après/);
  });

  // The band is an aside beside the round, not a second heading competing
  // with the question for the section's outline.
  // @req REQ-120
  it("adds no heading to the page outline", () => {
    render(<ScaleFactCard fact={FACT} />);

    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });
});
