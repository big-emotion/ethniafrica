import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PatronymeOriginSection } from "@/components/patronymes/PatronymeOriginSection";
import type { PublicPatronyme } from "@/api/v2/schemas/patronymes";

const base: PublicPatronyme = {
  id: "PAT_KEITA",
  nameMain: "Keïta",
  nameSystem: "totemic_clan",
  casteOrSocialFunction: null,
  content: {},
  associatedPeoples: [],
  associatedCountries: [],
  bearers: [],
};

describe("PatronymeOriginSection (REQ-133)", () => {
  // @req REQ-133
  it("renders nothing when the corpus documents no origin", () => {
    const { container } = render(<PatronymeOriginSection patronyme={base} />);
    expect(container).toBeEmptyDOMElement();
  });

  // @req REQ-133
  it("states a griot oral-tradition origin, attributed to its griot", () => {
    render(
      <PatronymeOriginSection
        patronyme={{
          ...base,
          content: {
            origin: {
              originType: "griot_oral_tradition",
              sources: [
                {
                  title: "Récit de Fadama Diarra",
                  url: null,
                  tier: "unverified",
                },
              ],
              griot: "Fadama Diarra",
            },
          },
        }}
      />
    );

    expect(screen.getByText(/tradition orale griotique/)).toBeInTheDocument();
    expect(
      screen.getByText(/Transmis par\s+Fadama Diarra/)
    ).toBeInTheDocument();
    expect(screen.getByText("Récit de Fadama Diarra")).toBeInTheDocument();
  });

  // @req REQ-133
  it("states a written-chronicle origin without the griot wording", () => {
    render(
      <PatronymeOriginSection
        patronyme={{
          ...base,
          content: {
            origin: {
              originType: "written_chronicle",
              sources: [
                { title: "Tarikh es-Soudan", url: null, tier: "referenced" },
              ],
            },
          },
        }}
      />
    );

    expect(screen.getByText("Chronique écrite")).toBeInTheDocument();
    expect(
      screen.queryByText(/tradition orale griotique/)
    ).not.toBeInTheDocument();
  });
});
