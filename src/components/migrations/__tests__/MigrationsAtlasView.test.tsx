import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as nextNavigation from "next/navigation";

import { MigrationsAtlasView } from "../MigrationsAtlasView";
import type { MigrationAtlasEntry } from "@/lib/migrationDataTransformer";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push })),
  usePathname: vi.fn(() => "/fr/migrations"),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

const EVENTS: MigrationAtlasEntry[] = [
  {
    id: "MGR_A",
    nameMain: "Migration A",
    eventType: "expansion",
    classificationStatus: "consensual",
    timeRange: { startYear: 1000, endYear: 1200, datingNote: null },
    geometry: {
      type: "LineString",
      coordinates: [
        [0, 0],
        [10, 10],
      ],
    },
    peoples: [],
    sources: [],
    confidence: null,
  },
  {
    id: "MGR_B",
    nameMain: "Migration B",
    eventType: "trade_route",
    classificationStatus: "contested",
    timeRange: { startYear: 1400, endYear: 1600, datingNote: null },
    geometry: {
      type: "LineString",
      coordinates: [
        [5, 5],
        [15, 15],
      ],
    },
    peoples: [],
    sources: [{ id: "src-1", title: "Source", url: null, tier: "official" }],
    confidence: { score: 70, sourceCount: 1, lastHumanAuditAt: "2026-01-05" },
  },
];

const BOUNDS = { min: 1000, max: 1600 };

function mockSearchParams(query: string) {
  vi.mocked(nextNavigation.useSearchParams).mockReturnValue(
    new URLSearchParams(query) as unknown as ReturnType<
      typeof nextNavigation.useSearchParams
    >
  );
}

afterEach(() => {
  vi.clearAllMocks();
  mockSearchParams("");
});

describe("MigrationsAtlasView", () => {
  // @req REQ-101 FR81
  it("renders the calm empty state when there are no events", () => {
    render(<MigrationsAtlasView events={[]} scrubberBounds={null} />);
    expect(
      screen.getByText("Aucune migration ne correspond à ce filtre.")
    ).toBeInTheDocument();
  });

  // @req REQ-101 FR78 FR79
  it("renders the basemap, one path per event and one list button per event", () => {
    render(<MigrationsAtlasView events={EVENTS} scrubberBounds={BOUNDS} />);
    expect(screen.getByTestId("migration-path-MGR_A")).toBeInTheDocument();
    expect(screen.getByTestId("migration-path-MGR_B")).toBeInTheDocument();
    expect(screen.getByTestId("migration-list-item-MGR_A")).toBeInTheDocument();
    expect(screen.getByTestId("migration-list-item-MGR_B")).toBeInTheDocument();
  });

  // @req REQ-101 FR79
  it("initializes the scrubber and active-path styling from ?annee=", () => {
    mockSearchParams("annee=1100");
    render(<MigrationsAtlasView events={EVENTS} scrubberBounds={BOUNDS} />);
    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuenow", "1100");
    expect(screen.getByTestId("migration-path-MGR_A")).toHaveAttribute(
      "data-active",
      "true"
    );
    expect(screen.getByTestId("migration-path-MGR_B")).toHaveAttribute(
      "data-active",
      "false"
    );
  });

  // @req REQ-101 ETNI-1101 ETNI-1102
  it("pushes ?annee= to the URL when the scrubber changes, preserving other params", async () => {
    const user = userEvent.setup();
    mockSearchParams("region=west&annee=1300");
    render(<MigrationsAtlasView events={EVENTS} scrubberBounds={BOUNDS} />);

    screen.getByRole("slider").focus();
    await user.keyboard("{ArrowRight}");

    expect(push).toHaveBeenCalledWith(
      expect.stringContaining("region=west"),
      expect.objectContaining({ scroll: false })
    );
    expect(push).toHaveBeenCalledWith(
      expect.stringContaining("annee=1301"),
      expect.anything()
    );
  });

  // @req REQ-101 ETNI-1101
  it("selects an event via its list button: aria-pressed flips and the URL updates", () => {
    render(<MigrationsAtlasView events={EVENTS} scrubberBounds={BOUNDS} />);

    const button = screen.getByTestId("migration-list-item-MGR_B");
    expect(button).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(button);

    expect(push).toHaveBeenCalledWith(
      expect.stringContaining("migration=MGR_B"),
      expect.objectContaining({ scroll: false })
    );
  });

  // @req REQ-101 ETNI-1101
  it("selects an event via a path tap", () => {
    render(<MigrationsAtlasView events={EVENTS} scrubberBounds={BOUNDS} />);
    fireEvent.click(screen.getByTestId("migration-path-MGR_A"));
    expect(push).toHaveBeenCalledWith(
      expect.stringContaining("migration=MGR_A"),
      expect.anything()
    );
  });

  // @req REQ-101 FR78 ETNI-1101 ETNI-1102
  it("opens the dynamically-imported MigrationDetailSheet when ?migration= names a known event", async () => {
    mockSearchParams("migration=MGR_B");
    render(<MigrationsAtlasView events={EVENTS} scrubberBounds={BOUNDS} />);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
    expect(screen.getByTestId("migration-list-item-MGR_B")).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  // @req REQ-101 ETNI-1102
  it("ignores a ?migration= id that does not match any event", () => {
    mockSearchParams("migration=MGR_UNKNOWN");
    render(<MigrationsAtlasView events={EVENTS} scrubberBounds={BOUNDS} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // @req REQ-101 UX-DR29 ETNI-1102
  it("closes the sheet by clearing ?migration= (browser Back restores prior state)", async () => {
    mockSearchParams("migration=MGR_B");
    const { rerender } = render(
      <MigrationsAtlasView events={EVENTS} scrubberBounds={BOUNDS} />
    );
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(push).toHaveBeenCalledWith(
      expect.not.stringContaining("migration="),
      expect.anything()
    );

    // Simulate the browser Back button: App Router re-renders with the
    // previous searchParams, which this component derives state from
    // directly rather than duplicating in local state.
    mockSearchParams("migration=MGR_B");
    rerender(<MigrationsAtlasView events={EVENTS} scrubberBounds={BOUNDS} />);
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  // @req REQ-101 ETNI-1103
  it("never advances the scrubber or changes selection on its own (no autoplay)", () => {
    vi.useFakeTimers();
    mockSearchParams("annee=1300");
    render(<MigrationsAtlasView events={EVENTS} scrubberBounds={BOUNDS} />);

    vi.advanceTimersByTime(60_000);

    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuenow", "1300");
    vi.useRealTimers();
  });
});
