import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CountryAttestedNamesSection } from "@/components/patronymes/CountryAttestedNamesSection";
import { translations } from "@/lib/translations";

const copy = translations.fr.patronymes.onFiche;

const KEITA = {
  id: "PAT_KEITA",
  nameMain: "Keïta",
  nameSystem: "clan_name" as const,
};

const MAGHRAWA = {
  id: "PAT_MAGHRAWA",
  nameMain: "Maghrawa",
  nameSystem: "nisba" as const,
  viaPeoples: [{ id: "PPL_ZENATA", nameMain: "Zénètes" }],
};

/** The chapter's own element, so a query cannot stray into a neighbour. */
function chapter(title: string): HTMLElement {
  const found = document.querySelector(`[data-fiche-section="${title}"]`);
  if (!found) throw new Error(`No chapter titled ${title}`);
  return found as HTMLElement;
}

describe("CountryAttestedNamesSection", () => {
  // @req REQ-133
  it("heads the attested names and the reach as two separate lists", () => {
    render(
      <CountryAttestedNamesSection
        language="fr"
        patronymes={{ attested: [KEITA], borneByPeoples: [MAGHRAWA] }}
      />
    );

    const attested = screen.getByText(copy.attestedLabel);
    const reach = screen.getByText(copy.reachLabel);
    expect(attested).toBeInTheDocument();
    expect(reach).toBeInTheDocument();

    // Never one list summing the two: what a source attests here and where
    // the bearers live are different claims, and the second must not be
    // published under the first's heading.
    const attestedNames = attested.nextElementSibling as HTMLElement;
    const reachNames = reach.nextElementSibling as HTMLElement;
    expect(
      within(attestedNames).getByRole("link", { name: "Keïta" })
    ).toBeInTheDocument();
    expect(
      within(reachNames).getByRole("link", { name: /Maghrawa/ })
    ).toBeInTheDocument();
    expect(
      within(attestedNames).queryByText(/Maghrawa/)
    ).not.toBeInTheDocument();
  });

  // @req REQ-133
  it("names the peoples a reach entry travels through", () => {
    render(
      <CountryAttestedNamesSection
        language="fr"
        patronymes={{ attested: [], borneByPeoples: [MAGHRAWA] }}
      />
    );

    // Without the bearing people the entry is an assertion the reader has no
    // way to audit, and reads as an attestation the corpus never made.
    expect(screen.getByText(/Zénètes/)).toBeInTheDocument();
  });

  // @req REQ-133
  it("renders the attested list alone when the people route adds nothing", () => {
    render(
      <CountryAttestedNamesSection
        language="fr"
        patronymes={{ attested: [KEITA], borneByPeoples: [] }}
      />
    );

    expect(screen.getByText(copy.attestedLabel)).toBeInTheDocument();
    expect(screen.queryByText(copy.reachLabel)).not.toBeInTheDocument();
  });

  // @req REQ-133
  it("states the gap when neither route reaches a name", () => {
    render(
      <CountryAttestedNamesSection
        language="fr"
        patronymes={{ attested: [], borneByPeoples: [] }}
      />
    );

    expect(chapter(copy.countryTitle)).toBeInTheDocument();
    expect(screen.getByText(copy.countryEmpty)).toBeInTheDocument();
  });

  // @req REQ-133
  it("separates a failed read from a corpus that holds nothing", () => {
    render(<CountryAttestedNamesSection language="fr" patronymes={null} />);

    expect(screen.getByText(copy.countryUnavailable)).toBeInTheDocument();
    expect(screen.queryByText(copy.countryEmpty)).not.toBeInTheDocument();
  });
});
