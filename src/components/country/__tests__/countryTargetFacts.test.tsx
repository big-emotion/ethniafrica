import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  buildCountryAtlasFacts,
  buildCountryTargetFacts,
} from "@/components/country/countryTargetFacts";
import { buildCountryPickerTargets } from "@/lib/atlas/targets";
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

/**
 * The fiche's globe offers the whole corpus, so the panel has to answer for
 * countries the fiche says nothing about. It answers from the corpus — how
 * many peoples are documented there — and always offers the way in, because a
 * panel that names a country and then strands the reader on someone else's
 * fiche is worse than one that says nothing.
 */
describe("buildCountryAtlasFacts (REQ-117)", () => {
  const targets = buildCountryPickerTargets(["NGA", "KEN", "SSD"]);

  function facts(peopleCounts: Record<string, number> = { NGA: 5, KEN: 12 }) {
    return buildCountryAtlasFacts({
      country: countryWith([{ name: "Zoulou" }]),
      targets,
      peopleCounts,
    });
  }

  // @req REQ-117
  it("keeps the fiche's own country pointed at the reading below, not at a reload", () => {
    render(<>{facts().NGA?.body}</>);

    expect(
      screen.getByRole("link", { name: /Lire la fiche complète/ })
    ).toHaveAttribute("href", "#fiche");
  });

  // @req REQ-117
  it("sends another country to its own fiche", () => {
    render(<>{facts().KEN?.body}</>);

    expect(
      screen.getByRole("link", { name: /Lire la fiche complète/ })
    ).toHaveAttribute("href", "/fr/pays/KEN");
  });

  // @req REQ-117
  it("names a country the way the picker that offered it does", () => {
    expect(facts().KEN?.title).toBe("Kenya");
    expect(facts().SSD?.title).toBe("Soudan du Sud");
  });

  // @req REQ-117
  it("counts documented peoples rather than a population", () => {
    expect(facts().KEN?.description).toBe("12 peuples documentés");
  });

  // A zero here means the corpus is silent, not that a country is empty.
  // @req REQ-117
  it("reads an absent count as corpus silence rather than as none", () => {
    render(<>{facts({}).KEN?.body}</>);

    expect(
      screen.getByText(/Aucun peuple rattaché à ce pays dans le corpus/)
    ).toBeInTheDocument();
  });
});

/**
 * The mockup's panel names where the country is. What shipped named the
 * doctrine instead — "frontiere publiee, tracee a l'apparition" — which says
 * why the line may close, not which country closed it. The charter already
 * carries the doctrine; the panel carries the place.
 */
describe("what the panel's subtitle states", () => {
  const targets = buildCountryPickerTargets(["NGA"]);

  // @req REQ-117
  it("locates the fiche's own country rather than restating the charter", () => {
    const facts = buildCountryAtlasFacts({
      country: countryWith([{ name: "Yoruba" }]),
      targets,
      peopleCounts: { NGA: 3 },
    });

    expect(facts.NGA?.description).toMatch(
      /^NGA · \d+[.,]\d° [NS] · \d+[.,]\d° [EO]$/
    );
  });
});
