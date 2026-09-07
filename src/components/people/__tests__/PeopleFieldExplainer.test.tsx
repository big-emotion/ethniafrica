import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PeopleFieldExplainer } from "@/components/people/PeopleFieldExplainer";

const distribution = [
  { country: "NGA", population: 45500000 },
  { country: "BEN", population: 1800000 },
];

describe("PeopleFieldExplainer (REQ-116)", () => {
  // @req REQ-145
  it("explains the map in English", () => {
    render(<PeopleFieldExplainer distribution={distribution} language="en" />);
    expect(
      screen.getByText(
        /no corpus source states where this people's presence ends/i
      )
    ).toBeVisible();
    expect(screen.getByText(/2 populations by country/i)).toBeVisible();
    expect(screen.getByText(/Decreasing density, no border/i)).toBeVisible();
  });

  // This section is the only thing standing between the halo and being read
  // as a fuzzy territory. Without it the encoding is just a soft edge.
  // @req REQ-116
  it("says that no source states where the presence stops", () => {
    render(<PeopleFieldExplainer distribution={distribution} />);

    expect(screen.getByText(/aucune source/i)).toBeInTheDocument();
    expect(screen.getByText(/s'arrête/)).toBeInTheDocument();
  });

  // @req REQ-116
  it("counts the countries the corpus actually declares", () => {
    render(<PeopleFieldExplainer distribution={distribution} />);

    expect(screen.getByText(/2 populations par pays/)).toBeInTheDocument();
  });

  // The legend keys the gradient; it no longer repeats the roll of countries,
  // which « Répartition géographique » prints with the share, the note, the
  // link and the source line.
  // @req REQ-116
  it("carries the legend, so the gradient can be read rather than guessed", () => {
    render(<PeopleFieldExplainer distribution={distribution} />);

    expect(screen.getByText(/bord nul/i)).toBeInTheDocument();
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });

  // @req REQ-119
  it("says nothing at all when the fiche declares no distribution", () => {
    const { container } = render(<PeopleFieldExplainer distribution={[]} />);

    expect(container.firstChild).toBeNull();
  });
});
