/**
 * Tests for IdentityPanel (ETNI-811 / ETNI-892, Epic 15 Story 15.3, FR96).
 *
 * The panel MUST:
 *   - render the endonym as the primary heading with a `lang` attribute
 *     matching its languageOfOrigin, exonym rendered secondary,
 *   - show the imposition context (struck-through "terre" chip + one
 *     contextualizing line) without interaction, only when imposedBy is set,
 *   - render no imposition block / empty context line when there is no imposition,
 *   - fall back to the canonical AFRIK name (no fabricated lang) with a
 *     source line when there is no endonym name_record (R4),
 *   - carry a confidence chip + source affordance above the fold (FR99).
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { IdentityPanel } from "@/components/fiche/IdentityPanel";
import type { PeopleNamesDossier } from "@/api/v2/schemas/names";

const endonymDossier: PeopleNamesDossier = {
  peopleId: "PPL_YORUBA",
  autonym: null,
  names: [
    {
      id: "1",
      nameText: "Yorùbá ènìyàn",
      nameType: "endonym",
      languageOfOrigin: "yor",
      meaning: null,
      periodLabel: null,
      imposition: null,
      assertionId: "a1",
      sources: [
        {
          id: "s1",
          title: "SIL Ethnologue",
          url: "https://ethnologue.example/yor",
          year: 2020,
          tier: "1",
        },
      ],
      confidence: { score: 92, recomputedAt: "2026-01-01" },
    },
  ],
};

const imposedDossier: PeopleNamesDossier = {
  peopleId: "PPL_YORUBA",
  autonym: null,
  names: [
    ...endonymDossier.names,
    {
      id: "2",
      nameText: "Yoruba",
      nameType: "exonym",
      languageOfOrigin: null,
      meaning: null,
      periodLabel: null,
      imposition: {
        imposedBy: "administration coloniale britannique",
        impositionPeriod: "1900-1960",
        whyProblematic: "efface l'auto-appellation",
        contemporaryUsage: "encore utilisé administrativement",
      },
      assertionId: "a2",
      sources: [],
      confidence: null,
    },
  ],
};

const emptyDossier: PeopleNamesDossier = {
  peopleId: "PPL_YORUBA",
  autonym: null,
  names: [],
};

describe("IdentityPanel", () => {
  // @req REQ-091
  it("renders the endonym as the primary heading with a matching lang attribute", () => {
    render(
      <IdentityPanel
        peopleId="PPL_YORUBA"
        nameMain="Yoruba"
        dossier={endonymDossier}
      />
    );
    const heading = screen.getByText("Yorùbá ènìyàn");
    expect(heading.closest("h1")).not.toBeNull();
    expect(heading).toHaveAttribute("lang", "yo");
  });

  // @req REQ-091
  it("renders the exonym as secondary text beside the endonym", () => {
    render(
      <IdentityPanel
        peopleId="PPL_YORUBA"
        nameMain="Yoruba"
        dossier={imposedDossier}
      />
    );
    expect(screen.getAllByText("Yoruba").length).toBeGreaterThan(0);
  });

  // @req REQ-091
  it("shows the imposition context without interaction when imposedBy is set", () => {
    render(
      <IdentityPanel
        peopleId="PPL_YORUBA"
        nameMain="Yoruba"
        dossier={imposedDossier}
      />
    );
    expect(screen.getByTestId("identity-imposition")).toBeInTheDocument();
    expect(
      screen.getByText(/administration coloniale britannique/)
    ).toBeInTheDocument();
  });

  // @req REQ-091
  it("renders no imposition block when there is no imposedBy", () => {
    render(
      <IdentityPanel
        peopleId="PPL_YORUBA"
        nameMain="Yoruba"
        dossier={endonymDossier}
      />
    );
    expect(screen.queryByTestId("identity-imposition")).toBeNull();
  });

  // @req REQ-091
  it("falls back to the canonical AFRIK name with no fabricated lang when there is no endonym record", () => {
    render(
      <IdentityPanel
        peopleId="PPL_YORUBA"
        nameMain="Yoruba"
        dossier={emptyDossier}
      />
    );
    const heading = screen.getByText("Yoruba");
    expect(heading.closest("h1")).not.toBeNull();
    expect(heading).not.toHaveAttribute("lang");
    expect(screen.queryByTestId("identity-imposition")).toBeNull();
  });

  // @req REQ-091
  it("renders a source affordance for the fallback path, never a fabricated one", () => {
    render(
      <IdentityPanel
        peopleId="PPL_YORUBA"
        nameMain="Yoruba"
        dossier={emptyDossier}
      />
    );
    expect(screen.getByText("Source : fiche AFRIK")).toBeInTheDocument();
  });

  // @req REQ-091
  it("carries a confidence chip and a source affordance above the fold", () => {
    render(
      <IdentityPanel
        peopleId="PPL_YORUBA"
        nameMain="Yoruba"
        dossier={endonymDossier}
      />
    );
    expect(
      screen.getByTestId("identity-source-affordance")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /ouvrir la chaîne de sources/ })
    ).toBeInTheDocument();
    expect(screen.getByText("SIL Ethnologue")).toBeInTheDocument();
  });
});
