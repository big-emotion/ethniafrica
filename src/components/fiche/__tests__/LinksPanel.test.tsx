import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { LinksPanel } from "../LinksPanel";
import type { SourcedRelation } from "@/types/relations";

const SOURCE_LINE = { label: "AFRIK — afrik_people_relations" };

const RELATIONS: SourcedRelation[] = [
  {
    id: "REL_EWE_FON_MIGRATION",
    relationType: "migratory",
    direction: "bidirectional",
    period: { startYear: 1600, endYear: 1700, label: "XVIIe siècle" },
    description: "Migration conjointe vers le golfe du Bénin.",
    sources: [],
    confidence: null,
    neighbor: { id: "PPL_FON", nameMain: "Fon", languageFamilyId: "FLG_KWA" },
  },
  {
    id: "REL_EWE_ASHANTI_TRADE",
    relationType: "commercial",
    direction: "a_to_b",
    period: { startYear: null, endYear: null, label: "" },
    description: "Réseaux commerciaux partagés.",
    sources: [],
    confidence: null,
    neighbor: {
      id: "PPL_ASHANTI",
      nameMain: "Ashanti",
      languageFamilyId: "FLG_KWA",
    },
  },
];

const PANEL_TEXT = {
  size: "md" as const,
  side: "right" as const,
  sourceLine: SOURCE_LINE,
  stepLabel: "06 · Liens",
  heading: "Un peuple ne vit pas seul",
  body: "Des liens migratoires, commerciaux et religieux le relient à ses voisins.",
};

describe("LinksPanel — relation constellation from afrik_people_relations", () => {
  // @req REQ-097
  it("renders zero DOM output when there are no sourced relations (FR98)", () => {
    const { container } = render(<LinksPanel {...PANEL_TEXT} />);
    expect(container.firstChild).toBeNull();
  });

  // @req REQ-097
  it("renders zero DOM output when relations is an empty array (FR98)", () => {
    const { container } = render(<LinksPanel {...PANEL_TEXT} relations={[]} />);
    expect(container.firstChild).toBeNull();
  });

  // @req REQ-097
  it("renders the FichePanel chapter anatomy when relations are present", () => {
    render(<LinksPanel {...PANEL_TEXT} relations={RELATIONS} />);
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Un peuple ne vit pas seul",
      })
    ).toBeInTheDocument();
    expect(screen.getByText("06 · Liens")).toBeInTheDocument();
    expect(
      screen.getByText("AFRIK — afrik_people_relations")
    ).toBeInTheDocument();
  });

  // @req REQ-097
  it("renders each neighbor as a text chip badged with its relation type", () => {
    render(<LinksPanel {...PANEL_TEXT} relations={RELATIONS} />);

    expect(screen.getByText("Fon")).toBeInTheDocument();
    expect(screen.getByText("Migratoire")).toBeInTheDocument();
    expect(screen.getByText("Ashanti")).toBeInTheDocument();
    expect(screen.getByText("Commerciale")).toBeInTheDocument();
  });
});
