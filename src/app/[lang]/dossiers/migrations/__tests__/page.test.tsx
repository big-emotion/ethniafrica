import { render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockListMigrations,
  mockGetMigrationById,
  MockMigrationsDataAccessError,
  mockLoggerError,
} = vi.hoisted(() => {
  class MockMigrationsDataAccessError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "MigrationsDataAccessError";
    }
  }
  return {
    mockListMigrations: vi.fn(),
    mockGetMigrationById: vi.fn(),
    MockMigrationsDataAccessError,
    mockLoggerError: vi.fn(),
  };
});

vi.mock("@/api/v2/services/migrations", () => ({
  listMigrations: (...args: unknown[]) => mockListMigrations(...args),
  getMigrationById: (...args: unknown[]) => mockGetMigrationById(...args),
  MigrationsDataAccessError: MockMigrationsDataAccessError,
}));

vi.mock("@/lib/api/logger", () => ({
  logger: {
    error: mockLoggerError,
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/migrations/MigrationsAtlasView", () => ({
  MigrationsAtlasView: () => <div data-testid="migrations-atlas-view" />,
}));

vi.mock("@/components/migrations/MigrationNarrative", () => ({
  MigrationNarrative: ({ events }: { events: { id: string }[] }) => (
    <div data-testid="migrations-narrative" data-count={events.length} />
  ),
}));

import MigrationsPage from "../page";
import { getLocalizedRoute } from "@/lib/routing";

function makeDetail(
  id: string,
  peoples: { id: string; nameMain: string; role: string }[] = []
) {
  return {
    record: {
      id,
      nameMain: `Migration ${id}`,
      migrationGroup: null,
      eventType: "expansion" as const,
      classificationStatus: "consensual" as const,
      timeRange: { startYear: 0, endYear: 100, datingNote: null },
      summary: "Summary",
      geometry: { type: "LineString" as const, coordinates: [] },
      narrative: "Narrative text.",
      debate: null,
      peoples,
      sources: [],
    },
    confidence: 80,
  };
}

function renderPage(searchParams: { peuple?: string } = {}, lang = "fr") {
  return MigrationsPage({
    params: Promise.resolve({ lang }),
    searchParams: Promise.resolve(searchParams),
  });
}

describe("/[lang]/migrations page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-101 FR81
  it("renders both the Carte and Récit panels server-side (no-JS completeness)", async () => {
    mockListMigrations.mockResolvedValue({
      data: [{ id: "MGR_A" }, { id: "MGR_B" }],
      total: 2,
    });
    mockGetMigrationById.mockImplementation(async (id: string) =>
      makeDetail(id)
    );

    render(await renderPage());

    expect(screen.getByTestId("migrations-atlas-view")).toBeInTheDocument();
    expect(screen.getByTestId("migrations-narrative")).toHaveAttribute(
      "data-count",
      "2"
    );
  });

  // @req REQ-101 FR81
  it("drops migrations whose detail lookup returns null", async () => {
    mockListMigrations.mockResolvedValue({
      data: [{ id: "MGR_A" }, { id: "MGR_MISSING" }],
      total: 2,
    });
    mockGetMigrationById.mockImplementation(async (id: string) =>
      id === "MGR_MISSING" ? null : makeDetail(id)
    );

    render(await renderPage());

    expect(screen.getByTestId("migrations-narrative")).toHaveAttribute(
      "data-count",
      "1"
    );
  });

  // @req REQ-107
  it("renders the not-yet-published empty state when the corpus is empty and no filter is active", async () => {
    mockListMigrations.mockResolvedValue({ data: [], total: 0 });

    render(await renderPage());

    expect(screen.getByTestId("state-copy")).toHaveTextContent(
      "Aucune migration n'est encore publiée."
    );
    expect(screen.queryByTestId("migrations-narrative")).toBeNull();
    expect(screen.queryByTestId("migrations-atlas-view")).toBeNull();
  });

  // @req REQ-107
  it("renders a failure state (not an empty state) when the data access fails, and logs it", async () => {
    mockListMigrations.mockRejectedValue(
      new MockMigrationsDataAccessError("infinite recursion detected")
    );

    render(await renderPage());

    expect(screen.getByTestId("state-copy")).toHaveTextContent(
      "n'ont pas pu être chargées"
    );
    const retry = screen.getByTestId("retry");
    expect(retry).toHaveAttribute(
      "href",
      getLocalizedRoute("fr", "migrations")
    );
    expect(screen.queryByTestId("migrations-narrative")).toBeNull();
    expect(mockLoggerError).toHaveBeenCalled();
  });

  // @req FR83
  describe("?peuple filtering", () => {
    beforeEach(() => {
      mockListMigrations.mockResolvedValue({
        data: [{ id: "MGR_A" }, { id: "MGR_B" }],
        total: 2,
      });
      mockGetMigrationById.mockImplementation(async (id: string) =>
        id === "MGR_A"
          ? makeDetail(id, [
              { id: "PPL_BANTU", nameMain: "Peuples bantous", role: "origin" },
            ])
          : makeDetail(id, [
              { id: "PPL_OTHER", nameMain: "Autre peuple", role: "origin" },
            ])
      );
    });

    // @req REQ-101 FR83
    it("filters the narrative to only events linked to ?peuple=PPL_X", async () => {
      render(await renderPage({ peuple: "PPL_BANTU" }));

      expect(screen.getByTestId("migrations-narrative")).toHaveAttribute(
        "data-count",
        "1"
      );
    });

    // @req REQ-101 FR83
    it("renders a dismissible filter chip naming the filtered people", async () => {
      render(await renderPage({ peuple: "PPL_BANTU" }));

      expect(screen.getByText(/Peuples bantous/)).toBeInTheDocument();
      const clearLink = screen.getByRole("link", {
        name: "Retirer le filtre",
      });
      expect(clearLink).toHaveAttribute(
        "href",
        getLocalizedRoute("fr", "migrations")
      );
    });

    // @req REQ-101 FR83
    it("renders no filter chip and the full narrative when no ?peuple param is present", async () => {
      render(await renderPage());

      expect(
        screen.queryByRole("link", { name: "Retirer le filtre" })
      ).toBeNull();
      expect(screen.getByTestId("migrations-narrative")).toHaveAttribute(
        "data-count",
        "2"
      );
    });

    // @req REQ-101 FR83
    it("falls back to the raw id in the chip when no event exposes the people's name", async () => {
      render(await renderPage({ peuple: "PPL_UNKNOWN" }));

      expect(screen.getAllByText(/PPL_UNKNOWN/).length).toBeGreaterThan(0);
      expect(screen.queryByTestId("migrations-narrative")).toBeNull();
    });

    // @req REQ-107
    it("renders the filtered-empty state naming the filter and offering to clear it, instead of an empty narrative", async () => {
      render(await renderPage({ peuple: "PPL_UNKNOWN" }));

      expect(screen.getByTestId("state-copy")).toHaveTextContent(
        /Aucune migration ne correspond à ce filtre/
      );
      expect(screen.getAllByText(/PPL_UNKNOWN/).length).toBeGreaterThan(0);
      const clearLink = screen.getByRole("link", {
        name: "Retirer le filtre",
      });
      expect(clearLink).toHaveAttribute(
        "href",
        getLocalizedRoute("fr", "migrations")
      );
    });
  });
});
