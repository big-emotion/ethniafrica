import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConfidenceChip } from "../ConfidenceChip";

describe("ConfidenceChip", () => {
  beforeEach(() => {
    // Clear sessionStorage between tests so the one-shot pulse logic is consistent.
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.clear();
    }
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

      // Visible pill text — should contain the canonical separator and the ISO short date.
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

      // No <svg> icons in the chip.
      expect(container.querySelector("svg")).toBeNull();
      // No image either.
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
      // Long FR date for 2025-09-21 is "21 septembre 2025".
      expect(button).toHaveAttribute(
        "aria-label",
        "ouvrir la chaîne de sources pour cette assertion (confiance 87 %, 4 sources, vérifiée le 21 septembre 2025)"
      );
    });
  });

  describe("keyboard interaction", () => {
    it("invokes onOpen when Enter is pressed", () => {
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
      fireEvent.keyDown(button, { key: "Enter" });

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

      // No inline style or class should mention 'red' / 'destructive' / 'alarm'.
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

      // It should be a link (anchor), not a chip button.
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

  describe("tap target", () => {
    it("wrapper has padding so the tap target is comfortable (>=44px via padding utility)", () => {
      render(
        <ConfidenceChip
          confidenceScore={87}
          sourceCount={4}
          lastHumanAuditAt="2025-09-21"
        />
      );

      // The button (the actual tappable element) must carry inline-min sizing/padding
      // to guarantee a 44x44 tap target even when the visual pill is small.
      const button = screen.getByRole("button");
      // We assert the class list mentions tap-padding utilities; we don't measure pixels in happy-dom.
      const classes = button.className;
      expect(classes).toMatch(/min-h|min-w|p-/);
    });
  });
});
