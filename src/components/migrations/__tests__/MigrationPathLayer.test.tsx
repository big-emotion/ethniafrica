import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MigrationPathLayer } from "../MigrationPathLayer";

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

beforeEach(() => {
  mockMatchMedia(false);
});

afterEach(() => {
  vi.restoreAllMocks();
});

const EVENTS = [
  {
    id: "MGR_A",
    nameMain: "Migration A",
    timeRange: { startYear: 1000, endYear: 1200, datingNote: null },
    geometry: {
      type: "LineString" as const,
      coordinates: [
        [0, 0],
        [10, 10],
      ] as Array<[number, number]>,
    },
  },
  {
    id: "MGR_B",
    nameMain: "Migration B",
    timeRange: { startYear: 1400, endYear: 1600, datingNote: null },
    geometry: {
      type: "LineString" as const,
      coordinates: [
        [5, 5],
        [15, 15],
      ] as Array<[number, number]>,
    },
  },
];

describe("MigrationPathLayer", () => {
  // @req REQ-101 FR78 FR79
  it("renders one path per event", () => {
    render(<MigrationPathLayer events={EVENTS} year={1100} />);
    expect(screen.getByTestId("migration-path-MGR_A")).toBeInTheDocument();
    expect(screen.getByTestId("migration-path-MGR_B")).toBeInTheDocument();
  });

  // @req REQ-101 FR79 ETNI-523
  it("keeps the svg decorative and its paths out of the tab order", () => {
    // The event list below (MigrationsAtlasView) already exposes the same
    // selection as accessible, keyboard-operable buttons — duplicating that
    // as per-path tab stops on the map would force keyboard/AT users through
    // every rendered path (up to 500, MAX_MIGRATIONS) before reaching the
    // scrubber or the list, breaking the "Tab to scrubber → Tab to list"
    // journey and reading as a keyboard trap (ETNI-523 AC2). The map stays a
    // pointer/touch-only visual affordance, aria-hidden like its
    // AfricaBasemap sibling.
    render(<MigrationPathLayer events={EVENTS} year={1100} />);
    const path = screen.getByTestId("migration-path-MGR_A");
    expect(path.closest("svg")).toHaveAttribute("aria-hidden", "true");
    expect(path).not.toHaveAttribute("tabindex");
    expect(path).not.toHaveAttribute("role");
  });

  // @req REQ-101 FR79
  it("marks events whose range contains the year as active via token + opacity, not color alone", () => {
    render(<MigrationPathLayer events={EVENTS} year={1100} />);
    const activePath = screen.getByTestId("migration-path-MGR_A");
    const inactivePath = screen.getByTestId("migration-path-MGR_B");

    expect(activePath).toHaveAttribute("data-active", "true");
    expect(inactivePath).toHaveAttribute("data-active", "false");
    // Active/inactive differ by stroke-width (never color alone, WCAG 1.4.1).
    expect(activePath.getAttribute("stroke-width")).not.toBe(
      inactivePath.getAttribute("stroke-width")
    );
  });

  // @req REQ-101 FR79
  it('announces "N migrations actives vers {année}" in an aria-live region', () => {
    render(<MigrationPathLayer events={EVENTS} year={1100} />);
    const announcement = screen.getByTestId("migration-active-announcement");
    expect(announcement).toHaveAttribute("aria-live", "polite");
    expect(announcement).toHaveTextContent("1 migrations actives vers 1100");
  });

  // @req REQ-101 FR79
  it("updates the announcement count when the year changes", () => {
    const { rerender } = render(
      <MigrationPathLayer events={EVENTS} year={100} />
    );
    expect(
      screen.getByTestId("migration-active-announcement")
    ).toHaveTextContent("0 migrations actives vers 100");

    rerender(<MigrationPathLayer events={EVENTS} year={1500} />);
    expect(
      screen.getByTestId("migration-active-announcement")
    ).toHaveTextContent("1 migrations actives vers 1500");
  });

  // @req REQ-101 FR79
  it("fires onSelect with the event id on pointer tap", () => {
    const onSelect = vi.fn();
    render(
      <MigrationPathLayer events={EVENTS} year={1100} onSelect={onSelect} />
    );
    fireEvent.click(screen.getByTestId("migration-path-MGR_A"));
    expect(onSelect).toHaveBeenCalledWith("MGR_A");
  });

  // @req REQ-101 FR79 ETNI-523
  it("does not respond to keyDown, since the path is not keyboard-reachable", () => {
    const onSelect = vi.fn();
    render(
      <MigrationPathLayer events={EVENTS} year={1100} onSelect={onSelect} />
    );
    fireEvent.keyDown(screen.getByTestId("migration-path-MGR_A"), {
      key: "Enter",
    });
    expect(onSelect).not.toHaveBeenCalled();
  });

  // @req REQ-101 FR79
  it("gives the selected event a wider stroke and a text label", () => {
    render(
      <MigrationPathLayer events={EVENTS} year={1100} selectedId="MGR_A" />
    );
    const selectedPath = screen.getByTestId("migration-path-MGR_A");
    const unselectedPath = screen.getByTestId("migration-path-MGR_B");

    expect(selectedPath).toHaveAttribute("data-selected", "true");
    expect(Number(selectedPath.getAttribute("stroke-width"))).toBeGreaterThan(
      Number(unselectedPath.getAttribute("stroke-width"))
    );
    expect(screen.getByTestId("migration-label-MGR_A")).toHaveTextContent(
      "Migration A"
    );
    expect(
      screen.queryByTestId("migration-label-MGR_B")
    ).not.toBeInTheDocument();
  });

  // @req REQ-101 ETNI-1103
  it("marks motion as instant (opacity-only, no transition) when reduced motion is preferred", () => {
    mockMatchMedia(true);
    render(<MigrationPathLayer events={EVENTS} year={1100} />);

    expect(
      screen.getByTestId("migration-active-announcement").parentElement
    ).toHaveAttribute("data-motion", "instant");
    const path = screen.getByTestId("migration-path-MGR_A");
    expect(path).toHaveClass("transition-none");
  });

  // @req REQ-101 ETNI-1103
  it("marks motion as smooth by default", () => {
    render(<MigrationPathLayer events={EVENTS} year={1100} />);

    expect(
      screen.getByTestId("migration-active-announcement").parentElement
    ).toHaveAttribute("data-motion", "smooth");
    expect(screen.getByTestId("migration-path-MGR_A")).toHaveClass(
      "transition-opacity"
    );
  });

  // @req REQ-101 ETNI-1103
  it("never advances the year or calls onSelect on its own (no autoplay)", () => {
    vi.useFakeTimers();
    const onSelect = vi.fn();
    render(
      <MigrationPathLayer events={EVENTS} year={1100} onSelect={onSelect} />
    );

    vi.advanceTimersByTime(60_000);

    expect(onSelect).not.toHaveBeenCalled();
    expect(
      screen.getByTestId("migration-active-announcement")
    ).toHaveTextContent("1 migrations actives vers 1100");
    vi.useRealTimers();
  });
});
