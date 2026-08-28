// @req REQ-002
// @req REQ-050
// @req REQ-091 — Charter V2 search overlay restyle (ETNI-802 · FR107)
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
import { getPeopleRoute } from "@/lib/routing";

// Mock afrikLoader
vi.mock("@/lib/afrikLoader", () => ({
  search: vi.fn(),
}));

// Mock next/link (used by the shared EmptyState no-results CTA)
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
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

  it("should display tab filters", () => {
    render(<SearchModalV2 open={true} onClose={mockOnClose} language="fr" />);

    expect(screen.getByText("Tout")).toBeInTheDocument();
    expect(screen.getByText("Familles")).toBeInTheDocument();
    expect(screen.getByText("Peuples")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Pays" })).toBeInTheDocument();
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

  it("should have working tab structure", () => {
    render(<SearchModalV2 open={true} onClose={mockOnClose} language="fr" />);

    // Verify the tab list structure exists
    const tabList = screen.getByRole("tablist");
    expect(tabList).toBeInTheDocument();

    // Verify all tabs are rendered
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(4); // Tout, Familles, Peuples, Pays
  });

  it("should not render when closed", () => {
    render(<SearchModalV2 open={false} onClose={mockOnClose} language="fr" />);

    expect(screen.queryByText("Recherche")).not.toBeInTheDocument();
  });

  // ── R3 — pill type-filters (44px) ──────────────────────────────────────────

  describe("type-filter pills", () => {
    // @req REQ-091
    it("each type filter is a rounded-full pill", () => {
      render(<SearchModalV2 open={true} onClose={mockOnClose} language="fr" />);
      for (const name of ["Tout", "Familles", "Peuples", "Pays"]) {
        expect(screen.getByRole("tab", { name }).className).toMatch(
          /rounded-full/
        );
      }
    });

    // @req REQ-091
    it("each type filter exposes a >=44px hit area (charter §5)", () => {
      render(<SearchModalV2 open={true} onClose={mockOnClose} language="fr" />);
      for (const name of ["Tout", "Familles", "Peuples", "Pays"]) {
        expect(screen.getByRole("tab", { name }).className).toMatch(/min-h-11/);
      }
    });
  });

  // ── R3 — grouped result cards: cat-token mark + text label ─────────────────

  describe("entity-type marks", () => {
    // @req REQ-091
    it("pairs a color mark with a text label for every result type (never color alone)", async () => {
      vi.mocked(afrikLoader.search).mockResolvedValue(mockMixedResults);
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

      const resultsList = screen.getByTestId("search-results-list");
      const marks = within(resultsList).getAllByTestId("search-entity-mark");
      expect(marks).toHaveLength(mockMixedResults.length);
      // every mark is decorative — the meaning lives in the adjacent text label
      for (const mark of marks) {
        expect(mark).toHaveAttribute("aria-hidden", "true");
      }
      expect(within(resultsList).getByText("Peuple")).toBeInTheDocument();
      // "Pays" also names a tab pill, so scope to the results list to avoid
      // matching that unrelated element.
      expect(within(resultsList).getByText("Pays")).toBeInTheDocument();
      expect(
        within(resultsList).getByText("Famille linguistique")
      ).toBeInTheDocument();
    });

    // @req REQ-002
    it("reaches each result's fiche through a keyboard-accessible link", async () => {
      vi.mocked(afrikLoader.search).mockResolvedValue(mockMixedResults);
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

      const resultsList = screen.getByTestId("search-results-list");
      // Previously the card navigated from an onClick on a div, which no
      // keyboard user could reach.
      expect(
        within(resultsList).getByRole("link", { name: "Shona" })
      ).toHaveAttribute("href", getPeopleRoute("fr", "PPL_SHONA"));
    });

    // @req REQ-002
    it("closes itself when a result link is activated", async () => {
      vi.mocked(afrikLoader.search).mockResolvedValue(mockMixedResults);
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
  });

  // ── R3 — no-result guidance ──────────────────────────────────────────────

  describe("no-result guidance", () => {
    // @req REQ-091
    it("shows a guidance sentence and one CTA when a real search yields zero results", async () => {
      vi.mocked(afrikLoader.search).mockResolvedValue([]);
      render(<SearchModalV2 open={true} onClose={mockOnClose} language="fr" />);

      const searchInput = screen.getByPlaceholderText(
        /Rechercher une famille/i
      );
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: "xyzzy" } });
        await new Promise((r) => setTimeout(r, 350));
      });

      await waitFor(() => {
        expect(screen.getByText(/aucun résultat pour/i)).toBeInTheDocument();
      });
      expect(screen.getAllByRole("link")).toHaveLength(1);
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
