import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { RelationsList } from "../RelationsList";
import type { RelationListItem } from "@/lib/relationsDataTransformer";

const FON_ITEM: RelationListItem = {
  id: "REL_YORUBA_FON_MIGRATION",
  type: "migratory",
  derived: false,
  neighbor: { id: "PPL_FON", nameMain: "Fon", languageFamilyId: "FLG_KWA" },
  period: { startYear: 1600, endYear: 1700, label: "XVIIe siècle" },
  description: "Migration conjointe vers le golfe du Bénin.",
  confidence: { score: 82, sourceCount: 3 },
};

const ASHANTI_ITEM: RelationListItem = {
  id: "REL_YORUBA_ASHANTI_TRADE",
  type: "commercial",
  derived: false,
  neighbor: {
    id: "PPL_ASHANTI",
    nameMain: "Ashanti",
    languageFamilyId: "FLG_NIGER_CONGO",
  },
  period: { startYear: null, endYear: null, label: "XIXe siècle" },
  description: "Réseaux commerciaux transsahariens partagés.",
  confidence: null,
};

const BAMILEKE_ITEM: RelationListItem = {
  id: "derived_PPL_BAMILEKE",
  type: "linguistic",
  derived: true,
  neighbor: {
    id: "PPL_BAMILEKE",
    nameMain: "Bamiléké",
    languageFamilyId: "FLG_NIGER_CONGO",
  },
  period: null,
  description: null,
  confidence: null,
};

describe("RelationsList", () => {
  let replaceStateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    replaceStateSpy = vi
      .spyOn(window.history, "replaceState")
      .mockImplementation(() => {});
  });

  afterEach(() => {
    replaceStateSpy.mockRestore();
  });

  // @req REQ-097
  it("renders one row per item with its type badge, neighbor name, period and description", () => {
    render(<RelationsList items={[FON_ITEM]} onOpenRelation={vi.fn()} />);
    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByText("Fon")).toBeInTheDocument();
    expect(screen.getByText("XVIIe siècle")).toBeInTheDocument();
    expect(
      screen.getByText("Migration conjointe vers le golfe du Bénin.")
    ).toBeInTheDocument();
  });

  // @req REQ-097
  it("shows a derived caption instead of a ConfidenceChip on derived rows", () => {
    render(<RelationsList items={[BAMILEKE_ITEM]} onOpenRelation={vi.fn()} />);
    expect(
      screen.getByText(/dérivé de la hiérarchie afrik/i)
    ).toBeInTheDocument();
  });

  // @req REQ-097
  it("invokes onOpenRelation when a sourced row's confidence chip is activated", () => {
    const onOpenRelation = vi.fn();
    render(
      <RelationsList items={[FON_ITEM]} onOpenRelation={onOpenRelation} />
    );
    fireEvent.click(screen.getByText("voir les sources"));
    expect(onOpenRelation).toHaveBeenCalledWith("REL_YORUBA_FON_MIGRATION");
  });

  // @req REQ-097
  it("renders type filter chips grouped and labelled for assistive tech", () => {
    render(<RelationsList items={[FON_ITEM]} onOpenRelation={vi.fn()} />);
    expect(
      screen.getByRole("group", { name: "filtrer par type de lien" })
    ).toBeInTheDocument();
  });

  // @req REQ-097
  it("toggles aria-pressed on a filter chip when activated", () => {
    render(
      <RelationsList
        items={[FON_ITEM, ASHANTI_ITEM]}
        onOpenRelation={vi.fn()}
      />
    );
    const chip = screen.getByRole("button", { name: "Migratoire" });
    expect(chip).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(chip);
    expect(chip).toHaveAttribute("aria-pressed", "true");
  });

  // @req REQ-097
  it("filters the list down to the active types", () => {
    render(
      <RelationsList
        items={[FON_ITEM, ASHANTI_ITEM]}
        onOpenRelation={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Migratoire" }));
    expect(screen.getByText("Fon")).toBeInTheDocument();
    expect(screen.queryByText("Ashanti")).not.toBeInTheDocument();
  });

  // @req REQ-097
  it("mirrors the active filter types into the URL via history.replaceState", () => {
    render(<RelationsList items={[FON_ITEM]} onOpenRelation={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Migratoire" }));
    expect(replaceStateSpy).toHaveBeenCalledTimes(1);
    const [, , url] = replaceStateSpy.mock.calls[0];
    expect(String(url)).toContain("types=migratory");
  });

  // @req REQ-097
  it("starts filtered when initialActiveTypes is provided (SSR-parsed searchParams)", () => {
    render(
      <RelationsList
        items={[FON_ITEM, ASHANTI_ITEM]}
        onOpenRelation={vi.fn()}
        initialActiveTypes={["commercial"]}
      />
    );
    expect(screen.queryByText("Fon")).not.toBeInTheDocument();
    expect(screen.getByText("Ashanti")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Commerciale" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  // @req REQ-097
  it("dismisses one active filter via its × button, leaving the other applied", () => {
    render(
      <RelationsList
        items={[FON_ITEM, ASHANTI_ITEM]}
        onOpenRelation={vi.fn()}
        initialActiveTypes={["migratory", "commercial"]}
      />
    );
    expect(screen.getByText("Fon")).toBeInTheDocument();
    expect(screen.getByText("Ashanti")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /retirer le filtre migratoire/i })
    );
    expect(screen.queryByText("Fon")).not.toBeInTheDocument();
    expect(screen.getByText("Ashanti")).toBeInTheDocument();
  });

  // @req REQ-097
  it("clears all active filters via the tout effacer control", () => {
    render(
      <RelationsList
        items={[FON_ITEM, ASHANTI_ITEM]}
        onOpenRelation={vi.fn()}
        initialActiveTypes={["migratory"]}
      />
    );
    expect(screen.queryByText("Ashanti")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /tout effacer/i }));
    expect(screen.getByText("Ashanti")).toBeInTheDocument();
    expect(screen.getByText("Fon")).toBeInTheDocument();
  });

  // @req REQ-097
  it("renders calm French copy when there are no relations at all", () => {
    render(<RelationsList items={[]} onOpenRelation={vi.fn()} />);
    expect(screen.getByText(/aucune relation documentée/i)).toBeInTheDocument();
  });

  // @req REQ-097
  it("renders calm French copy when only derived links are present", () => {
    render(<RelationsList items={[BAMILEKE_ITEM]} onOpenRelation={vi.fn()} />);
    expect(
      screen.getByText(/dérivés de la hiérarchie afrik, sont disponibles/i)
    ).toBeInTheDocument();
  });
});
