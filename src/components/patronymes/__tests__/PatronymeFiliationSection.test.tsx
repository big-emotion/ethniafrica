import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PatronymeFiliationSection } from "@/components/patronymes/PatronymeFiliationSection";
import type { PublicPatronyme } from "@/api/v2/schemas/patronymes";

const base: PublicPatronyme = {
  id: "PAT_KEITA",
  nameMain: "Keïta",
  nameSystem: "clan_name",
  casteOrSocialFunction: null,
  content: {},
  associatedPeoples: [],
  associatedCountries: [],
  bearers: [],
};

describe("PatronymeFiliationSection (AC2, REQ-133)", () => {
  // @req REQ-133
  it("renders nothing when no filiation claim is documented", () => {
    const { container } = render(
      <PatronymeFiliationSection patronyme={base} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  // @req REQ-133
  it("presents the Keïta/Soundiata claim as claimed, alongside the competing account", () => {
    render(
      <PatronymeFiliationSection
        patronyme={{
          ...base,
          content: {
            filiationClaims: [
              {
                claim:
                  "Descendance de Soundiata Keïta, fondateur de l'empire du Mali",
                competingAccount:
                  "Une partie de l'historiographie académique conteste une filiation directe et documentée sur cette période.",
                sources: [
                  { title: "Charte du Manden", url: null, tier: "referenced" },
                ],
              },
            ],
          },
        }}
      />
    );

    expect(screen.getByText("Filiation revendiquée")).toBeInTheDocument();
    expect(
      screen.getByText(/Descendance de Soundiata Keïta/)
    ).toBeInTheDocument();
    expect(screen.getByText("Version concurrente")).toBeInTheDocument();
    expect(
      screen.getByText(/conteste une filiation directe/)
    ).toBeInTheDocument();
    expect(screen.getByText("Charte du Manden")).toBeInTheDocument();
  });

  // @req REQ-133
  it("renders a claim with no competing account without the competing-account label", () => {
    render(
      <PatronymeFiliationSection
        patronyme={{
          ...base,
          content: {
            filiationClaims: [
              { claim: "Descendance revendiquée d'un fondateur de lignage" },
            ],
          },
        }}
      />
    );

    expect(screen.queryByText("Version concurrente")).not.toBeInTheDocument();
  });
});
