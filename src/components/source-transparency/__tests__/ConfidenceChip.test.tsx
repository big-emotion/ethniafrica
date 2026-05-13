import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConfidenceChip } from "../ConfidenceChip";

describe("ConfidenceChip", () => {
  beforeEach(() => {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.clear();
    }
    document.getElementById("afh-chip-keyframes")?.remove();
  });

  describe("rendering with complete data", () => {
    it("renders the typographic pill with confidence score, source count and audit date", () => {
      render(
        <ConfidenceChip
          confidenceScore={87}
          sourceCount={4}
          lastHumanAuditAt="2025-09-21"
        />
      );

      expect(
        screen.getByText(/87\s*%\s*·\s*4\s*sources\s*·\s*vérifié\s*2025-09-21/i)
      ).toBeInTheDocument();
    });

    it("renders no emoji or icon — only typographic content", () => {
      const { container } = render(
        <ConfidenceChip
          confidenceScore={87}
          sourceCount={4}
          lastHumanAuditAt="2025-09-21"
        />
      );

      expect(container.querySelector("svg")).toBeNull();
      expect(container.querySelector("img")).toBeNull();
    });
  });

  describe("aria-label", () => {
    it("matches the exact French template using a long French date", () => {
      render(
        <ConfidenceChip
          confidenceScore={87}
          sourceCount={4}
          lastHumanAuditAt="2025-09-21"
        />
      );

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute(
        "aria-label",
        "ouvrir la chaîne de sources pour cette assertion (confiance 87 %, 4 sources, vérifiée le 21 septembre 2025)"
      );
    });

    it("renders the long French date in a TZ-stable way (no off-by-one)", () => {
      render(
        <ConfidenceChip
          confidenceScore={87}
          sourceCount={4}
          lastHumanAuditAt="2025-09-21"
        />
      );

      const button = screen.getByRole("button");
      expect(button.getAttribute("aria-label")).toMatch(/21 septembre 2025/);
    });
  });

  describe("keyboard interaction", () => {
    it("invokes onOpen exactly once when activated (native click fired by Enter/Space)", () => {
      const onOpen = vi.fn();
      render(
        <ConfidenceChip
          confidenceScore={87}
          sourceCount={4}
          lastHumanAuditAt="2025-09-21"
          onOpen={onOpen}
        />
      );

      const button = screen.getByRole("button");
      button.focus();
      // Simulate the browser's native activation: keydown then click (no double-fire).
      fireEvent.keyDown(button, { key: "Enter" });
      fireEvent.click(button);

      expect(onOpen).toHaveBeenCalledTimes(1);
    });

    it("invokes onOpen when the chip is clicked", () => {
      const onOpen = vi.fn();
      render(
        <ConfidenceChip
          confidenceScore={87}
          sourceCount={4}
          lastHumanAuditAt="2025-09-21"
          onOpen={onOpen}
        />
      );

      fireEvent.click(screen.getByRole("button"));
      expect(onOpen).toHaveBeenCalledTimes(1);
    });
  });

  describe("variant='contested'", () => {
    it("renders without any red color or alarm styling", () => {
      const { container } = render(
        <ConfidenceChip
          confidenceScore={42}
          sourceCount={2}
          lastHumanAuditAt="2025-09-21"
          variant="contested"
        />
      );

      const html = container.innerHTML.toLowerCase();
      expect(html).not.toMatch(/\bred\b/);
      expect(html).not.toMatch(/destructive/);
      expect(html).not.toMatch(/alarm/);
    });

    it("still renders the canonical pill text in contested variant", () => {
      render(
        <ConfidenceChip
          confidenceScore={42}
          sourceCount={2}
          lastHumanAuditAt="2025-09-21"
          variant="contested"
        />
      );

      expect(
        screen.getByText(/42\s*%\s*·\s*2\s*sources\s*·\s*vérifié\s*2025-09-21/i)
      ).toBeInTheDocument();
    });
  });

  describe("fallback when data is missing", () => {
    it("renders a 'voir les sources' link when confidenceScore is null", () => {
      render(
        <ConfidenceChip
          confidenceScore={null}
          sourceCount={4}
          lastHumanAuditAt="2025-09-21"
        />
      );

      expect(screen.queryByRole("button")).toBeNull();
      expect(screen.getByText(/voir les sources/i)).toBeInTheDocument();
    });

    it("renders a 'voir les sources' link when sourceCount is null", () => {
      render(
        <ConfidenceChip
          confidenceScore={87}
          sourceCount={null}
          lastHumanAuditAt="2025-09-21"
        />
      );

      expect(screen.getByText(/voir les sources/i)).toBeInTheDocument();
    });

    it("renders a 'voir les sources' link when lastHumanAuditAt is null", () => {
      render(
        <ConfidenceChip
          confidenceScore={87}
          sourceCount={4}
          lastHumanAuditAt={null}
        />
      );

      expect(screen.getByText(/voir les sources/i)).toBeInTheDocument();
    });
  });

  describe("tap target (WCAG 2.5.5 / 2.5.8)", () => {
    it("button carries 44x44 min sizing utilities directly", () => {
      render(
        <ConfidenceChip
          confidenceScore={87}
          sourceCount={4}
          lastHumanAuditAt="2025-09-21"
        />
      );

      const button = screen.getByRole("button");
      const classes = button.className;
      expect(classes).toContain("min-h-[44px]");
      expect(classes).toContain("min-w-[44px]");
    });
  });

  describe("per-chip session pulse", () => {
    it("records the chip id in sessionStorage on first render", () => {
      render(
        <ConfidenceChip
          id="chip-a"
          confidenceScore={87}
          sourceCount={4}
          lastHumanAuditAt="2025-09-21"
        />
      );

      const raw = sessionStorage.getItem("afh-chip-pulsed-ids");
      expect(raw).not.toBeNull();
      expect(JSON.parse(raw!)).toContain("chip-a");
    });

    it("tracks distinct ids independently — each new chip id is added to the set", () => {
      const { rerender } = render(
        <ConfidenceChip
          id="chip-a"
          confidenceScore={87}
          sourceCount={4}
          lastHumanAuditAt="2025-09-21"
        />
      );
      rerender(
        <ConfidenceChip
          id="chip-b"
          confidenceScore={87}
          sourceCount={4}
          lastHumanAuditAt="2025-09-21"
        />
      );

      const raw = sessionStorage.getItem("afh-chip-pulsed-ids");
      expect(raw).not.toBeNull();
      const ids = JSON.parse(raw!);
      expect(ids).toContain("chip-a");
      expect(ids).toContain("chip-b");
    });
  });

  describe("keyframes injection", () => {
    it("injects the keyframes <style> only once even with multiple chips", () => {
      render(
        <>
          <ConfidenceChip
            id="chip-1"
            confidenceScore={87}
            sourceCount={4}
            lastHumanAuditAt="2025-09-21"
          />
          <ConfidenceChip
            id="chip-2"
            confidenceScore={87}
            sourceCount={4}
            lastHumanAuditAt="2025-09-21"
          />
          <ConfidenceChip
            id="chip-3"
            confidenceScore={87}
            sourceCount={4}
            lastHumanAuditAt="2025-09-21"
          />
        </>
      );

      const styles = document.querySelectorAll("style#afh-chip-keyframes");
      expect(styles.length).toBe(1);
    });
  });
});
