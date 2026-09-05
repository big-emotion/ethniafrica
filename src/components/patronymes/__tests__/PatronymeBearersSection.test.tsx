import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PatronymeBearersSection } from "@/components/patronymes/PatronymeBearersSection";
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
  alliances: [],
};

describe("PatronymeBearersSection (AC3, DEC-040, REQ-133)", () => {
  // @req REQ-133
  it("lists a bearer by id, fullName and roleCategory only", () => {
    render(
      <PatronymeBearersSection
        language="fr"
        patronyme={{
          ...base,
          bearers: [
            {
              id: "PER_1",
              fullName: "Modibo Keïta",
              roleCategory: "chef d'État",
            },
          ],
        }}
      />
    );

    expect(screen.getByText("Modibo Keïta")).toBeInTheDocument();
    expect(screen.getByText("chef d'État")).toBeInTheDocument();
  });

  // @req REQ-133
  it("always states the DEC-040 editorial policy alongside the list", () => {
    render(
      <PatronymeBearersSection
        language="fr"
        patronyme={{
          ...base,
          bearers: [
            {
              id: "PER_1",
              fullName: "Modibo Keïta",
              roleCategory: "chef d'État",
            },
          ],
        }}
      />
    );

    expect(
      screen.getByText(/ne permet de déduire l'origine ethnique/)
    ).toBeInTheDocument();
  });

  // Charter §4 asks the chapter to say it holds nothing; REQ-119 fixes *how*
  // — the shared provenance marker, so an undocumented chapter never reads as
  // a sentence the corpus wrote.
  // @req REQ-119
  it("states explicitly when no bearer is documented (atlas charter §4)", () => {
    render(<PatronymeBearersSection language="fr" patronyme={base} />);

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  // The corpus names its bearers in the dossier (displayName) rather than
  // through person records, and the fiche said "Donnée manquante" over a
  // dossier that named Soundiata Keïta.
  // @req REQ-133
  it("lists a bearer the dossier names itself when no person record exists", () => {
    render(
      <PatronymeBearersSection
        language="fr"
        patronyme={{
          ...base,
          content: {
            bearers: [{ status: "deceased", displayName: "Soundiata Keïta" }],
          },
        }}
      />
    );

    expect(screen.getByText("Soundiata Keïta")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  // @req REQ-133
  it("does not print a bearer twice when the record and the dossier both name them", () => {
    render(
      <PatronymeBearersSection
        language="fr"
        patronyme={{
          ...base,
          bearers: [
            {
              id: "PER_1",
              fullName: "Modibo Keïta",
              roleCategory: "chef d'État",
            },
          ],
          content: { bearers: [{ displayName: "Modibo Keïta" }] },
        }}
      />
    );

    expect(screen.getAllByText("Modibo Keïta")).toHaveLength(1);
  });

  // @req REQ-133
  it("falls back to a stated label when roleCategory is empty", () => {
    render(
      <PatronymeBearersSection
        language="fr"
        patronyme={{
          ...base,
          bearers: [
            { id: "PER_1", fullName: "Modibo Keïta", roleCategory: "" },
          ],
        }}
      />
    );

    expect(screen.getByText("Rôle non renseigné")).toBeInTheDocument();
  });
});
