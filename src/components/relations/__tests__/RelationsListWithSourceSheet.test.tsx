import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import { RelationsListWithSourceSheet } from "../RelationsListWithSourceSheet";
import type { RelationListItem } from "@/lib/relationsDataTransformer";

const CENTER = { id: "PPL_YORUBA", nameMain: "Yoruba" };

const FON_ITEM: RelationListItem = {
  id: "REL_YORUBA_FON_MIGRATION",
  type: "migratory",
  derived: false,
  neighbor: { id: "PPL_FON", nameMain: "Fon", languageFamilyId: "FLG_KWA" },
  period: { startYear: 1600, endYear: 1700, label: "XVIIe siècle" },
  description: "Migration conjointe vers le golfe du Bénin.",
  confidence: { score: 82, sourceCount: 3 },
};

describe("RelationsListWithSourceSheet", () => {
  // @req REQ-097 FR72
  it("renders the relations list", () => {
    render(<RelationsListWithSourceSheet items={[FON_ITEM]} center={CENTER} />);
    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.getByText("Fon")).toBeInTheDocument();
  });

  // @req REQ-097 UX-DR48
  it("opens the SourceChainSheet with the relation's statement when its chip is activated", () => {
    render(<RelationsListWithSourceSheet items={[FON_ITEM]} center={CENTER} />);
    fireEvent.click(screen.getByText("voir les sources"));
    expect(
      screen.getByText("Migration conjointe vers le golfe du Bénin.")
    ).toBeInTheDocument();
  });

  // @req REQ-097
  it("renders the calm empty state when there are no relations", () => {
    render(<RelationsListWithSourceSheet items={[]} center={CENTER} />);
    expect(screen.getByText(/aucune relation documentée/i)).toBeInTheDocument();
  });
});
