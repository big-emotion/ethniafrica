import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { buildCountryTargetFacts } from "@/components/country/countryTargetFacts";
import type { CountryDetail } from "@/types/afrik-frontend";

/**
 * The country globe's panel.
 *
 * The family and people fiches have fed their globe facts since the shell
 * shipped; the country route passed none, so its panel fell back to naming the
 * country and nothing else. What the mockup puts there is a count and the
 * first entries — and, when the corpus attaches no people to the country, a
 * sentence saying so rather than a bare zero.
 */

function countryWith(peoples: { name: string }[] | undefined): CountryDetail {
  return {
    id: "NGA",
    nameFr: "République fédérale du Nigéria",
    nameCommonFr: "Nigéria",
    demographics: peoples ? { peoples } : undefined,
  } as CountryDetail;
}

describe("country target facts", () => {
  // @req REQ-117
  it("names the country and counts the peoples the corpus attaches to it", () => {
    const facts = buildCountryTargetFacts(
      countryWith([{ name: "Yoruba" }, { name: "Igbo" }, { name: "Haoussa" }])
    );

    expect(facts.NGA?.title).toBe("Nigéria");
    render(<>{facts.NGA?.body}</>);
    expect(screen.getByText("Peuples au corpus")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  // @req REQ-117
  it("lists the first entries, and says it is showing only the first", () => {
    const facts = buildCountryTargetFacts(
      countryWith(
        Array.from({ length: 9 }, (_, index) => ({ name: `Peuple ${index}` }))
      )
    );

    render(<>{facts.NGA?.body}</>);
    expect(screen.getByText("Premières entrées")).toBeInTheDocument();
    expect(screen.getByText(/Peuple 0/)).toBeInTheDocument();
    // The panel is a pointer into the fiche, not a second listing of it.
    expect(screen.queryByText(/Peuple 8/)).toBeNull();
  });

  // A zero would read as a fact about the country. It is a fact about the
  // corpus, and the panel has to say which.
  // @req REQ-117
  it("says the corpus is empty rather than showing a bare zero", () => {
    const facts = buildCountryTargetFacts(countryWith(undefined));

    render(<>{facts.NGA?.body}</>);
    expect(
      screen.getByText("Aucun peuple rattaché à ce pays dans le corpus.")
    ).toBeInTheDocument();
    expect(screen.queryByText("Premières entrées")).toBeNull();
  });

  // AtlasGlobe is a client component and the route that calls this is a
  // server one. A resolver function cannot cross that boundary — passing one
  // is what put every family route on HTTP 500 once already.
  // @req REQ-117
  it("returns data, never a resolver", () => {
    const facts = buildCountryTargetFacts(countryWith([{ name: "Yoruba" }]));

    expect(typeof facts).toBe("object");
    expect(typeof facts.NGA).toBe("object");
  });
});
