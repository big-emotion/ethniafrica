import { readFileSync } from "node:fs";
import path from "node:path";

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HierarchyTextIndex } from "@/components/system/HierarchyTextIndex";
import {
  hierarchyFixture,
  hierarchyFixtureWithoutUnlinkedGroup,
} from "@/components/system/__fixtures__/hierarchy.fixture";
import { getFamilyRoute, getPeopleRoute } from "@/lib/routing";

const componentSourcePath = path.resolve(
  process.cwd(),
  "src/components/system/HierarchyTextIndex.tsx"
);

describe("HierarchyTextIndex", () => {
  // @req REQ-047
  it("renders a semantic nested ol/li structure with a real deep link per node", () => {
    render(<HierarchyTextIndex nodes={hierarchyFixture} />);

    const rootList = screen.getByRole("list", { name: "Classification" });
    expect(rootList.tagName).toBe("OL");

    const swahiliLink = screen.getByRole("link", { name: "Swahili" });
    expect(swahiliLink).toHaveAttribute(
      "href",
      `${getFamilyRoute("fr", "FLG_BANTU")}#lng-swa`
    );

    const peopleLink = screen.getByRole("link", { name: "Comorien" });
    expect(peopleLink).toHaveAttribute(
      "href",
      getPeopleRoute("fr", "PPL_COMORIAN")
    );

    const swahiliItem = swahiliLink.closest("li") as HTMLElement;
    const nestedList = within(swahiliItem).getByRole("list");
    expect(nestedList.tagName).toBe("OL");
  });

  // @req REQ-047
  it("shows a visible people count per node", () => {
    render(<HierarchyTextIndex nodes={hierarchyFixture} />);

    const swahiliItem = screen
      .getByRole("link", { name: "Swahili" })
      .closest("li") as HTMLElement;
    expect(within(swahiliItem).getByText("2 peuples")).toBeInTheDocument();

    const bangalaItem = screen
      .getByRole("link", { name: "Bangala" })
      .closest("li") as HTMLElement;
    expect(within(bangalaItem).getByText("1 peuple")).toBeInTheDocument();
  });

  // @req REQ-047
  it("renders a ClassificationBadge only for flagged nodes", () => {
    render(<HierarchyTextIndex nodes={hierarchyFixture} />);

    const lingalaItem = screen
      .getByRole("link", { name: "Lingala" })
      .closest("li") as HTMLElement;
    expect(
      within(lingalaItem).getByTestId("classification-icon")
    ).toBeInTheDocument();

    const swahiliItem = screen
      .getByRole("link", { name: "Swahili" })
      .closest("li") as HTMLElement;
    expect(
      within(swahiliItem).queryByTestId("classification-icon")
    ).not.toBeInTheDocument();
  });

  // @req REQ-047
  it("sets a lang attribute on endonym labels", () => {
    render(<HierarchyTextIndex nodes={hierarchyFixture} />);

    expect(screen.getByText("Kiswahili")).toHaveAttribute("lang", "sw");
    expect(screen.getByText("Bangála")).toHaveAttribute("lang", "ln");
  });

  // @req REQ-047
  it("renders the unlinked group as 'peuples sans langue référencée (N)' with peoples listed like a language branch", () => {
    render(<HierarchyTextIndex nodes={hierarchyFixture} />);

    expect(
      screen.getByText("peuples sans langue référencée (2)")
    ).toBeInTheDocument();

    const orphanLink = screen.getByRole("link", { name: "Peuple orphelin A" });
    expect(orphanLink).toHaveAttribute(
      "href",
      getPeopleRoute("fr", "PPL_ORPHAN_A")
    );
    const orphanItem = orphanLink.closest("li") as HTMLElement;
    expect(within(orphanItem).getByText("1 peuple")).toBeInTheDocument();
    expect(screen.getByText("Endonyme A")).toHaveAttribute("lang", "und");
  });

  // @req REQ-047
  it("renders nothing for the unlinked group when absent from the data", () => {
    render(<HierarchyTextIndex nodes={hierarchyFixtureWithoutUnlinkedGroup} />);

    expect(
      screen.queryByText(/peuples sans langue référencée/)
    ).not.toBeInTheDocument();
  });

  // @req REQ-047
  it('is a zero-JS server component: no "use client" and no event handlers', () => {
    const source = readFileSync(componentSourcePath, "utf-8");

    expect(source).not.toMatch(/["']use client["']/);
    expect(source).not.toMatch(/\bon[A-Z]\w*=/);
  });
});
