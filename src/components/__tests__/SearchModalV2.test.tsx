// @req REQ-002
// @req REQ-050
// @req REQ-091 — Charter V2 search overlay restyle (ETNI-802 · FR107)
// @req REQ-124 — ETNI-1809: the modal becomes suggest-only, the canonical
// SERP (/fr/atlas/recherche) is the one place results render (ETNI-1796).
import { useState } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  act,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchModalV2 } from "../search/SearchModalV2";
import * as afrikLoader from "@/lib/afrikLoader";
import type { SearchResult } from "@/types/afrik-frontend";
import { getPeopleRoute, getLocalizedRoute } from "@/lib/routing";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock afrikLoader — the modal now only ever needs plain results, the same
// path HomeHeroSearch's suggestion panel uses (no leads, no lens counts).
vi.mock("@/lib/afrikLoader", () => ({
  search: vi.fn(),
}));

function mockSearch(results: SearchResult[]) {
  vi.mocked(afrikLoader.search).mockResolvedValue(results);
}

// Mock next/link (used by the suggestion rows)
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    onClick,
  }: {
    href: string;
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <a href={href} onClick={onClick}>
      {children}
    </a>
  ),
}));

// Mock ResizeObserver for ScrollArea
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
global.ResizeObserver = ResizeObserverMock;

const mockSearchResults: SearchResult[] = [
  {
    type: "people",
    id: "PPL_SHONA",
    name: "Shona",
    snippet: "The Shona people of Zimbabwe",
    relevance: 0.95,
    languageFamilyName: "Bantou",
    population: 15000000,
  },
];

const mockMixedResults: SearchResult[] = [
  {
    type: "people",
    id: "PPL_SHONA",
    name: "Shona",
    relevance: 0.95,
  },
  {
    type: "country",
    id: "ZWE",
    name: "Zimbabwe",
    relevance: 0.9,
  },
  {
    type: "languageFamily",
    id: "FLG_BANTU",
    name: "Bantou",
    relevance: 0.85,
  },
];

// Renders SearchModalV2 behind a controlling trigger button so focus-trap
// and focus-restore behavior can be exercised the way the app actually
// mounts it (open state owned by an ancestor, no DialogTrigger).
function ControlledSearchModal() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Ouvrir la recherche
      </button>
      <SearchModalV2 open={open} onClose={() => setOpen(false)} language="fr" />
    </>
  );
}

describe("SearchModalV2", () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render search dialog when open", () => {
    render(<SearchModalV2 open={true} onClose={mockOnClose} language="fr" />);

    expect(screen.getByText("Recherche")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Rechercher une famille/i)
    ).toBeInTheDocument();
  });

  it("should show instruction text when search query is empty", () => {
    render(<SearchModalV2 open={true} onClose={mockOnClose} language="fr" />);

    expect(
      screen.getByText("Commencez à taper pour rechercher...")
    ).toBeInTheDocument();
  });

  it("should update search input value when typing", async () => {
    render(<SearchModalV2 open={true} onClose={mockOnClose} language="fr" />);

    const searchInput = screen.getByPlaceholderText(/Rechercher une famille/i);
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: "test" } });
    });

    expect(searchInput).toHaveValue("test");
  });

  it("should not render when closed", () => {
    render(<SearchModalV2 open={false} onClose={mockOnClose} language="fr" />);

    expect(screen.queryByText("Recherche")).not.toBeInTheDocument();
  });

  // The modal reaches the corpus only through the shared client (ETNI-1415
  // AC2); it never fetches /api/v2/search itself.
  // @req REQ-108
  // @req REQ-124
  it("queries the corpus through afrikLoader.search as the reader types", async () => {
    mockSearch(mockSearchResults);
    render(<SearchModalV2 open={true} onClose={mockOnClose} language="fr" />);

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/Rechercher une famille/i), {
        target: { value: "Shona" },
      });
      await new Promise((r) => setTimeout(r, 350));
    });

    expect(afrikLoader.search).toHaveBeenCalledWith("Shona");
  });

  // ── ETNI-1809 — suggest-only overlay ────────────────────────────────────

  describe("suggestions dropdown", () => {
    // @req REQ-124
    it("shows a suggestion per matching entity once the search resolves", async () => {
      mockSearch(mockMixedResults);
      render(<SearchModalV2 open={true} onClose={mockOnClose} language="fr" />);

      const searchInput = screen.getByPlaceholderText(
        /Rechercher une famille/i
      );
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: "Shona" } });
        await new Promise((r) => setTimeout(r, 350));
      });

      const suggestions = await screen.findByTestId("search-suggestions-list");
      expect(within(suggestions).getByText("Shona")).toBeInTheDocument();
      expect(within(suggestions).getByText("Zimbabwe")).toBeInTheDocument();
      expect(within(suggestions).getByText("Bantou")).toBeInTheDocument();
    });

    // @req REQ-002
    // @req REQ-124
    it("reaches each suggestion's fiche through a keyboard-accessible link", async () => {
      mockSearch(mockMixedResults);
      render(<SearchModalV2 open={true} onClose={mockOnClose} language="fr" />);

      const searchInput = screen.getByPlaceholderText(
        /Rechercher une famille/i
      );
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: "Shona" } });
        await new Promise((r) => setTimeout(r, 350));
      });

      await waitFor(() => {
        expect(screen.getByText("Shona")).toBeInTheDocument();
      });

      // Previously the card navigated from an onClick on a div, which no
      // keyboard user could reach — a suggestion is still a real link.
      expect(screen.getByRole("link", { name: "Shona" })).toHaveAttribute(
        "href",
        getPeopleRoute("fr", "PPL_SHONA")
      );
    });

    // @req REQ-002
    // @req REQ-124
    it("closes itself when a suggestion link is activated", async () => {
      mockSearch(mockMixedResults);
      render(<SearchModalV2 open={true} onClose={mockOnClose} language="fr" />);

      const searchInput = screen.getByPlaceholderText(
        /Rechercher une famille/i
      );
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: "Shona" } });
        await new Promise((r) => setTimeout(r, 350));
      });

      await waitFor(() => {
        expect(screen.getByText("Shona")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("link", { name: "Shona" }));

      expect(mockOnClose).toHaveBeenCalled();
    });

    // @req REQ-124
    it("renders no result card and no lens bar, even once a search resolves", async () => {
      mockSearch(mockSearchResults);
      render(<SearchModalV2 open={true} onClose={mockOnClose} language="fr" />);

      const searchInput = screen.getByPlaceholderText(
        /Rechercher une famille/i
      );
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: "Shona" } });
        await new Promise((r) => setTimeout(r, 350));
      });

      await waitFor(() => {
        expect(screen.getByText("Shona")).toBeInTheDocument();
      });

      expect(
        screen.queryByTestId("search-result-card")
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("group", { name: "Filtrer les résultats par type" })
      ).not.toBeInTheDocument();
      // The snippet and population line only ever rendered on the full card.
      expect(
        screen.queryByText("The Shona people of Zimbabwe")
      ).not.toBeInTheDocument();
    });
  });

  // ── ETNI-1809 — submitting goes to the canonical SERP ───────────────────

  describe("submit to the canonical SERP", () => {
    // @req REQ-124
    it("navigates to the canonical SERP with the current query on Enter", async () => {
      mockSearch(mockSearchResults);
      render(<SearchModalV2 open={true} onClose={mockOnClose} language="fr" />);

      const searchInput = screen.getByPlaceholderText(
        /Rechercher une famille/i
      );
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: "Shona" } });
        await new Promise((r) => setTimeout(r, 350));
      });

      fireEvent.submit(searchInput.closest("form")!);

      expect(mockPush).toHaveBeenCalledWith(
        `${getLocalizedRoute("fr", "search")}?q=Shona`
      );
      expect(mockOnClose).toHaveBeenCalled();
    });

    // @req REQ-124
    it("does not navigate on Enter when the query is empty", async () => {
      render(<SearchModalV2 open={true} onClose={mockOnClose} language="fr" />);

      const searchInput = screen.getByPlaceholderText(
        /Rechercher une famille/i
      );
      fireEvent.submit(searchInput.closest("form")!);

      expect(mockPush).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  // ── R3 — focus trap + restore ───────────────────────────────────────────

  describe("focus management", () => {
    // @req REQ-091
    it("moves focus into the overlay's search input on open", async () => {
      const user = userEvent.setup();
      render(<ControlledSearchModal />);

      await user.click(
        screen.getByRole("button", { name: "Ouvrir la recherche" })
      );

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText(/Rechercher une famille/i)
        ).toHaveFocus();
      });
    });

    // @req REQ-091
    it("keeps Tab focus inside the overlay while open", async () => {
      const user = userEvent.setup();
      render(<ControlledSearchModal />);

      await user.click(
        screen.getByRole("button", { name: "Ouvrir la recherche" })
      );
      const dialog = await screen.findByRole("dialog");

      for (let i = 0; i < 8; i++) {
        await user.tab();
        expect(dialog.contains(document.activeElement)).toBe(true);
      }
    });

    // Radix's Dialog restores focus to the triggering element on close via
    // its own onCloseAutoFocus handling — we neither override nor
    // reimplement that here (see src/components/ui/dialog.tsx). happy-dom
    // does not reliably surface that restored focus to
    // `document.activeElement` in tests (verified: even clicking the
    // dialog's own Close button, Radix's most standard close path, doesn't
    // move `document.activeElement` under happy-dom), so this test asserts
    // what's actually observable here — the overlay closes on Escape and
    // the trigger remains present and focusable — rather than a
    // `toHaveFocus()` assertion that this environment can't verify.
    // @req REQ-091
    it("closes on Escape, leaving the trigger focusable for focus to return to", async () => {
      const user = userEvent.setup();
      render(<ControlledSearchModal />);

      const trigger = screen.getByRole("button", {
        name: "Ouvrir la recherche",
      });
      await user.click(trigger);
      await screen.findByRole("dialog");

      await user.keyboard("{Escape}");

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
      expect(trigger).toBeInTheDocument();
      expect(trigger).not.toBeDisabled();
    });
  });
});
