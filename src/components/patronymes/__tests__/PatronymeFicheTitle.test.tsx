import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PatronymeFicheTitle } from "@/components/patronymes/PatronymeFicheTitle";
import type { PublicPatronyme } from "@/api/v2/schemas/patronymes";

const patronyme: PublicPatronyme = {
  id: "PAT_KEITA",
  nameMain: "Keïta",
  nameSystem: "clan_name",
  casteOrSocialFunction: null,
  content: {},
  associatedPeoples: [],
  associatedCountries: [],
  bearers: [],
  alliances: [],
};

describe("PatronymeFicheTitle (REQ-133)", () => {
  // @req REQ-133
  it("opens on the eyebrow and the name", () => {
    render(<PatronymeFicheTitle patronyme={patronyme} />);

    // « Nom », not « Patronyme »: DEC-038 gives the reader the word a
    // francophone types and keeps `patronyme` for the code.
    expect(screen.getByText("Nom")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Keïta" })).toBeInTheDocument();
  });

  // @req REQ-133
  it("states the naming system in the header (AC1)", () => {
    render(<PatronymeFicheTitle patronyme={patronyme} />);

    expect(screen.getByText(/Nom de clan/)).toBeInTheDocument();
  });

  // @req REQ-133
  it("states a different naming system for a different fiche", () => {
    render(
      <PatronymeFicheTitle
        patronyme={{ ...patronyme, nameSystem: "non_hereditary_patronymic" }}
      />
    );

    expect(screen.getByText(/Patronyme non héréditaire/)).toBeInTheDocument();
  });
});
