import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import RevisionDrawer, { type RevisionDrawerProps } from "../RevisionDrawer";

/* -------------------------------------------------------------------------- */
/*  Fixtures                                                                   */
/* -------------------------------------------------------------------------- */

const revision1 = {
  version: 3,
  published_at: "2026-03-15T10:30:00Z",
  moderator_pseudonym: "mod-abc12345",
  reason: "Mise à jour des données démographiques 2025.",
  pinned_url: "/api/v2/peoples/PPL_YORUBA/versions/3",
};

const revision2 = {
  version: 2,
  published_at: "2026-01-10T08:00:00Z",
  moderator_pseudonym: "mod-def67890",
  reason: "Correction orthographique.",
  pinned_url: "/api/v2/peoples/PPL_YORUBA/versions/2",
};

const longReason =
  "Ceci est une raison très longue qui dépasse largement la limite de quatre-vingts caractères pour vérifier la troncature et le bouton 'Voir plus'.";

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function mockFetch(
  data: unknown[],
  nextCursor: number | null = null,
  ok = true
) {
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    json: async () => ({
      data,
      meta: { pagination: { limit: 20, next_cursor: nextCursor } },
      errors: [],
    }),
  });
}

function renderDrawer(override: Partial<RevisionDrawerProps> = {}) {
  const onOpenChange = vi.fn();
  const props: RevisionDrawerProps = {
    open: true,
    onOpenChange,
    peopleId: "PPL_YORUBA",
    ...override,
  };
  const utils = render(<RevisionDrawer {...props} />);
  return { ...utils, onOpenChange };
}

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/* -------------------------------------------------------------------------- */
/*  Tests                                                                      */
/* -------------------------------------------------------------------------- */

describe("RevisionDrawer", () => {
  it("renders a dialog with accessible title and description", async () => {
    mockFetch([revision1]);
    renderDrawer();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText("Historique des révisions")).toBeInTheDocument();
  });

  it("renders revision rows after successful fetch", async () => {
    mockFetch([revision1, revision2]);
    renderDrawer();
    await waitFor(() => {
      expect(screen.getByTestId("revision-row-3")).toBeInTheDocument();
      expect(screen.getByTestId("revision-row-2")).toBeInTheDocument();
    });
    expect(screen.getByText("v3")).toBeInTheDocument();
    expect(screen.getByText("mod-abc12345")).toBeInTheDocument();
  });

  it("displays publication date in long French format", async () => {
    mockFetch([revision1]);
    renderDrawer();
    await waitFor(() => {
      expect(screen.getByTestId("revision-row-3")).toBeInTheDocument();
    });
    // "15 mars 2026" in French long format
    expect(screen.getByText(/15 mars 2026/i)).toBeInTheDocument();
  });

  it("renders empty state when no revisions", async () => {
    mockFetch([]);
    renderDrawer();
    await waitFor(() => {
      expect(
        screen.getByText("Aucune révision publiée — fiche initiale")
      ).toBeInTheDocument();
    });
  });

  it("renders error state with retry button on fetch failure", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
    renderDrawer();
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /réessayer/i })
      ).toBeInTheDocument();
    });
  });

  it("retry button refetches data", async () => {
    global.fetch = vi
      .fn()
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: [revision1],
          meta: { pagination: { limit: 20, next_cursor: null } },
          errors: [],
        }),
      });
    renderDrawer();
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /réessayer/i })
      ).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /réessayer/i }));
    await waitFor(() => {
      expect(screen.getByTestId("revision-row-3")).toBeInTheDocument();
    });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("each revision row has a link to its pinned_url", async () => {
    mockFetch([revision1]);
    renderDrawer();
    await waitFor(() => {
      expect(screen.getByTestId("revision-row-3")).toBeInTheDocument();
    });
    const link = screen.getByRole("link", { name: /v3/i });
    expect(link).toHaveAttribute("href", revision1.pinned_url);
  });

  it("truncates long reason and shows 'Voir plus'", async () => {
    mockFetch([{ ...revision1, reason: longReason }]);
    renderDrawer();
    await waitFor(() => {
      expect(screen.getByTestId("revision-row-3")).toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: /voir plus/i })
    ).toBeInTheDocument();
    expect(screen.queryByText(longReason)).not.toBeInTheDocument();
  });

  it("clicking 'Voir plus' expands the full reason", async () => {
    mockFetch([{ ...revision1, reason: longReason }]);
    renderDrawer();
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /voir plus/i })
      ).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /voir plus/i }));
    expect(screen.getByText(longReason)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /voir moins/i })
    ).toBeInTheDocument();
  });

  it("shows 'Charger plus' button when next_cursor is present", async () => {
    mockFetch([revision1], 3);
    renderDrawer();
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /charger plus/i })
      ).toBeInTheDocument();
    });
  });

  it("hides 'Charger plus' button when next_cursor is null", async () => {
    mockFetch([revision1], null);
    renderDrawer();
    await waitFor(() => {
      expect(screen.getByTestId("revision-row-3")).toBeInTheDocument();
    });
    expect(
      screen.queryByRole("button", { name: /charger plus/i })
    ).not.toBeInTheDocument();
  });

  it("does not fetch when drawer is closed", () => {
    global.fetch = vi.fn();
    renderDrawer({ open: false });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("shows loading state while fetching", () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {})); // never resolves
    renderDrawer();
    expect(screen.getByTestId("revision-loading")).toBeInTheDocument();
  });
});
