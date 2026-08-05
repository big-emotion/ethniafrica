import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { FichePanel } from "../FichePanel";
import type { FichePanelProps } from "@/types/fiche";

const SOURCE_LINE = { label: "UNFPA, World Population Prospects 2025" };

const BASE_DATA: NonNullable<FichePanelProps["data"]> = {
  stepLabel: "01 · Origines",
  heading: "Les Yoruba",
  body: "Un peuple ouest-africain implanté au Nigeria, au Bénin et au Togo.",
};

function renderPanel(overrides: Partial<FichePanelProps> = {}) {
  return render(
    <FichePanel
      data={BASE_DATA}
      size="md"
      side="left"
      sourceLine={SOURCE_LINE}
      {...overrides}
    />
  );
}

/** Renders children inside an accent-scoped wrapper (ETNI-798 §4 scoping pattern). */
function renderInAccentScope(ui: React.ReactElement) {
  return render(
    <div
      style={
        {
          "--accent": "var(--afh-cat-teal)",
          "--accent-tint": "var(--afh-cat-teal-tint)",
        } as React.CSSProperties
      }
    >
      {ui}
    </div>
  );
}

describe("FichePanel", () => {
  describe("data-gating (FR98)", () => {
    // @req REQ-091
    it("renders zero DOM output when data is absent", () => {
      const { container } = render(
        <FichePanel size="md" side="left" sourceLine={SOURCE_LINE} />
      );
      expect(container.firstChild).toBeNull();
    });

    // @req REQ-091
    it("renders content when data is present", () => {
      const { container } = renderPanel();
      expect(container.firstChild).not.toBeNull();
    });
  });

  describe("chapter anatomy (FR99)", () => {
    // @req REQ-091
    it("emits the heading at H2", () => {
      renderPanel();
      expect(
        screen.getByRole("heading", { level: 2, name: "Les Yoruba" })
      ).toBeTruthy();
    });

    // @req REQ-091
    it("renders the step label", () => {
      renderPanel();
      expect(screen.getByText("01 · Origines")).toBeTruthy();
    });

    // @req REQ-091
    it("renders the required source-line slot with the given label", () => {
      renderPanel();
      expect(
        screen.getByText("UNFPA, World Population Prospects 2025")
      ).toBeTruthy();
    });

    // @req REQ-091
    it("renders the source-line as a link when an href is given", () => {
      renderPanel({
        sourceLine: { ...SOURCE_LINE, href: "https://unfpa.org" },
      });
      const link = screen.getByRole("link", {
        name: "UNFPA, World Population Prospects 2025",
      });
      expect(link.getAttribute("href")).toBe("https://unfpa.org");
    });

    // @req REQ-091
    it("renders the optional note when provided", () => {
      renderPanel({ data: { ...BASE_DATA, note: "Note contextuelle." } });
      expect(screen.getByText("Note contextuelle.")).toBeTruthy();
    });

    // @req REQ-091
    it("does not render a note element when omitted", () => {
      renderPanel();
      expect(screen.queryByText("Note contextuelle.")).toBeNull();
    });
  });

  describe("25-word body budget", () => {
    // @req REQ-091
    it("renders the body verbatim when within budget", () => {
      renderPanel();
      expect(screen.getByText(BASE_DATA.body)).toBeTruthy();
    });

    // @req REQ-091
    it("truncates the body to 25 words with an ellipsis when over budget", () => {
      const words = Array.from({ length: 40 }, (_, i) => `mot${i}`);
      const longBody = words.join(" ");
      renderPanel({ data: { ...BASE_DATA, body: longBody } });
      const expected = `${words.slice(0, 25).join(" ")}…`;
      expect(screen.getByText(expected)).toBeTruthy();
    });
  });

  describe("accent/mode via tokens only", () => {
    // @req REQ-091
    it("consumes var(--accent) and applies no hardcoded color literal", () => {
      const { container } = renderInAccentScope(
        <FichePanel
          data={BASE_DATA}
          size="md"
          side="left"
          sourceLine={SOURCE_LINE}
        />
      );
      const html = container.innerHTML;
      expect(html).toMatch(/var\(--accent\)/);
      expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(html).not.toMatch(/rgba?\(|hsl\(/);
    });
  });

  describe("canvas heights per size selector (FR100)", () => {
    // @req REQ-091
    it.each([
      ["sm", "300px"],
      ["md", "400px"],
      ["lg", "440px"],
    ] as const)(
      "size=%s maps to a %s canvas height",
      (size, expectedHeight) => {
        const { container } = renderPanel({ size });
        const canvas = container.querySelector<HTMLElement>(
          "[data-fiche-panel-canvas]"
        );
        expect(canvas).not.toBeNull();
        expect(canvas?.style.height).toBe(expectedHeight);
      }
    );
  });

  describe("alternating sides (FR100)", () => {
    // @req REQ-091
    it("orders the canvas before the text column when side is left", () => {
      const { container } = renderPanel({ side: "left" });
      const canvas = container.querySelector<HTMLElement>(
        "[data-fiche-panel-canvas]"
      );
      const text = container.querySelector<HTMLElement>(
        "[data-fiche-panel-text]"
      );
      expect(canvas?.className).toMatch(/order-1/);
      expect(text?.className).toMatch(/order-2/);
    });

    // @req REQ-091
    it("orders the canvas after the text column when side is right", () => {
      const { container } = renderPanel({ side: "right" });
      const canvas = container.querySelector<HTMLElement>(
        "[data-fiche-panel-canvas]"
      );
      const text = container.querySelector<HTMLElement>(
        "[data-fiche-panel-text]"
      );
      expect(canvas?.className).toMatch(/order-2/);
      expect(text?.className).toMatch(/order-1/);
    });
  });

  describe("reduced-motion (R5)", () => {
    // @req REQ-091
    it("gates hover motion behind motion-safe", () => {
      const { container } = renderPanel();
      expect(container.innerHTML).toMatch(/motion-safe:/);
    });
  });
});
