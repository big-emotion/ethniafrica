import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  HierarchyTree,
  type HierarchyNode,
} from "@/components/system/HierarchyTree";
import { getPeopleRoute } from "@/lib/routing";

function mockMatchMedia(reducedMotion: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)" && reducedMotion,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

const fixture: HierarchyNode = {
  id: "FLG_BANTU",
  label: "Bantou",
  childCount: 2,
  children: [
    {
      id: "kon",
      label: "Kikongo",
      labelLang: "kon",
      childCount: 1,
      children: [
        {
          id: "PPL_KONGO",
          label: "Kongo",
          href: getPeopleRoute("fr", "PPL_KONGO"),
        },
      ],
    },
    {
      id: "lin",
      label: "Lingala",
      badge: "contested",
      childCount: 0,
    },
  ],
};

function renderTree(
  overrides: Partial<React.ComponentProps<typeof HierarchyTree>> = {}
) {
  return render(
    <>
      <h2 id="tree-label">Classification</h2>
      <HierarchyTree root={fixture} labelledById="tree-label" {...overrides} />
    </>
  );
}

beforeEach(() => {
  mockMatchMedia(false);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("HierarchyTree — ARIA structure", () => {
  // @req REQ-044
  it("renders role=tree labelled by the given id, wrapping treeitems", () => {
    renderTree();

    const tree = screen.getByRole("tree");
    expect(tree).toHaveAttribute("aria-labelledby", "tree-label");
    expect(
      screen.getByRole("treeitem", { name: /Bantou/ })
    ).toBeInTheDocument();
  });

  // @req REQ-044
  it("exposes aria-level, aria-setsize and aria-posinset on every item", () => {
    renderTree({ defaultExpandedIds: ["FLG_BANTU"] });

    const root = screen.getByRole("treeitem", { name: /Bantou/ });
    expect(root).toHaveAttribute("aria-level", "1");
    expect(root).toHaveAttribute("aria-setsize", "1");
    expect(root).toHaveAttribute("aria-posinset", "1");

    const kikongo = screen.getByRole("treeitem", { name: /Kikongo/ });
    expect(kikongo).toHaveAttribute("aria-level", "2");
    expect(kikongo).toHaveAttribute("aria-setsize", "2");
    expect(kikongo).toHaveAttribute("aria-posinset", "1");

    const lingala = screen.getByRole("treeitem", { name: /Lingala/ });
    expect(lingala).toHaveAttribute("aria-level", "2");
    expect(lingala).toHaveAttribute("aria-posinset", "2");
  });

  // @req REQ-044
  it("sets aria-expanded only on branch nodes, not leaves", () => {
    renderTree({ defaultExpandedIds: ["FLG_BANTU", "kon"] });

    expect(screen.getByRole("treeitem", { name: /Bantou/ })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
    expect(screen.getByRole("treeitem", { name: /Kikongo/ })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
    expect(screen.getByRole("treeitem", { name: /Kongo/ })).not.toHaveAttribute(
      "aria-expanded"
    );
  });

  // @req REQ-044
  it("wraps expanded children in role=group", () => {
    renderTree({ defaultExpandedIds: ["FLG_BANTU"] });

    const groups = screen.getAllByRole("group");
    expect(groups.length).toBeGreaterThan(0);
    expect(
      within(groups[0]).getByRole("treeitem", { name: /Kikongo/ })
    ).toBeInTheDocument();
  });

  // @req REQ-044
  it("collapses branches by default when defaultExpandedIds is omitted", () => {
    renderTree();

    expect(
      screen.queryByRole("treeitem", { name: /Kikongo/ })
    ).not.toBeInTheDocument();
  });
});

describe("HierarchyTree — roving tabindex", () => {
  // @req REQ-044
  it("keeps exactly one treeitem tabbable at a time", () => {
    renderTree({ defaultExpandedIds: ["FLG_BANTU"] });

    const items = screen.getAllByRole("treeitem");
    const tabbable = items.filter(
      (item) => item.getAttribute("tabindex") === "0"
    );
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0]).toHaveAttribute("aria-level", "1");
  });

  // @req REQ-044
  it("moves the single tab stop to the node last navigated to", async () => {
    const user = userEvent.setup();
    renderTree({ defaultExpandedIds: ["FLG_BANTU"] });

    screen.getByRole("treeitem", { name: /Bantou/ }).focus();
    await user.keyboard("{ArrowDown}");

    const items = screen.getAllByRole("treeitem");
    const tabbable = items.filter(
      (item) => item.getAttribute("tabindex") === "0"
    );
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0]).toHaveAccessibleName(/Kikongo/);
  });
});

describe("HierarchyTree — APG keyboard navigation", () => {
  // @req REQ-044
  it("ArrowDown / ArrowUp move focus across visible nodes only", async () => {
    const user = userEvent.setup();
    renderTree({ defaultExpandedIds: ["FLG_BANTU"] });

    screen.getByRole("treeitem", { name: /Bantou/ }).focus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("treeitem", { name: /Kikongo/ })).toHaveFocus();

    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("treeitem", { name: /Lingala/ })).toHaveFocus();

    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("treeitem", { name: /Kikongo/ })).toHaveFocus();
  });

  // @req REQ-044
  it("ArrowRight expands a collapsed branch without moving focus, then moves into it", async () => {
    const user = userEvent.setup();
    renderTree();

    const root = screen.getByRole("treeitem", { name: /Bantou/ });
    root.focus();

    await user.keyboard("{ArrowRight}");
    expect(root).toHaveAttribute("aria-expanded", "true");
    expect(root).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("treeitem", { name: /Kikongo/ })).toHaveFocus();
  });

  // @req REQ-044
  it("ArrowLeft collapses an expanded branch without moving focus, then moves to parent", async () => {
    const user = userEvent.setup();
    renderTree({ defaultExpandedIds: ["FLG_BANTU", "kon"] });

    const kikongo = screen.getByRole("treeitem", { name: /Kikongo/ });
    expect(screen.getByRole("treeitem", { name: /Kongo/ })).toBeInTheDocument();
    kikongo.focus();

    await user.keyboard("{ArrowLeft}");
    expect(
      screen.queryByRole("treeitem", { name: /Kongo/ })
    ).not.toBeInTheDocument();
    expect(kikongo).toHaveFocus();

    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("treeitem", { name: /Bantou/ })).toHaveFocus();
  });

  // @req REQ-044
  it("Home / End jump to the first and last visible nodes", async () => {
    const user = userEvent.setup();
    renderTree({ defaultExpandedIds: ["FLG_BANTU", "kon"] });

    screen.getByRole("treeitem", { name: /Kikongo/ }).focus();

    await user.keyboard("{End}");
    expect(screen.getByRole("treeitem", { name: /Lingala/ })).toHaveFocus();

    await user.keyboard("{Home}");
    expect(screen.getByRole("treeitem", { name: /Bantou/ })).toHaveFocus();
  });

  // @req REQ-044
  it("Enter/Space toggle a focused branch node", async () => {
    const user = userEvent.setup();
    renderTree();

    const root = screen.getByRole("treeitem", { name: /Bantou/ });
    root.focus();

    await user.keyboard("{Enter}");
    expect(root).toHaveAttribute("aria-expanded", "true");

    await user.keyboard(" ");
    expect(root).toHaveAttribute("aria-expanded", "false");
  });

  // @req REQ-044
  it("Enter on a leaf follows its href", async () => {
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    const user = userEvent.setup();
    renderTree({ defaultExpandedIds: ["FLG_BANTU", "kon"] });

    const leaf = screen.getByRole("treeitem", { name: /Kongo/ });
    expect(leaf.tagName).toBe("A");
    expect(leaf).toHaveAttribute("href", getPeopleRoute("fr", "PPL_KONGO"));

    leaf.focus();
    await user.keyboard("{Enter}");

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  // @req REQ-044
  it("does not trap keyboard focus — Tab remains the browser's responsibility", () => {
    renderTree({ defaultExpandedIds: ["FLG_BANTU"] });

    const items = screen.getAllByRole("treeitem");
    const nonTabbable = items.filter(
      (item) => item.getAttribute("tabindex") === "-1"
    );
    expect(nonTabbable.length).toBe(items.length - 1);
  });
});

describe("HierarchyTree — lazy loadChildren", () => {
  // @req REQ-047
  it("fetches children automatically for a branch pre-expanded via defaultExpandedIds (deep link)", async () => {
    const loadChildren = vi.fn().mockResolvedValue([
      {
        id: "PPL_LINGALA",
        label: "Lingala (peuple)",
        href: getPeopleRoute("fr", "PPL_LINGALA"),
      },
    ]);
    renderTree({ loadChildren, defaultExpandedIds: ["FLG_BANTU", "lin"] });

    expect(loadChildren).toHaveBeenCalledWith(
      expect.objectContaining({ id: "lin" })
    );
    await waitFor(() =>
      expect(
        screen.getByRole("treeitem", { name: /Lingala \(peuple\)/ })
      ).toBeInTheDocument()
    );
  });

  // @req REQ-047
  it("sets aria-busy and reserves group space while loading, then announces completion", async () => {
    let resolveLoad: (nodes: HierarchyNode[]) => void = () => {};
    const loadChildren = vi.fn(
      () =>
        new Promise<HierarchyNode[]>((resolve) => {
          resolveLoad = resolve;
        })
    );
    const user = userEvent.setup();
    renderTree({ loadChildren, defaultExpandedIds: ["FLG_BANTU"] });

    const lingala = screen.getByRole("treeitem", { name: /Lingala/ });
    lingala.focus();
    await user.keyboard("{Enter}");

    expect(loadChildren).toHaveBeenCalledWith(
      expect.objectContaining({ id: "lin" })
    );
    expect(lingala).toHaveAttribute("aria-busy", "true");
    expect(
      screen.getByTestId("hierarchy-tree-group-lin").getAttribute("style")
    ).toContain("min-height: var(--afh-tree-node-min-h)");

    resolveLoad([
      {
        id: "PPL_LINGALA",
        label: "Lingala (peuple)",
        href: getPeopleRoute("fr", "PPL_LINGALA"),
      },
    ]);

    await waitFor(() =>
      expect(lingala).not.toHaveAttribute("aria-busy", "true")
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "branche chargée — 1 peuples"
    );
    expect(
      screen.getByRole("treeitem", { name: /Lingala \(peuple\)/ })
    ).toBeInTheDocument();
  });

  // @req REQ-047
  it("renders a calm inline réessayer affordance on failure and retries on click", async () => {
    const loadChildren = vi
      .fn()
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce([
        {
          id: "PPL_LINGALA",
          label: "Lingala (peuple)",
          href: getPeopleRoute("fr", "PPL_LINGALA"),
        },
      ]);
    const user = userEvent.setup();
    renderTree({ loadChildren, defaultExpandedIds: ["FLG_BANTU"] });

    const lingala = screen.getByRole("treeitem", { name: /Lingala/ });
    lingala.focus();
    await user.keyboard("{Enter}");

    const retryButton = await screen.findByRole("button", {
      name: "réessayer",
    });
    expect(retryButton).toBeInTheDocument();

    await user.click(retryButton);

    await waitFor(() =>
      expect(
        screen.getByRole("treeitem", { name: /Lingala \(peuple\)/ })
      ).toBeInTheDocument()
    );
    expect(
      screen.queryByRole("button", { name: "réessayer" })
    ).not.toBeInTheDocument();
    expect(loadChildren).toHaveBeenCalledTimes(2);
  });
});

describe("HierarchyTree — reduced motion", () => {
  // @req REQ-044
  it("reveals branches instantly under prefers-reduced-motion: reduce", () => {
    mockMatchMedia(true);
    renderTree({ defaultExpandedIds: ["FLG_BANTU"] });

    expect(
      screen.getByTestId("hierarchy-tree-group-FLG_BANTU")
    ).toHaveAttribute("data-motion", "instant");
  });

  // @req REQ-044
  it("defaults to an opacity-only reveal otherwise", () => {
    renderTree({ defaultExpandedIds: ["FLG_BANTU"] });

    expect(
      screen.getByTestId("hierarchy-tree-group-FLG_BANTU")
    ).toHaveAttribute("data-motion", "fade");
  });
});

describe("HierarchyTree — ClassificationBadge", () => {
  // @req REQ-023
  it("renders the badge with icon and text beside a node carrying one", () => {
    renderTree({ defaultExpandedIds: ["FLG_BANTU"] });

    const badge = screen.getByRole("link", { name: /Contesté/ });
    expect(badge).toBeInTheDocument();
    expect(
      within(badge).getByTestId("classification-icon")
    ).toBeInTheDocument();
  });

  // @req REQ-023
  it("renders nothing for nodes without a badge", () => {
    renderTree({ defaultExpandedIds: ["FLG_BANTU"] });

    const kikongoItem = screen.getByRole("treeitem", { name: /Kikongo/ });
    expect(within(kikongoItem).queryByRole("link")).not.toBeInTheDocument();
  });
});

describe("HierarchyTree — node affordance", () => {
  // @req REQ-044
  it("marks an expandable branch with a chevron that carries its open state", async () => {
    const user = userEvent.setup();
    renderTree({ defaultExpandedIds: ["FLG_BANTU"] });

    const kikongo = screen.getByRole("treeitem", { name: /Kikongo/ });
    const chevron = within(kikongo).getByTestId("hierarchy-node-chevron");

    expect(chevron).toHaveAttribute("data-expanded", "false");

    await user.click(kikongo);

    expect(chevron).toHaveAttribute("data-expanded", "true");
  });

  // @req REQ-044
  it("hides the chevron from assistive tech, which already reads aria-expanded", () => {
    renderTree({ defaultExpandedIds: ["FLG_BANTU"] });

    const kikongo = screen.getByRole("treeitem", { name: /Kikongo/ });

    expect(
      within(kikongo).getByTestId("hierarchy-node-chevron")
    ).toHaveAttribute("aria-hidden", "true");
    expect(kikongo).toHaveAttribute("aria-expanded", "false");
  });

  // @req REQ-044
  it("gives a leaf no chevron, so the affordance only ever promises what opens", () => {
    renderTree({ defaultExpandedIds: ["FLG_BANTU", "kon"] });

    const leaf = screen.getByRole("treeitem", { name: /Kongo/ });

    expect(within(leaf).queryByTestId("hierarchy-node-chevron")).toBeNull();
  });
});
