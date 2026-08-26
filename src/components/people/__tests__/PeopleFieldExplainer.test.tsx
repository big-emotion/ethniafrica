import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PeopleFieldExplainer } from "@/components/people/PeopleFieldExplainer";

const distribution = [
  { country: "NGA", population: 45500000 },
  { country: "BEN", population: 1800000 },
];

describe("PeopleFieldExplainer (REQ-116)", () => {
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

  // @req REQ-116
  it("carries the legend, so the gradient can be read rather than guessed", () => {
    render(<PeopleFieldExplainer distribution={distribution} />);

    expect(screen.getByText(/bord nul/i)).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  // @req REQ-119
  it("says nothing at all when the fiche declares no distribution", () => {
    const { container } = render(<PeopleFieldExplainer distribution={[]} />);

    expect(container.firstChild).toBeNull();
  });
});
