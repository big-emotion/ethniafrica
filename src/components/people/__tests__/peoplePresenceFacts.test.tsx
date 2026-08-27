import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { buildPeoplePresenceFacts } from "@/components/people/peoplePresenceFacts";
import type { GlobalDemographySection } from "@/types/afrik";

const yoruba: GlobalDemographySection = {
  totalPopulation: 48482000,
  referenceYear: 2025,
  distributionByCountry: [
    { country: "NGA", population: 45500000 },
    { country: "BEN", population: 1800000 },
  ],
};

const single: GlobalDemographySection = {
  totalPopulation: 45500000,
  referenceYear: 2025,
  distributionByCountry: [{ country: "NGA", population: 45500000 }],
};

describe("buildPeoplePresenceFacts (REQ-117)", () => {
  // @req REQ-117
  it("titles the panel with the people and the country, not an ISO code", () => {
    const facts = buildPeoplePresenceFacts({
      peopleName: "Yoruba",
      peopleId: "PPL_YORUBA",
      demography: yoruba,
    });

    expect(facts.NGA?.title).toBe("Yoruba au Nigeria");
    expect(facts.NGA?.description).toMatch(/sans tracé de limite/);
  });

  /**
   * "au" was hard-coded, so every feminine or vowel-initial country read as
   * broken French on the fiche of every people present there — "Aari au
   * Éthiopie" on PPL_AARI, whose one presence country it is. The corpus
   * reaches all 54, so the title cannot assume one gender.
   */
  // @req REQ-117
  it("agrees the preposition with the country it names", () => {
    const titleFor = (country: string, population: number) =>
      buildPeoplePresenceFacts({
        peopleName: "Aari",
        peopleId: "PPL_AARI",
        demography: {
          totalPopulation: population,
          referenceYear: 2025,
          distributionByCountry: [{ country, population }],
        },
      })[country]?.title;

    // Vowel-initial, and feminine: both take "en".
    expect(titleFor("ETH", 300000)).toBe("Aari en Éthiopie");
    expect(titleFor("AGO", 100)).toBe("Aari en Angola");
    // Masculine and consonant-initial keeps "au".
    expect(titleFor("TGO", 100)).toBe("Aari au Togo");
    // Masculine despite the final -e, so still "au".
    expect(titleFor("ZWE", 100)).toBe("Aari au Zimbabwe");
    // Feminine and consonant-initial: the one case no spelling rule reaches.
    expect(titleFor("NAM", 100)).toBe("Aari en Namibie");
    // Plural takes "aux".
    expect(titleFor("COM", 100)).toBe("Aari aux Comores");
    // A name that takes no article at all takes "à".
    expect(titleFor("MDG", 100)).toBe("Aari à Madagascar");
  });

  // @req REQ-117
  it("gives the declared population and the share of the whole people", () => {
    const facts = buildPeoplePresenceFacts({
      peopleName: "Yoruba",
      peopleId: "PPL_YORUBA",
      demography: yoruba,
    });
    render(<>{facts.BEN?.body}</>);

    expect(screen.getByText(/Population déclarée/)).toBeInTheDocument();
    expect(screen.getByText(/1\s*800\s*000/)).toBeInTheDocument();
    // 1 800 000 of 48 482 000 — the figure has to be derived, never authored.
    expect(screen.getByText(/3,7\s*%/)).toBeInTheDocument();
  });

  // The reference year is what makes a population figure a claim rather than
  // a number. An implicit "now" ages badly and silently.
  // @req REQ-117
  it("carries the demography's own reference year, never an implicit one", () => {
    const facts = buildPeoplePresenceFacts({
      peopleName: "Yoruba",
      peopleId: "PPL_YORUBA",
      demography: yoruba,
    });
    render(<>{facts.NGA?.body}</>);

    expect(screen.getByText(/2025/)).toBeInTheDocument();
  });

  // @req REQ-116
  it("says what the halo means, so it is not read as a territory", () => {
    const facts = buildPeoplePresenceFacts({
      peopleName: "Yoruba",
      peopleId: "PPL_YORUBA",
      demography: yoruba,
    });
    render(<>{facts.NGA?.body}</>);

    expect(screen.getByText(/Ce que le halo dit/)).toBeInTheDocument();
    expect(screen.getByText(/bord vaut zéro/i)).toBeInTheDocument();
  });

  // A share that is always 100 % informs of nothing and invites a comparison
  // that does not exist. 394 of 789 fiches are in exactly this state.
  // @req REQ-117
  it("drops the share entirely for a people confined to one country", () => {
    const facts = buildPeoplePresenceFacts({
      peopleName: "Yoruba",
      peopleId: "PPL_YORUBA",
      demography: single,
    });
    render(<>{facts.NGA?.body}</>);

    expect(screen.getByText(/Population déclarée/)).toBeInTheDocument();
    expect(screen.queryByText(/Part de l.ensemble/)).not.toBeInTheDocument();
  });

  // @req REQ-117
  it("anchors the way out on the fiche's own record section, not the top of the page", () => {
    const facts = buildPeoplePresenceFacts({
      peopleName: "Yoruba",
      peopleId: "PPL_YORUBA",
      demography: yoruba,
    });
    render(<>{facts.NGA?.body}</>);

    const link = screen.getByRole("link", { name: /Lire la fiche complète/ });
    expect(link.getAttribute("href")).toMatch(/^#.+/);
    expect(link.getAttribute("href")).not.toBe("#");
  });

  // @req REQ-119
  it("says nothing at all when the fiche declares no distribution", () => {
    expect(
      buildPeoplePresenceFacts({
        peopleName: "Yoruba",
        peopleId: "PPL_YORUBA",
        demography: undefined,
      })
    ).toEqual({});
  });
});
