import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import {
  FamilyClassificationTreeSection,
  type FamilyClassificationTreeSectionProps,
} from "@/components/family/FamilyClassificationTreeSection";

/**
 * Charter §4 contract for the classification section.
 *
 * The section is the charter's own cautionary example. `afrik_languages` is
 * empty in every deployed database, so for months this block told its reader
 * that 28 peoples had no referenced language — reporting a projection gap as
 * an editorial silence, on a surface whose entire argument is provenance.
 * These tests pin the rule that replaced it: say whether a value is declared
 * or derived, and never let the two read alike.
 */
const derivedTree: FamilyClassificationTreeSectionProps["tree"] = {
  family: { id: "FLG_ATLANTIQUE", nameFr: "Atlantique" },
  branches: [
    { iso639_3: "ful", name: "Fulfulde", peopleCount: 3 },
    { iso639_3: "wol", name: "Wolof", peopleCount: 2 },
  ],
  branchProvenance: "people-fiches",
  declaredBranches: ["Atlantique central", "Peul-Sérère"],
  unlinkedPeopleCount: 4,
};

function renderSection(
  tree: FamilyClassificationTreeSectionProps["tree"] = derivedTree
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <FamilyClassificationTreeSection familyId="FLG_ATLANTIQUE" tree={tree} />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  window.sessionStorage.clear();
});

describe("Classification — charter §4 provenance", () => {
  // @req REQ-047
  it("says the branches were reconstructed when they come from the people fiches", () => {
    renderSection();

    expect(
      screen.getByText(/reconstituées d'après les fiches peuple/i)
    ).toBeInTheDocument();
  });

  // @req REQ-047
  it("says the branches are declared when the language corpus supplied them", () => {
    renderSection({ ...derivedTree, branchProvenance: "language-corpus" });

    expect(
      screen.getByText(/déclarées par le corpus des langues/i)
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/reconstituées d'après les fiches peuple/i)
    ).toBeNull();
  });

  // @req REQ-047
  it("lists the branch names the fiche declares as their own register, outside the tree", () => {
    renderSection();

    const declared = screen.getByRole("list", {
      name: /branches nommées par la fiche/i,
    });

    expect(within(declared).getByText("Peul-Sérère")).toBeInTheDocument();
    // No field ties a people to one of these names, so they must never be
    // rendered as expandable parents — that join would be an invention.
    expect(screen.queryByRole("treeitem", { name: /Peul-Sérère/ })).toBeNull();
  });

  // @req REQ-047
  it("states the unlinked count once", async () => {
    renderSection();

    const unlinked = await screen.findByRole("treeitem", {
      name: /sans langue référencée/i,
    });

    expect(unlinked.textContent?.match(/4/g)).toHaveLength(1);
  });

  // @req REQ-047
  it("omits the unlinked group entirely when every people declares a language", async () => {
    renderSection({ ...derivedTree, unlinkedPeopleCount: 0 });

    // The tree arrives through next/dynamic, so wait for a node that does
    // render before concluding anything from an absence.
    await screen.findByRole("treeitem", { name: /Fulfulde/ });

    expect(screen.queryByText(/sans langue référencée/i)).toBeNull();
  });
});

describe("Classification — the two views state the same corpus", () => {
  // @req REQ-047
  it("keeps the unlinked peoples visible in the list view, as the tree shows them", async () => {
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByRole("button", { name: "Liste" }));

    const index = screen.getByRole("list", { name: "Classification" });

    expect(within(index).getByText("Fulfulde")).toBeInTheDocument();
    // Dropping them here would let a reader switch view and lose four peoples
    // without anything saying so.
    expect(
      within(index).getByText(/sans langue référencée \(4\)/)
    ).toBeInTheDocument();
  });
});

describe("Classification — view switch", () => {
  // @req REQ-047
  it("exposes which view is showing, and moves the pressed state on change", async () => {
    const user = userEvent.setup();
    renderSection();

    const tree = screen.getByRole("button", { name: "Arbre" });
    const list = screen.getByRole("button", { name: "Liste" });

    expect(tree).toHaveAttribute("aria-pressed", "true");
    expect(list).toHaveAttribute("aria-pressed", "false");

    await user.click(list);

    expect(list).toHaveAttribute("aria-pressed", "true");
    expect(tree).toHaveAttribute("aria-pressed", "false");
  });
});
