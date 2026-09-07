import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PatronymeAssociationsSection } from "@/components/patronymes/PatronymeAssociationsSection";
import type { PublicPatronyme } from "@/api/v2/schemas/patronymes";
import { getCountryRoute, getPeopleRoute } from "@/lib/routing";

const base: PublicPatronyme = {
  id: "PAT_KEITA",
  nameMain: "Keïta",
  nameSystem: "clan_name",
  casteOrSocialFunction: null,
  content: {},
  associatedPeoples: [
    {
      id: "PPL_MANDINKA",
      nameMain: "Mandingues",
      autonym: "Mandenka",
      slug: "PPL_MANDINKA",
    },
  ],
  associatedCountries: [{ id: "MLI", nameFr: "Mali" }],
  bearers: [],
  alliances: [],
};

describe("PatronymeAssociationsSection (AC4, REQ-133)", () => {
  // @req REQ-133
  it("links each associated people and country", () => {
    render(<PatronymeAssociationsSection language="fr" patronyme={base} />);

    expect(screen.getByRole("link", { name: /Mandingues/ })).toHaveAttribute(
      "href",
      getPeopleRoute("fr", "PPL_MANDINKA")
    );
    expect(screen.getByRole("link", { name: /Mali/ })).toHaveAttribute(
      "href",
      getCountryRoute("fr", "MLI")
    );
  });

  // @req REQ-133
  it("shows the non-hereditary guidance note only for that system", () => {
    render(
      <PatronymeAssociationsSection
        language="fr"
        patronyme={{ ...base, nameSystem: "non_hereditary_patronymic" }}
      />
    );

    expect(
      screen.getByText(/n'est pas transmis de façon héréditaire/)
    ).toBeInTheDocument();
  });

  // @req REQ-133
  it("omits the non-hereditary guidance note for other systems", () => {
    render(<PatronymeAssociationsSection language="fr" patronyme={base} />);

    expect(
      screen.queryByText(/n'est pas transmis de façon héréditaire/)
    ).not.toBeInTheDocument();
  });

  // The silence is now marked the way every other fiche marks one — a
  // provenance badge, not a sentence of the section's own — so a reader tells
  // "the corpus has not documented this" apart from "the corpus wrote this".
  // @req REQ-119
  it("states explicitly when no association is documented", () => {
    render(
      <PatronymeAssociationsSection
        language="fr"
        patronyme={{ ...base, associatedPeoples: [], associatedCountries: [] }}
      />
    );

    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
