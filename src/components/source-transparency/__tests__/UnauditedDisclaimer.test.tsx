import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { UnauditedDisclaimer } from "../UnauditedDisclaimer";

const FICHE = "PPL_YORUBA";
const DISMISS_KEY = `unaudited-disclaimer:dismissed:${FICHE}`;

describe("UnauditedDisclaimer", () => {
  beforeEach(() => {
    window.localStorage.clear();
    // Fix "today" for deterministic month-difference math.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-14T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    window.localStorage.clear();
  });

  describe("when lastHumanAuditAt is null", () => {
    it('renders the "fiche non auditée" banner', () => {
      render(<UnauditedDisclaimer lastHumanAuditAt={null} fiche={FICHE} />);
      expect(
        screen.getByText(/fiche non auditée — lire avec précaution/i)
      ).toBeTruthy();
    });

    it("uses role=region with the expected aria-label", () => {
      render(<UnauditedDisclaimer lastHumanAuditAt={null} fiche={FICHE} />);
      const region = screen.getByRole("region", {
        name: /avertissement vérification/i,
      });
      expect(region).toBeTruthy();
    });
  });

  describe("when lastHumanAuditAt is older than 18 months", () => {
    it("renders the 'dernière vérification' banner with a long French date", () => {
      // 2024-05-01 is > 18 months before 2026-05-14
      render(
        <UnauditedDisclaimer
          lastHumanAuditAt="2024-05-01T00:00:00.000Z"
          fiche={FICHE}
        />
      );
      // Long French date: e.g. "1 mai 2024"
      expect(
        screen.getByText(/dernière vérification\s*:\s*1\s+mai\s+2024/i)
      ).toBeTruthy();
      expect(screen.getByText(/à re-vérifier/i)).toBeTruthy();
    });
  });

  describe("when lastHumanAuditAt is less than 18 months old", () => {
    it("renders nothing", () => {
      // 2025-06-01 is ~11 months before 2026-05-14 → fresh
      const { container } = render(
        <UnauditedDisclaimer
          lastHumanAuditAt="2025-06-01T00:00:00.000Z"
          fiche={FICHE}
        />
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe("dismissal", () => {
    it("writes the dismiss flag to localStorage and unmounts the banner", () => {
      render(<UnauditedDisclaimer lastHumanAuditAt={null} fiche={FICHE} />);
      const closeBtn = screen.getByRole("button", {
        name: /fermer l'avertissement/i,
      });
      fireEvent.click(closeBtn);

      expect(window.localStorage.getItem(DISMISS_KEY)).toBe("1");
      expect(
        screen.queryByText(/fiche non auditée — lire avec précaution/i)
      ).toBeNull();
    });

    it("renders nothing on remount when dismissal is already in localStorage", () => {
      window.localStorage.setItem(DISMISS_KEY, "1");
      const { container } = render(
        <UnauditedDisclaimer lastHumanAuditAt={null} fiche={FICHE} />
      );
      expect(container.firstChild).toBeNull();
    });

    it("scopes dismissal per fiche", () => {
      window.localStorage.setItem("unaudited-disclaimer:dismissed:OTHER", "1");
      render(<UnauditedDisclaimer lastHumanAuditAt={null} fiche={FICHE} />);
      expect(
        screen.getByText(/fiche non auditée — lire avec précaution/i)
      ).toBeTruthy();
    });
  });
});
