import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CountryAttestedNamesSection } from "@/components/patronymes/CountryAttestedNamesSection";
import { PeopleBorneNamesSection } from "@/components/patronymes/PeopleBorneNamesSection";
import { getPatronymeRoute } from "@/lib/routing";
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

describe("PeopleBorneNamesSection", () => {
  // @req REQ-133
  it("links each name it lists to the name's own fiche", () => {
    render(<PeopleBorneNamesSection language="fr" patronymes={[KEITA]} />);

    const link = screen.getByRole("link", { name: /Keïta/ });
    expect(link).toHaveAttribute("href", getPatronymeRoute("fr", "PAT_KEITA"));
  });

  // @req REQ-133
  it("glosses a name with the naming system it belongs to", () => {
    render(<PeopleBorneNamesSection language="fr" patronymes={[KEITA]} />);

    expect(screen.getByText(/Nom de clan/)).toBeInTheDocument();
  });

  // @req REQ-133
  it("states the gap instead of dropping the chapter when no name is attached", () => {
    render(<PeopleBorneNamesSection language="fr" patronymes={[]} />);

    // The chapter has to survive: 13 peoples out of some 800 carry a name,
    // so a chapter that vanished would make the ordinary state of the corpus
    // indistinguishable from a dimension the fiche does not have.
    expect(chapter(copy.peopleTitle)).toBeInTheDocument();
    expect(screen.getByText(copy.peopleEmpty)).toBeInTheDocument();
  });

  // @req REQ-133
  it("separates a failed read from a corpus that holds nothing", () => {
    render(<PeopleBorneNamesSection language="fr" patronymes={null} />);

    expect(screen.getByText(copy.peopleUnavailable)).toBeInTheDocument();
    expect(screen.queryByText(copy.peopleEmpty)).not.toBeInTheDocument();
  });
});

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
    expect(within(attestedNames).getByRole("link")).toHaveTextContent("Keïta");
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
