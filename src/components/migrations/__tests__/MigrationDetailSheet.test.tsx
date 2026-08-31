import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MigrationDetailSheet } from "../MigrationDetailSheet";
import type { MigrationAtlasEntry } from "@/lib/migrationDataTransformer";
import { getPeopleRoute } from "@/lib/routing";

const EVENT: MigrationAtlasEntry = {
  id: "MGR_A",
  nameMain: "Grande expansion bantoue",
  eventType: "expansion",
  classificationStatus: "contested",
  timeRange: { startYear: -1000, endYear: 500, datingNote: "estimation" },
  geometry: { type: "LineString", coordinates: [] },
  peoples: [{ id: "PPL_BANTU", nameMain: "Peuples bantous", role: "origin" }],
  sources: [
    {
      id: "src-1",
      title: "Ethnologue",
      url: "https://example.org/1",
      tier: "official",
    },
    { id: "src-2", title: "Rapport UNESCO", url: null, tier: "referenced" },
  ],
  confidence: { score: 88, sourceCount: 2, lastHumanAuditAt: "2026-01-05" },
};

function setViewportWidth(width: number, reducedMotion = false) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("min-width: 720px")
        ? width >= 720
        : query === "(prefers-reduced-motion: reduce)"
          ? reducedMotion
          : false,
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

beforeEach(() => {
  setViewportWidth(1280);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("MigrationDetailSheet", () => {
  // @req REQ-101 FR78 FR79 FR82
  it("renders nothing when there is no selected event", () => {
    const { container } = render(
      <MigrationDetailSheet open={false} onOpenChange={vi.fn()} event={null} />
    );
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  // @req REQ-101 FR78 FR79 FR82
  it("renders period, classification badge, confidence chip and linked peoples", () => {
    render(<MigrationDetailSheet open onOpenChange={vi.fn()} event={EVENT} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/1000 av\. J\.-C\./)).toBeInTheDocument();
    expect(screen.getByText(/estimation/)).toBeInTheDocument();
    expect(screen.getByTestId("classification-icon")).toBeInTheDocument();
    expect(screen.getByText(/88 %/)).toBeInTheDocument();

    const peopleLink = screen.getByRole("link", { name: /Peuples bantous/ });
    expect(peopleLink).toHaveAttribute(
      "href",
      getPeopleRoute("fr", "PPL_BANTU")
    );
  });

  // @req REQ-101 UX-DR30
  it("renders as a bottom sheet under 720px and a side sheet at/above 720px", () => {
    setViewportWidth(500);
    const { rerender } = render(
      <MigrationDetailSheet open onOpenChange={vi.fn()} event={EVENT} />
    );
    expect(screen.getByRole("dialog")).toHaveAttribute(
      "data-variant",
      "bottom"
    );

    setViewportWidth(1024);
    rerender(
      <MigrationDetailSheet open onOpenChange={vi.fn()} event={EVENT} />
    );
    expect(screen.getByRole("dialog")).toHaveAttribute("data-variant", "side");
  });

  // @req REQ-101 FR78
  it("opens the lazy SourceChainSheet when a source chip is activated", async () => {
    render(<MigrationDetailSheet open onOpenChange={vi.fn()} event={EVENT} />);

    fireEvent.click(screen.getByTestId("migration-source-chip-src-1"));

    await waitFor(() => {
      expect(screen.getByTestId("section-sources")).toBeInTheDocument();
    });
  });

  // @req REQ-101 UX-DR29
  it("calls onOpenChange(false) when Escape is pressed", () => {
    const onOpenChange = vi.fn();
    render(
      <MigrationDetailSheet open onOpenChange={onOpenChange} event={EVENT} />
    );
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  // @req REQ-101 UX-DR29
  it("closes on swipe-down in the bottom variant", () => {
    setViewportWidth(500);
    const onOpenChange = vi.fn();
    render(
      <MigrationDetailSheet open onOpenChange={onOpenChange} event={EVENT} />
    );
    const dialog = screen.getByRole("dialog");
    fireEvent.touchStart(dialog, {
      touches: [{ clientY: 100, clientX: 0 }],
      changedTouches: [{ clientY: 100, clientX: 0 }],
    });
    fireEvent.touchMove(dialog, {
      touches: [{ clientY: 220, clientX: 0 }],
      changedTouches: [{ clientY: 220, clientX: 0 }],
    });
    fireEvent.touchEnd(dialog, {
      changedTouches: [{ clientY: 220, clientX: 0 }],
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  // @req REQ-101 UX-DR29
  it("closes when the Android hardware back button fires (popstate)", () => {
    const onOpenChange = vi.fn();
    render(
      <MigrationDetailSheet open onOpenChange={onOpenChange} event={EVENT} />
    );
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  // @req REQ-101 ETNI-1103
  it("collapses the open/close animation to 0.01ms when reduced motion is preferred", () => {
    setViewportWidth(1280, true);
    render(<MigrationDetailSheet open onOpenChange={vi.fn()} event={EVENT} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("data-reduced-motion", "true");
    expect(dialog.style.animationDuration).toBe("0.01ms");
  });

  // @req REQ-101 ETNI-1103
  it("does not force an animation duration by default", () => {
    render(<MigrationDetailSheet open onOpenChange={vi.fn()} event={EVENT} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("data-reduced-motion", "false");
    expect(dialog.style.animationDuration).toBe("");
  });
});
