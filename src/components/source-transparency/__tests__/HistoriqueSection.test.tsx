import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { HistoriqueSection } from "../HistoriqueSection";

/* -------------------------------------------------------------------------- */
/*  Fixtures                                                                   */
/* -------------------------------------------------------------------------- */

const revision1 = {
  version: 2,
  published_at: "2026-02-20T14:00:00Z",
  moderator_pseudonym: "mod-abc12345",
  reason: "Enrichissement des données culturelles.",
  pinned_url: "/api/v2/peoples/PPL_SEEREER/versions/2",
};

const revision2 = {
  version: 1,
  published_at: "2025-11-05T09:00:00Z",
  moderator_pseudonym: "mod-xyz99887",
  reason: "Publication initiale.",
  pinned_url: "/api/v2/peoples/PPL_SEEREER/versions/1",
};

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function mockFetch(data: unknown[], ok = true) {
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    json: async () => ({
      data,
      meta: { pagination: { limit: 100, next_cursor: null } },
      errors: [],
    }),
  });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/* -------------------------------------------------------------------------- */
/*  Tests                                                                      */
/* -------------------------------------------------------------------------- */

describe("HistoriqueSection", () => {
  it("renders the 'Historique' heading", async () => {
    mockFetch([revision1]);
    render(<HistoriqueSection peopleId="PPL_SEEREER" />);
    expect(
      screen.getByRole("heading", { name: /historique/i })
    ).toBeInTheDocument();
  });

  it("renders revision list with version, date, moderator", async () => {
    mockFetch([revision1, revision2]);
    render(<HistoriqueSection peopleId="PPL_SEEREER" />);
    await waitFor(() => {
      expect(screen.getByTestId("historique-row-2")).toBeInTheDocument();
      expect(screen.getByTestId("historique-row-1")).toBeInTheDocument();
    });
    expect(screen.getByText("v2")).toBeInTheDocument();
    expect(screen.getByText("mod-abc12345")).toBeInTheDocument();
  });

  it("renders date in long French format", async () => {
    mockFetch([revision1]);
    render(<HistoriqueSection peopleId="PPL_SEEREER" />);
    await waitFor(() => {
      expect(screen.getByTestId("historique-row-2")).toBeInTheDocument();
    });
    expect(screen.getByText(/20 février 2026/i)).toBeInTheDocument();
  });

  it("renders empty state with calm copy when no revisions", async () => {
    mockFetch([]);
    render(<HistoriqueSection peopleId="PPL_SEEREER" />);
    await waitFor(() => {
      expect(
        screen.getByText("Aucune révision publiée — fiche initiale")
      ).toBeInTheDocument();
    });
  });

  it("renders error state with retry button on failure", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
    render(<HistoriqueSection peopleId="PPL_SEEREER" />);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /réessayer/i })
      ).toBeInTheDocument();
    });
  });

  it("each row links to its pinned_url", async () => {
    mockFetch([revision1]);
    render(<HistoriqueSection peopleId="PPL_SEEREER" />);
    await waitFor(() => {
      expect(screen.getByTestId("historique-row-2")).toBeInTheDocument();
    });
    const link = screen.getByRole("link", { name: /v2/i });
    expect(link).toHaveAttribute("href", revision1.pinned_url);
  });
});
