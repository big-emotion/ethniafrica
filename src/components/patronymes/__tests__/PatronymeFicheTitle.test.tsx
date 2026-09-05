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
    render(<PatronymeFicheTitle patronyme={patronyme} language="fr" />);

    // « Nom », not « Patronyme »: DEC-038 gives the reader the word a
    // francophone types and keeps `patronyme` for the code.
    expect(screen.getByText("Nom")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Keïta" })).toBeInTheDocument();
  });

  // @req REQ-133
  it("states the naming system in the header (AC1)", () => {
    render(<PatronymeFicheTitle patronyme={patronyme} language="fr" />);

    expect(screen.getByText(/Nom de clan/)).toBeInTheDocument();
  });

  // @req REQ-133
  it("states a different naming system for a different fiche", () => {
    render(
      <PatronymeFicheTitle
        patronyme={{ ...patronyme, nameSystem: "non_hereditary_patronymic" }}
        language="fr"
      />
    );

    expect(screen.getByText(/Patronyme non héréditaire/)).toBeInTheDocument();
  });

  // @req REQ-140
  it("states the eyebrow and the naming system in the locale it is given", () => {
    render(<PatronymeFicheTitle patronyme={patronyme} language="en" />);

    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText(/Clan name/)).toBeInTheDocument();
  });
});

/**
 * The head states what the fiche rests on (ETNI-1865, REQ-147): the tier of
 * its best citation, how many citations there are, and — on its own axis —
 * how many of those a machine wrote. No percentage: DEC-050 rules that a name
 * has no confidence row to compute one from.
 */
describe("PatronymeFicheTitle standing (REQ-147)", () => {
  const citing = (sources: unknown[]): PublicPatronyme => ({
    ...patronyme,
    content: { sources },
  });

  // @req REQ-147
  it("states the best tier cited and how many sources back the fiche", () => {
    render(
      <PatronymeFicheTitle
        patronyme={citing([
          { title: "Ethnologue", tier: "official" },
          { title: "Camara 1976", tier: "referenced" },
          { title: "Niane 1960", tier: "referenced" },
          { title: "Cissé 1988", tier: "referenced" },
          { title: "Forum de généalogie", tier: "unverified" },
          { title: "Carnet de voyage", tier: "unverified" },
        ])}
      />
    );

    expect(screen.getByText("Officielle")).toHaveAttribute(
      "data-tier",
      "official"
    );
    expect(screen.getByText(/6 sources citées/)).toBeInTheDocument();
    expect(screen.queryByText(/intelligence artificielle/)).toBeNull();
    expect(screen.queryByText(/en cours de constitution/)).toBeNull();
  });

  // @req REQ-147
  it("marks a lone machine-written source and says the fiche is being assembled", () => {
    render(
      <PatronymeFicheTitle
        patronyme={citing([
          {
            title: "Synthèse",
            tier: "unverified",
            source_kind: "ai_generated",
          },
        ])}
      />
    );

    expect(screen.getByText("Non vérifiée")).toHaveAttribute(
      "data-tier",
      "unverified"
    );
    expect(
      screen.getByText(
        /1 source citée, dont une rédigée par une intelligence artificielle/
      )
    ).toBeInTheDocument();
    expect(screen.getByText(/en cours de constitution/)).toBeInTheDocument();
  });

  // @req REQ-147
  it("counts the machine-written share without lowering the tier", () => {
    render(
      <PatronymeFicheTitle
        patronyme={citing([
          { title: "Camara 1976", tier: "referenced" },
          { title: "Note A", tier: "unverified", source_kind: "ai_generated" },
          { title: "Note B", tier: "unverified", source_kind: "ai_generated" },
          { title: "Note C", tier: "unverified", source_kind: "ai_generated" },
        ])}
      />
    );

    expect(screen.getByText("Référencée")).toBeInTheDocument();
    expect(
      screen.getByText(
        /4 sources citées, dont 3 rédigées par une intelligence artificielle/
      )
    ).toBeInTheDocument();
  });

  // @req REQ-147
  it("asserts no tier when the dossier cites nothing readable", () => {
    render(<PatronymeFicheTitle patronyme={patronyme} />);

    expect(screen.getByText(/en cours de constitution/)).toBeInTheDocument();
    expect(screen.queryByText("Officielle")).toBeNull();
    expect(screen.queryByText("Référencée")).toBeNull();
    expect(screen.queryByText("Non vérifiée")).toBeNull();
  });
});
