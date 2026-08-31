import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import axe from "axe-core";

import { EgoNetworkGraph } from "../EgoNetworkGraph";
import type { RelationListItem } from "@/lib/relationsDataTransformer";

// axe-core is already a project dependency (used by scripts/a11y-test.ts via
// @axe-core/playwright); running it directly against the happy-dom render
// output gives the same rule engine as vitest-axe without a new package
// (ETNI-485 precedent, src/components/compare/__tests__/components.test.tsx).
async function expectNoAxeViolations(container: Element): Promise<void> {
  const results = await axe.run(container);
  const summary = results.violations.map(
    (violation) =>
      `[${violation.impact}] ${violation.id}: ${violation.help} (${violation.nodes
        .map((node) => node.target.join(" "))
        .join(", ")})`
  );
  expect(summary).toEqual([]);
}

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

describe("EgoNetworkGraph", () => {
  // @req REQ-097
  it("renders a single application region labelled for the center people", () => {
    render(
      <EgoNetworkGraph
        center={CENTER}
        edges={[FON_ITEM]}
        onEdgeActivate={vi.fn()}
        onNodeActivate={vi.fn()}
      />
    );
    expect(
      screen.getByRole("application", {
        name: /Graphe de relations centré sur Yoruba/,
      })
    ).toHaveAttribute("aria-roledescription", "graphe de relations");
  });

  // @req REQ-097
  it("renders one edge stop and one node stop per relation, positioned by array order", () => {
    render(
      <EgoNetworkGraph
        center={CENTER}
        edges={[BAMILEKE_ITEM, FON_ITEM, ASHANTI_ITEM]}
        onEdgeActivate={vi.fn()}
        onNodeActivate={vi.fn()}
      />
    );
    expect(screen.getByTestId("edge-0")).toBeInTheDocument();
    expect(screen.getByTestId("node-0")).toBeInTheDocument();
    expect(screen.getByTestId("edge-2")).toBeInTheDocument();
    expect(screen.getByTestId("node-2")).toBeInTheDocument();
    expect(screen.queryByTestId("edge-3")).not.toBeInTheDocument();
  });

  // @req REQ-097
  it("caps at 24 neighbors and renders a non-interactive overflow affordance for the rest", () => {
    const many: RelationListItem[] = Array.from({ length: 26 }, (_, i) => ({
      id: `REL_${i}`,
      type: "commercial",
      derived: false,
      neighbor: {
        id: `PPL_${i}`,
        nameMain: `Peuple ${i}`,
        languageFamilyId: "FLG_X",
      },
      period: null,
      description: null,
      confidence: null,
    }));
    render(
      <EgoNetworkGraph
        center={CENTER}
        edges={many}
        onEdgeActivate={vi.fn()}
        onNodeActivate={vi.fn()}
      />
    );
    expect(screen.getByTestId("edge-23")).toBeInTheDocument();
    expect(screen.queryByTestId("edge-24")).not.toBeInTheDocument();
    expect(screen.getByTestId("overflow")).toHaveAttribute(
      "aria-label",
      expect.stringContaining("+2 autres")
    );
  });

  // @req REQ-097
  it("renders sourced edges solid and derived edges with the AFRIK-derived dash token", () => {
    const { container } = render(
      <EgoNetworkGraph
        center={CENTER}
        edges={[FON_ITEM, BAMILEKE_ITEM]}
        onEdgeActivate={vi.fn()}
        onNodeActivate={vi.fn()}
      />
    );
    const lines = container.querySelectorAll("line");
    expect(lines[0]).toHaveClass("stroke-afh-relation-migratory");
    expect(lines[0].getAttribute("style") ?? "").not.toContain(
      "stroke-dasharray"
    );
    expect(lines[1]).toHaveClass("stroke-afh-relation-linguistic");
    expect(lines[1].getAttribute("style") ?? "").toContain(
      "stroke-dasharray: var(--afh-relation-derived-dash)"
    );
  });

  // @req REQ-097
  it("renders the neighbor autonym as its node label", () => {
    render(
      <EgoNetworkGraph
        center={CENTER}
        edges={[FON_ITEM]}
        onEdgeActivate={vi.fn()}
        onNodeActivate={vi.fn()}
      />
    );
    expect(screen.getByText("Fon")).toBeInTheDocument();
  });

  // @req REQ-097
  it("sets a lang attribute on the neighbor autonym when an ISO 639-3 code is supplied", () => {
    render(
      <EgoNetworkGraph
        center={CENTER}
        edges={[FON_ITEM]}
        neighborLangById={{ PPL_FON: "fon" }}
        onEdgeActivate={vi.fn()}
        onNodeActivate={vi.fn()}
      />
    );
    expect(screen.getByText("Fon")).toHaveAttribute("lang", "fon");
  });

  // @req REQ-097
  it("gives every focusable stop a hit area of at least 44 x 44 px", () => {
    const { container } = render(
      <EgoNetworkGraph
        center={CENTER}
        edges={[FON_ITEM]}
        onEdgeActivate={vi.fn()}
        onNodeActivate={vi.fn()}
      />
    );
    const hitAreas = container.querySelectorAll("rect[fill='transparent']");
    expect(hitAreas.length).toBeGreaterThan(0);
    hitAreas.forEach((rect) => {
      expect(Number(rect.getAttribute("width"))).toBeGreaterThanOrEqual(44);
      expect(Number(rect.getAttribute("height"))).toBeGreaterThanOrEqual(44);
    });
  });

  describe("keyboard traversal", () => {
    // @req REQ-097
    it("cycles edge/node stops with Arrow Right and Arrow Left, in list order", () => {
      render(
        <EgoNetworkGraph
          center={CENTER}
          edges={[FON_ITEM, ASHANTI_ITEM]}
          onEdgeActivate={vi.fn()}
          onNodeActivate={vi.fn()}
        />
      );
      const application = screen.getByRole("application");

      fireEvent.keyDown(application, { key: "ArrowRight" });
      expect(screen.getByTestId("edge-0")).toHaveFocus();

      fireEvent.keyDown(application, { key: "ArrowRight" });
      expect(screen.getByTestId("node-0")).toHaveFocus();

      fireEvent.keyDown(application, { key: "ArrowRight" });
      expect(screen.getByTestId("edge-1")).toHaveFocus();

      fireEvent.keyDown(application, { key: "ArrowLeft" });
      expect(screen.getByTestId("node-0")).toHaveFocus();
    });

    // @req REQ-097
    it("Home returns focus to the center node", () => {
      render(
        <EgoNetworkGraph
          center={CENTER}
          edges={[FON_ITEM, ASHANTI_ITEM]}
          onEdgeActivate={vi.fn()}
          onNodeActivate={vi.fn()}
        />
      );
      const application = screen.getByRole("application");
      fireEvent.keyDown(application, { key: "ArrowRight" });
      fireEvent.keyDown(application, { key: "ArrowRight" });
      fireEvent.keyDown(application, { key: "Home" });
      expect(screen.getByTestId("center")).toHaveFocus();
    });

    // @req REQ-097
    it("Escape exits the graph without trapping focus", () => {
      render(
        <EgoNetworkGraph
          center={CENTER}
          edges={[FON_ITEM]}
          onEdgeActivate={vi.fn()}
          onNodeActivate={vi.fn()}
        />
      );
      const application = screen.getByRole("application");
      fireEvent.keyDown(application, { key: "ArrowRight" });
      expect(screen.getByTestId("edge-0")).toHaveFocus();

      fireEvent.keyDown(application, { key: "Escape" });
      expect(screen.getByTestId("edge-0")).not.toHaveFocus();
    });

    // @req REQ-097
    it("Enter on a sourced edge calls onEdgeActivate with the relation id", () => {
      const onEdgeActivate = vi.fn();
      render(
        <EgoNetworkGraph
          center={CENTER}
          edges={[FON_ITEM]}
          onEdgeActivate={onEdgeActivate}
          onNodeActivate={vi.fn()}
        />
      );
      const application = screen.getByRole("application");
      fireEvent.keyDown(application, { key: "ArrowRight" });
      fireEvent.keyDown(application, { key: "Enter" });
      expect(onEdgeActivate).toHaveBeenCalledWith("REL_YORUBA_FON_MIGRATION");
    });

    // @req REQ-097
    it("Enter on a derived edge calls onEdgeActivate with null (basis-only explanation)", () => {
      const onEdgeActivate = vi.fn();
      render(
        <EgoNetworkGraph
          center={CENTER}
          edges={[BAMILEKE_ITEM]}
          onEdgeActivate={onEdgeActivate}
          onNodeActivate={vi.fn()}
        />
      );
      const application = screen.getByRole("application");
      fireEvent.keyDown(application, { key: "ArrowRight" });
      fireEvent.keyDown(application, { key: "Enter" });
      expect(onEdgeActivate).toHaveBeenCalledWith(null);
    });

    // @req REQ-097
    it("Enter on a neighbor node calls onNodeActivate with the neighbor id, navigating", () => {
      const onNodeActivate = vi.fn();
      render(
        <EgoNetworkGraph
          center={CENTER}
          edges={[FON_ITEM]}
          onEdgeActivate={vi.fn()}
          onNodeActivate={onNodeActivate}
        />
      );
      const application = screen.getByRole("application");
      fireEvent.keyDown(application, { key: "ArrowRight" });
      fireEvent.keyDown(application, { key: "ArrowRight" });
      fireEvent.keyDown(application, { key: "Enter" });
      expect(onNodeActivate).toHaveBeenCalledWith("PPL_FON");
    });
  });

  describe("announcements", () => {
    // @req REQ-097
    it("announces the graph entry summary on mount via the aria-live polite region", () => {
      render(
        <EgoNetworkGraph
          center={CENTER}
          edges={[FON_ITEM]}
          onEdgeActivate={vi.fn()}
          onNodeActivate={vi.fn()}
        />
      );
      expect(screen.getByRole("status")).toHaveTextContent(
        /Graphe de relations centré sur Yoruba/
      );
    });

    // @req REQ-097
    it("mirrors each focus move through the aria-live polite region", () => {
      render(
        <EgoNetworkGraph
          center={CENTER}
          edges={[FON_ITEM]}
          onEdgeActivate={vi.fn()}
          onNodeActivate={vi.fn()}
        />
      );
      const application = screen.getByRole("application");
      fireEvent.keyDown(application, { key: "ArrowRight" });
      expect(screen.getByRole("status")).toHaveTextContent(
        /Lien Migratoire avec Fon/
      );
    });
  });

  // @req REQ-097
  it("resolves the mount fade through the --afh-duration-fade token (0.01ms under reduced motion)", () => {
    const { container } = render(
      <EgoNetworkGraph
        center={CENTER}
        edges={[FON_ITEM]}
        onEdgeActivate={vi.fn()}
        onNodeActivate={vi.fn()}
      />
    );
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("style")).toContain("var(--afh-duration-fade)");
  });

  describe("Accessibility (axe)", () => {
    // @req REQ-097
    it("has no axe violations with a populated ego network", async () => {
      const { container } = render(
        <EgoNetworkGraph
          center={CENTER}
          edges={[FON_ITEM, ASHANTI_ITEM, BAMILEKE_ITEM]}
          onEdgeActivate={vi.fn()}
          onNodeActivate={vi.fn()}
        />
      );
      await expectNoAxeViolations(container);
    });

    // @req REQ-097
    it("has no axe violations with a keyboard-focused edge", async () => {
      const { container } = render(
        <EgoNetworkGraph
          center={CENTER}
          edges={[FON_ITEM]}
          onEdgeActivate={vi.fn()}
          onNodeActivate={vi.fn()}
        />
      );
      fireEvent.keyDown(screen.getByRole("application"), {
        key: "ArrowRight",
      });
      await expectNoAxeViolations(container);
    });
  });
});
