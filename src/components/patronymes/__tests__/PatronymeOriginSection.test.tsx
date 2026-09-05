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
  alliances: [],
};

describe("PatronymeOriginSection (REQ-133)", () => {
  // @req REQ-133
  it("keeps the chapter and marks it when the corpus documents no origin", () => {
    render(<PatronymeOriginSection patronyme={base} />);

    // It used to return null here, which removed the chapter from the page
    // and from the rail — the rail reads its entries from the rendered DOM.
    expect(
      screen.getByRole("heading", { name: "Origine" })
    ).toBeInTheDocument();
    expect(screen.getByText("Donnée manquante")).toBeInTheDocument();
  });

  // @req REQ-133
  it("prints the editor's own reason where the dossier gives one", () => {
    render(
      <PatronymeOriginSection
        patronyme={{
          ...base,
          content: {
            gaps: [
              {
                fieldPath: "origin",
                reason:
                  "Le passage ne documente aucune origine orale, écrite ou linguistique du nom.",
              },
            ],
          },
        }}
      />
    );

    expect(
      screen.getByText(
        "Le passage ne documente aucune origine orale, écrite ou linguistique du nom."
      )
    ).toBeInTheDocument();
    expect(screen.queryByText("Donnée manquante")).not.toBeInTheDocument();
  });

  // @req REQ-133
  it("attributes an oral tradition to its griot rather than stating it flat", () => {
    render(
      <PatronymeOriginSection
        patronyme={{
          ...base,
          content: {
            origin: {
              oralTraditions: [
                {
                  claim: "Le nom vient du Mandé.",
                  claimStatus: "contested",
                  griot: "Fadama Diarra",
                },
              ],
            },
          },
        }}
      />
    );

    expect(screen.getByText("Tradition orale griotique")).toBeInTheDocument();
    expect(screen.getByText(/Le nom vient du Mandé/)).toBeInTheDocument();
    expect(
      screen.getByText(/Transmis par\s+Fadama Diarra/)
    ).toBeInTheDocument();
  });

  // @req REQ-133
  it("carries an oral tradition and a written chronicle side by side", () => {
    render(
      <PatronymeOriginSection
        patronyme={{
          ...base,
          content: {
            origin: {
              oralTraditions: [{ claim: "Version griotique." }],
              writtenChronicles: [{ claim: "Version chroniquée." }],
            },
          },
        }}
      />
    );

    // Two testimonies about one name; neither is promoted over the other.
    expect(screen.getByText("Tradition orale griotique")).toBeInTheDocument();
    expect(screen.getByText("Chronique écrite")).toBeInTheDocument();
    expect(screen.getByText(/Version griotique/)).toBeInTheDocument();
    expect(screen.getByText(/Version chroniquée/)).toBeInTheDocument();
  });

  // @req REQ-133
  it("omits the griot wording when no oral tradition is documented", () => {
    render(
      <PatronymeOriginSection
        patronyme={{
          ...base,
          content: {
            origin: {
              writtenChronicles: [{ claim: "Cité dans le Tarikh es-Soudan." }],
            },
          },
        }}
      />
    );

    expect(screen.getByText("Chronique écrite")).toBeInTheDocument();
    expect(
      screen.queryByText(/transmise par tradition orale griotique/)
    ).not.toBeInTheDocument();
  });
});
