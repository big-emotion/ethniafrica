import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { TonguePanel, type TonguePanelProps } from "../TonguePanel";

const SOURCE_LINE = { label: "SIL Ethnologue, 2025" };

const BASE_PROPS: TonguePanelProps = {
  languageFamilyId: "FLG_BANTU",
  familyName: "Bantou",
  branches: [
    { id: "kon", name: "Kikongo", peopleCount: 3 },
    { id: "lin", name: "Lingala", peopleCount: 2 },
  ],
  size: "md",
  side: "left",
  sourceLine: SOURCE_LINE,
  stepLabel: "04 · Langue",
  heading: "Classification linguistique",
  body: "Une slice de l'arbre de classification, limitée en profondeur.",
  treeLabel: "Classification — Bantou",
  textIndexLabel: "Classification — version texte",
};

function renderPanel(overrides: Partial<TonguePanelProps> = {}) {
  return render(<TonguePanel {...BASE_PROPS} {...overrides} />);
}

function mockBranchFetch(
  people: { id: string; nameMain: string; classificationStatus: null }[]
) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      data: people,
      meta: { pagination: { total: people.length } },
    }),
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("TonguePanel — data gating (FR98)", () => {
  // @req REQ-091
  it("renders zero DOM output when there are no branches", () => {
    const { container } = renderPanel({ branches: [] });
    expect(container.firstChild).toBeNull();
  });

  // @req REQ-091
  it("renders the FichePanel chapter anatomy when branches are present", () => {
    renderPanel();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Classification linguistique",
      })
    ).toBeTruthy();
    expect(screen.getByText("04 · Langue")).toBeTruthy();
    expect(screen.getByText("SIL Ethnologue, 2025")).toBeTruthy();
  });
});

describe("TonguePanel — branch slice depth bound", () => {
  // @req REQ-091
  it("renders the family root and its language branches as the tree", () => {
    renderPanel();
    expect(screen.getByRole("treeitem", { name: /Bantou/ })).toBeTruthy();
    expect(screen.getByRole("treeitem", { name: /Kikongo/ })).toBeTruthy();
    expect(screen.getByRole("treeitem", { name: /Lingala/ })).toBeTruthy();
  });

  // @req REQ-091
  it("fetches the existing tree/branch endpoint scoped to the expanded language when a branch is expanded", async () => {
    const fetchMock = mockBranchFetch([
      { id: "PPL_KONGO", nameMain: "Kongo", classificationStatus: null },
    ]);
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderPanel();

    const kikongo = screen.getByRole("treeitem", { name: /Kikongo/ });
    kikongo.focus();
    await user.keyboard("{ArrowRight}");

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining(
          "/api/v2/language-families/FLG_BANTU/tree/branch?language=kon"
        )
      )
    );
    await waitFor(() =>
      expect(screen.getByRole("treeitem", { name: /Kongo/ })).toBeTruthy()
    );
  });

  // @req REQ-091
  it("maps every fetched person to a leaf (href set), so the slice can never expand past family → branch → person", async () => {
    const fetchMock = mockBranchFetch([
      { id: "PPL_KONGO", nameMain: "Kongo", classificationStatus: null },
    ]);
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderPanel();

    const kikongo = screen.getByRole("treeitem", { name: /Kikongo/ });
    kikongo.focus();
    await user.keyboard("{ArrowRight}");

    const kongo = await screen.findByRole("treeitem", { name: /Kongo/ });
    expect(kongo).toHaveAttribute("href", "/fr/peuples/PPL_KONGO");
    expect(kongo).not.toHaveAttribute("aria-expanded");

    fetchMock.mockClear();
    kongo.focus();
    await user.keyboard("{ArrowRight}");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("TonguePanel — HierarchyTextIndex text-first equivalent", () => {
  // @req REQ-091
  it("renders the text index alongside the tree with every branch as an entry", () => {
    renderPanel();
    const list = screen.getByRole("list", { name: "Classification" });
    expect(list).toBeTruthy();
    expect(screen.getAllByText("Kikongo").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Lingala").length).toBeGreaterThan(0);
  });
});

describe("TonguePanel — keyboard navigation inherited from HierarchyTree", () => {
  // @req REQ-091
  it("ArrowDown/ArrowUp move focus across the branch nodes exactly as HierarchyTree does", async () => {
    const user = userEvent.setup();
    renderPanel();

    screen.getByRole("treeitem", { name: /Bantou/ }).focus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("treeitem", { name: /Kikongo/ })).toHaveFocus();

    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("treeitem", { name: /Lingala/ })).toHaveFocus();

    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("treeitem", { name: /Kikongo/ })).toHaveFocus();
  });

  // @req REQ-091
  it("Home/End jump to the first and last visible nodes", async () => {
    const user = userEvent.setup();
    renderPanel();

    screen.getByRole("treeitem", { name: /Kikongo/ }).focus();
    await user.keyboard("{End}");
    expect(screen.getByRole("treeitem", { name: /Lingala/ })).toHaveFocus();

    await user.keyboard("{Home}");
    expect(screen.getByRole("treeitem", { name: /Bantou/ })).toHaveFocus();
  });
});
