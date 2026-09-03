import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PatronymeNamingSystemSection } from "@/components/patronymes/PatronymeNamingSystemSection";
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

describe("PatronymeNamingSystemSection (AC1, REQ-133)", () => {
  // @req REQ-133
  it("renders the shared fields when present", () => {
    render(
      <PatronymeNamingSystemSection
        patronyme={{
          ...base,
          content: {
            spellings: [
              {
                spelling: "Keita",
                attestations: [{ countryId: "MLI", sourceRefs: ["s1"] }],
              },
            ],
            transmissionMode: "patrilineal",
            designatedSocialUnit: "clan",
          },
        }}
      />
    );

    expect(screen.getByText("Keita")).toBeInTheDocument();
    expect(screen.getByText(/attestée en\s+MLI/)).toBeInTheDocument();
    expect(screen.getByText("Patrilinéaire")).toBeInTheDocument();
    expect(screen.getByText("Clan")).toBeInTheDocument();
  });

  // @req REQ-133
  it("names a non-hereditary transmission instead of blanking it", () => {
    render(
      <PatronymeNamingSystemSection
        patronyme={{
          ...base,
          nameSystem: "non_hereditary_patronymic",
          content: { transmissionMode: "non_hereditary" },
        }}
      />
    );

    // Written by 4 dossiers and absent from the allow-list, which blanked it.
    expect(screen.getByText("Non héréditaire")).toBeInTheDocument();
  });

  // @req REQ-133
  it("prints the editor's reason for a field the dossier leaves empty", () => {
    render(
      <PatronymeNamingSystemSection
        patronyme={{
          ...base,
          content: {
            gaps: [
              {
                fieldPath: "transmissionMode",
                reason:
                  "Le passage ne précise pas le mode de transmission du nom.",
              },
            ],
          },
        }}
      />
    );

    expect(
      screen.getByText(
        "Le passage ne précise pas le mode de transmission du nom."
      )
    ).toBeInTheDocument();
  });

  // @req REQ-133
  it("renders the totemic-clan subtype fields for a totemic_clan fiche", () => {
    render(
      <PatronymeNamingSystemSection
        patronyme={{
          ...base,
          nameSystem: "totemic_clan",
          content: {
            totemicFoodProhibition: "Hyène",
            permittedGivenNames: ["Aissata", "Boubou"],
          },
        }}
      />
    );

    expect(screen.getByText("Hyène")).toBeInTheDocument();
    expect(screen.getByText(/Aissata/)).toBeInTheDocument();
  });

  // @req REQ-133
  it("does not render totemic-clan fields for a nisba fiche (AC1)", () => {
    render(
      <PatronymeNamingSystemSection
        patronyme={{
          ...base,
          nameSystem: "nisba",
          content: {
            totemicFoodProhibition: "Hyène",
            nisbaSubtype: "geographic",
          },
        }}
      />
    );

    expect(screen.queryByText("Hyène")).not.toBeInTheDocument();
    expect(screen.getByText("Géographique")).toBeInTheDocument();
  });

  // @req REQ-133
  it("does not render the nisba subtype for a totemic_clan fiche (AC1)", () => {
    render(
      <PatronymeNamingSystemSection
        patronyme={{
          ...base,
          nameSystem: "totemic_clan",
          content: { nisbaSubtype: "geographic" },
        }}
      />
    );

    expect(screen.queryByText("Géographique")).not.toBeInTheDocument();
  });

  // @req REQ-133
  it("renders casteOrSocialFunction when present, regardless of system", () => {
    render(
      <PatronymeNamingSystemSection
        patronyme={{ ...base, casteOrSocialFunction: "Nyamakala" }}
      />
    );

    expect(screen.getByText("Nyamakala")).toBeInTheDocument();
  });

  // @req REQ-133
  it("renders no field list when content carries nothing", () => {
    const { container } = render(
      <PatronymeNamingSystemSection patronyme={base} />
    );

    expect(container.querySelector("dl")).not.toBeInTheDocument();
  });
});
