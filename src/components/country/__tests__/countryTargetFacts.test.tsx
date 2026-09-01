import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  buildCountryAtlasFacts,
  buildCountryTargetFacts,
} from "@/components/country/countryTargetFacts";
import { buildCountryPickerTargets } from "@/lib/atlas/targets";
import { deriveCountrySynthesis } from "@/lib/home/countrySynthesis";
import type { Country } from "@/types/afrik";
import type { CountryDetail } from "@/types/afrik-frontend";
import { getCountryRoute } from "@/lib/routing";

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
  // The label says whose count it is. Two surfaces counted this country
  // differently - the fiche's declared list and the corpus join table - and an
  // unqualified "au corpus" made them read as one number contradicting itself.
  // @req REQ-117
  it("names the country and counts the peoples its own fiche declares", () => {
    const facts = buildCountryTargetFacts(
      countryWith([{ name: "Yoruba" }, { name: "Igbo" }, { name: "Haoussa" }])
    );

    expect(facts.NGA?.title).toBe("Nigéria");
    render(<>{facts.NGA?.body}</>);
    expect(
      screen.getByText("Peuples déclarés par la fiche")
    ).toBeInTheDocument();
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

  // Some older fiches keep their declared peoples in `majorPeoples` while
  // carrying an empty modern demographics array. The empty array must not
  // erase the populated legacy field.
  // @req REQ-117
  it("falls back to legacy major peoples when demographics is empty", () => {
    const country = countryWith([]);
    country.majorPeoples = [{ name: "Yoruba" }, { name: "Igbo" }];

    const facts = buildCountryTargetFacts(country);

    render(<>{facts.NGA?.body}</>);
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText(/Yoruba · Igbo/)).toBeVisible();
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

  function facts(
    peopleCounts: Record<string, number> = { NGA: 5, KEN: 12 },
    countryBriefs = {}
  ) {
    return buildCountryAtlasFacts({
      country: countryWith([{ name: "Zoulou" }]),
      targets,
      peopleCounts,
      countryBriefs,
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
    ).toHaveAttribute("href", getCountryRoute("fr", "KEN"));
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
    const kenya = facts({}).KEN;
    render(<>{kenya?.body}</>);

    expect(
      screen.getByText(/Aucun peuple rattaché à ce pays dans le corpus/)
    ).toBeInTheDocument();
    expect(kenya?.description).not.toContain("0 peuple");
    expect(kenya?.description).toMatch(/^KEN ·/);
  });

  // @req REQ-117
  it("shows the selected country's formatted population, reference year, and principal languages", () => {
    render(
      <>
        {
          facts(undefined, {
            KEN: {
              population: 55_339_003,
              referenceYear: 2025,
              languages: ["swahili", "anglais", "kikuyu"],
            },
          }).KEN?.body
        }
      </>
    );

    expect(screen.getByText("Population · réf. 2025")).toBeInTheDocument();
    expect(screen.getByText(/55[\s\u202f]339[\s\u202f]003/)).toBeVisible();
    expect(screen.getByText("Langues principales")).toBeInTheDocument();
    expect(screen.getByText("swahili · anglais · kikuyu")).toBeVisible();
  });

  // @req REQ-117
  it("deduplicates principal languages and shows at most three", () => {
    render(
      <>
        {
          facts(undefined, {
            KEN: {
              languages: ["swahili", "anglais", "swahili", "kikuyu", "luo"],
            },
          }).KEN?.body
        }
      </>
    );

    expect(screen.getByText("swahili · anglais · kikuyu")).toBeVisible();
    expect(screen.queryByText(/luo/)).toBeNull();
  });

  // The shared synthesis derives languages from major peoples when the
  // country-level culture list is silent; the panel must display that same
  // corpus-backed fallback rather than grow its own derivation.
  // @req REQ-117
  it("shows the shared major-people language fallback", () => {
    const synthesis = deriveCountrySynthesis({
      id: "KEN",
      nameFr: "Kenya",
      content: {
        culture: {},
        majorPeoples: [
          { name: "Kikuyu", languages: ["kikuyu", "swahili"] },
          { name: "Luo", languages: ["luo", "swahili"] },
        ],
      },
    } as Country);

    render(
      <>
        {
          facts(undefined, {
            KEN: { languages: synthesis.languages },
          }).KEN?.body
        }
      </>
    );

    expect(screen.getByText("kikuyu · swahili · luo")).toBeVisible();
  });

  // @req REQ-117
  it("omits unavailable brief rows without invented values", () => {
    render(
      <>
        {
          facts(undefined, {
            KEN: { languages: ["swahili"] },
          }).KEN?.body
        }
      </>
    );

    expect(screen.queryByText(/Population/)).toBeNull();
    expect(screen.getByText("Langues principales")).toBeVisible();
    expect(screen.getByText("swahili")).toBeVisible();
    expect(screen.queryByText("0")).toBeNull();
    expect(screen.queryByText(/undefined/)).toBeNull();
  });

  // A population without a valid reference year is not a dated fact. The
  // panel omits the pair instead of presenting an apparently current value.
  // @req REQ-117
  it.each([undefined, 0, 2025.5])(
    "omits population when its reference year is %s",
    (referenceYear) => {
      render(
        <>
          {
            facts(undefined, {
              KEN: {
                population: 55_339_003,
                referenceYear,
                languages: ["swahili"],
              },
            }).KEN?.body
          }
        </>
      );

      expect(screen.queryByText(/Population/)).toBeNull();
      expect(screen.getByText("swahili")).toBeVisible();
    }
  );

  // @req REQ-117
  it("shows the same brief fields for the fiche country and another country", () => {
    const atlasFacts = facts(undefined, {
      NGA: {
        population: 237_527_782,
        referenceYear: 2025,
        languages: ["haoussa", "yoruba", "igbo"],
      },
      KEN: {
        population: 55_339_003,
        referenceYear: 2025,
        languages: ["swahili", "anglais", "kikuyu"],
      },
    });
    const { rerender } = render(<>{atlasFacts.NGA?.body}</>);

    expect(screen.getByText("Population · réf. 2025")).toBeVisible();
    expect(screen.getByText("Langues principales")).toBeVisible();

    rerender(<>{atlasFacts.KEN?.body}</>);
    expect(screen.getByText("Population · réf. 2025")).toBeVisible();
    expect(screen.getByText("Langues principales")).toBeVisible();
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
      countryBriefs: {},
    });

    expect(facts.NGA?.description).toMatch(
      /^NGA · \d+[.,]\d° [NS] · \d+[.,]\d° [EO]$/
    );
  });
});

/**
 * Two things the mockup's panel head and body carry that the shipped one did
 * not: the country's flag, and a chip saying where the panel's own numbers come
 * from. The second matters more than it looks — the fiche's own country is
 * answered from what the fiche declares, every other country from the corpus's
 * join table, and those count different things. Left unlabelled they read as
 * one number disagreeing with itself.
 */
describe("what the panel shows it is", () => {
  const targets = buildCountryPickerTargets(["NGA", "KEN"]);

  function facts() {
    return buildCountryAtlasFacts({
      country: countryWith([{ name: "Yoruba" }]),
      targets,
      peopleCounts: { NGA: 3, KEN: 12 },
      countryBriefs: {},
    });
  }

  // @req REQ-117
  it("flies the country's flag beside its name", () => {
    expect(facts().NGA?.icon).toBeTruthy();

    render(<>{facts().NGA?.icon}</>);
    expect(screen.getByText("🇳🇬")).toBeInTheDocument();
  });

  // @req REQ-117
  it("says the fiche's own figures are the fiche's own", () => {
    render(<>{facts().NGA?.body}</>);

    expect(screen.getByText(/Peuples déclarés par la fiche/)).toBeVisible();
    expect(screen.getByText(/Fiche rédigée/)).toBeVisible();
  });

  // @req REQ-117
  it("says another country's figures are derived, not declared", () => {
    render(<>{facts().KEN?.body}</>);

    expect(
      screen.getByText(/Présence dérivée des fiches peuple/)
    ).toBeVisible();
  });
});
