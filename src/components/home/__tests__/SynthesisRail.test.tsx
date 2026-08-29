import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SynthesisRail } from "@/components/home/SynthesisRail";
import { RAIL_SIZE } from "@/lib/home/synthesisRailData";
import type { CountrySynthesis } from "@/lib/home/countrySynthesis";

function synthesis(id: string, nameFr: string): CountrySynthesis {
  return {
    id,
    nameFr,
    summary: `Chapeau de ${nameFr}.`,
    formerNames: [],
    peoples: [{ name: "Peuple test", peopleId: "PPL_TEST" }],
    kingdoms: [],
    languages: ["français"],
  };
}

const DRAWN = [
  synthesis("BDI", "Burundi"),
  synthesis("BFA", "Burkina Faso"),
  synthesis("CAF", "République centrafricaine"),
];

/**
 * The band showed four cards in a track wider than the page, so it needed a
 * horizontal scroll and two arrows to reach the fourth. Three cards fit the
 * same width whole: nothing is out of view, so nothing has to page it in.
 */
describe("SynthesisRail — three countries, all of them visible", () => {
  // @req REQ-113
  it("draws exactly the three countries it was given", () => {
    render(<SynthesisRail language="fr" syntheses={DRAWN} />);

    expect(screen.getAllByTestId("country-synthesis-card")).toHaveLength(3);
  });

  // @req REQ-113
  it("offers no pagination control, having nothing to page to", () => {
    render(<SynthesisRail language="fr" syntheses={DRAWN} />);

    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  // The whole band is one server-rendered grid now. A client boundary here
  // would buy hydration for a section that no longer reacts to anything.
  // @req REQ-113
  it("lays the cards out without an overflowing track", () => {
    const { container } = render(
      <SynthesisRail language="fr" syntheses={DRAWN} />
    );
    // Every card ships its own <style>, so read the band's rules as a whole.
    const styles = Array.from(container.querySelectorAll("style"))
      .map((sheet) => sheet.textContent ?? "")
      .join("\n");

    expect(styles).not.toContain("overflow-x");
    expect(styles).not.toContain("scroll-snap");
    expect(styles).toMatch(/\.home-syn-track\s*\{[^}]*display:\s*grid/);
  });

  // @req REQ-113
  it("announces the same count of countries as the rail draws", () => {
    render(<SynthesisRail language="fr" syntheses={DRAWN} />);

    expect(RAIL_SIZE).toBe(3);
    expect(
      screen.getByRole("heading", { level: 2, name: /^Trois pays/ })
    ).toBeInTheDocument();
  });

  // @req REQ-113
  it("renders nothing when the corpus gave the rail no country", () => {
    const { container } = render(
      <SynthesisRail language="fr" syntheses={[]} />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
