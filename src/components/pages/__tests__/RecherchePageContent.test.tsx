import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  within,
  fireEvent,
  act,
  waitFor,
} from "@testing-library/react";
import * as nextNavigation from "next/navigation";
import { RecherchePageContent } from "../RecherchePageContent";
import { getLocalizedRoute, getPeopleRoute } from "@/lib/routing";

// ── shadcn Select (Radix portal crashes in happy-dom) ────────────────────────
vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (v: string) => void;
    children: React.ReactNode;
  }) => (
    <select value={value} onChange={(e) => onValueChange(e.target.value)}>
      {children}
    </select>
  ),
  SelectTrigger: ({
    children,
    "aria-label": ariaLabel,
    className,
  }: {
    children: React.ReactNode;
    "aria-label"?: string;
    className?: string;
  }) => (
    <button role="combobox" aria-label={ariaLabel} className={className}>
      {children}
    </button>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <span>{placeholder}</span>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  SelectItem: ({
    value,
    children,
  }: {
    value: string;
    children: React.ReactNode;
  }) => <option value={value}>{children}</option>,
}));

// ── next/navigation ──────────────────────────────────────────────────────────
vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(() => new URLSearchParams()),
  useRouter: vi.fn(() => ({ replace: vi.fn(), push: vi.fn() })),
}));

// ── hooks ────────────────────────────────────────────────────────────────────
vi.mock("@/hooks/use-language", () => ({
  useLanguage: () => ({ language: "fr", setLanguage: vi.fn() }),
}));

// ── layout (avoid rendering nav, consent banners, etc.) ─────────────────────
vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="page-layout">{children}</div>
  ),
}));

// ── next/link ────────────────────────────────────────────────────────────────
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

// ── browser APIs ──────────────────────────────────────────────────────────────
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
global.ResizeObserver = ResizeObserverMock;

const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

// ── fixtures ─────────────────────────────────────────────────────────────────
// These mirror the envelope /api/v2/search actually emits: typed arrays of
// domain rows. An earlier `{ results: [...] }` fixture was invented here, and
// it kept the suite green while the page rendered nothing in production.
const emptyApiResponse = {
  data: { peoples: [], countries: [], families: [], total: 0 },
};
const suggestApiResponse = {
  data: {
    peoples: [
      { id: "PPL_SHONA", nameMain: "Shona", content: {} },
      { id: "PPL_YORUBA", nameMain: "Yoruba", content: {} },
    ],
    countries: [],
    families: [],
    total: 2,
  },
};
const searchApiResponse = {
  data: {
    peoples: [
      {
        id: "PPL_ZULU",
        nameMain: "Zulu",
        languageFamilyId: "FLG_NIGER_CONGO",
        currentCountries: ["ZAF"],
        content: { demography: { totalPopulation: 12000000 } },
      },
    ],
    countries: [],
    families: [],
    total: 1,
  },
};

// ── helpers ───────────────────────────────────────────────────────────────────
function okJson(payload: unknown) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(payload),
  } as Response);
}

// ── tests ─────────────────────────────────────────────────────────────────────
describe("RecherchePageContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(nextNavigation.useSearchParams).mockReturnValue(
      new URLSearchParams() as ReturnType<typeof nextNavigation.useSearchParams>
    );
    // Only the navigation methods this component calls are stubbed. The cast
    // keeps the mock from having to track every field Next adds to
    // AppRouterInstance — 16.3 added `bfcacheId`, which no test asserts on.
    vi.mocked(nextNavigation.useRouter).mockReturnValue({
      replace: vi.fn(),
      push: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    } as unknown as ReturnType<typeof nextNavigation.useRouter>);
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(emptyApiResponse),
    });
  });

  // ── 1. basic structure ─────────────────────────────────────────────────────

  it("renders a text input for search", () => {
    render(<RecherchePageContent />);
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
  });

  it("renders a visible submit button labelled Rechercher", () => {
    render(<RecherchePageContent />);
    expect(
      screen.getByRole("button", { name: /rechercher/i })
    ).toBeInTheDocument();
  });

  it("always renders the filter chip row (even with no active filters)", () => {
    render(<RecherchePageContent />);
    expect(screen.getByTestId("filter-chip-row")).toBeInTheDocument();
  });

  // ── design system wiring (ETNI-1386) ───────────────────────────────────────

  // @req REQ-002
  it("wraps its content in .afh-shell instead of the ad-hoc max-w-4xl container", () => {
    const { container } = render(<RecherchePageContent />);
    const wrapper = screen.getByTestId("page-layout").firstElementChild;
    expect(wrapper?.className).toContain("afh-shell");
    expect(wrapper?.className).not.toMatch(/max-w-4xl|mx-auto\b/);
    // px-4 is an ad-hoc gutter; .afh-shell owns the gutter via --afh-page-padding.
    expect(container.querySelector(".afh-shell")).not.toBeNull();
  });

  // @req REQ-002
  it("drives structural spacing from --afh-* tokens, not raw step utilities", () => {
    const { container } = render(<RecherchePageContent />);
    const raw = container.innerHTML;
    expect(raw).not.toMatch(/\bspace-y-6\b/);
    expect(raw).not.toMatch(/\bspace-y-3\b/);
  });

  // @req REQ-002
  it("uses the project's md breakpoint on the search form row, not sm", () => {
    render(<RecherchePageContent />);
    const form = screen.getByRole("search", {
      name: /formulaire de recherche/i,
    });
    expect(form.className).toContain("md:flex-row");
    expect(form.className).not.toMatch(/\bsm:flex-row\b/);
  });

  it("renders a sort control that is a <select>-based dropdown, not a chip row", () => {
    render(<RecherchePageContent />);
    // shadcn Select renders a combobox role
    const comboboxes = screen.getAllByRole("combobox");
    // At least one combobox must have an aria-label mentioning sort/trier
    const sortControl = comboboxes.find((el) =>
      (el.getAttribute("aria-label") ?? "").toLowerCase().includes("trier")
    );
    expect(sortControl).toBeTruthy();
  });

  // @req REQ-002
  it("never renders an empty Radix Select item value", () => {
    render(<RecherchePageContent />);

    expect(
      screen.getAllByRole("option").every((option) => {
        const value = option.getAttribute("value");
        return typeof value === "string" && value.length > 0;
      })
    ).toBe(true);
  });

  // @req REQ-002
  it("normalizes the internal all-filter sentinel from URL state", () => {
    vi.mocked(nextNavigation.useSearchParams).mockReturnValue(
      new URLSearchParams(
        "classificationStatus=__all__&minConfidence=__all__&region=__all__"
      ) as ReturnType<typeof nextNavigation.useSearchParams>
    );

    render(<RecherchePageContent />);

    expect(screen.queryByText(/tout effacer/i)).not.toBeInTheDocument();
  });

  // ── 2. Tout effacer link ───────────────────────────────────────────────────

  it("does NOT show 'Tout effacer' when no filters are active", () => {
    render(<RecherchePageContent />);
    expect(screen.queryByText(/tout effacer/i)).not.toBeInTheDocument();
  });

  it("shows 'Tout effacer' when classificationStatus URL param is active", () => {
    vi.mocked(nextNavigation.useSearchParams).mockReturnValue(
      new URLSearchParams("classificationStatus=consensual") as ReturnType<
        typeof nextNavigation.useSearchParams
      >
    );
    render(<RecherchePageContent />);
    expect(screen.getByText(/tout effacer/i)).toBeInTheDocument();
  });

  it("shows 'Tout effacer' when minConfidence URL param is active", () => {
    vi.mocked(nextNavigation.useSearchParams).mockReturnValue(
      new URLSearchParams("minConfidence=0.7") as ReturnType<
        typeof nextNavigation.useSearchParams
      >
    );
    render(<RecherchePageContent />);
    expect(screen.getByText(/tout effacer/i)).toBeInTheDocument();
  });

  it("shows 'Tout effacer' when region URL param is active", () => {
    vi.mocked(nextNavigation.useSearchParams).mockReturnValue(
      new URLSearchParams("region=west") as ReturnType<
        typeof nextNavigation.useSearchParams
      >
    );
    render(<RecherchePageContent />);
    expect(screen.getByText(/tout effacer/i)).toBeInTheDocument();
  });

  // ── 3. active filter chips ─────────────────────────────────────────────────

  it("renders a dismissible chip for the active classificationStatus filter", () => {
    vi.mocked(nextNavigation.useSearchParams).mockReturnValue(
      new URLSearchParams("classificationStatus=consensual") as ReturnType<
        typeof nextNavigation.useSearchParams
      >
    );
    render(<RecherchePageContent />);
    // The chip row (not the select option) should contain the French label
    const chipRow = screen.getByTestId("filter-chip-row");
    expect(within(chipRow).getByText(/consensuel/i)).toBeInTheDocument();
  });

  it("renders a dismissible chip for the active region filter", () => {
    vi.mocked(nextNavigation.useSearchParams).mockReturnValue(
      new URLSearchParams("region=west") as ReturnType<
        typeof nextNavigation.useSearchParams
      >
    );
    render(<RecherchePageContent />);
    const chipRow = screen.getByTestId("filter-chip-row");
    expect(
      within(chipRow).getByText(/afrique de l.ouest/i)
    ).toBeInTheDocument();
  });

  // ── 4. URL sync ────────────────────────────────────────────────────────────

  it("populates the input from the q URL param", () => {
    vi.mocked(nextNavigation.useSearchParams).mockReturnValue(
      new URLSearchParams("q=Yoruba") as ReturnType<
        typeof nextNavigation.useSearchParams
      >
    );
    render(<RecherchePageContent />);
    expect(screen.getByRole("searchbox")).toHaveValue("Yoruba");
  });

  // ── 5. auto-suggest ────────────────────────────────────────────────────────

  it("calls /api/v2/search?...&limit=6 when input reaches 2 chars", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(suggestApiResponse),
    });
    render(<RecherchePageContent />);
    const input = screen.getByRole("searchbox");

    await act(async () => {
      fireEvent.change(input, { target: { value: "Yo" } });
      // advance debounce
      await new Promise((r) => setTimeout(r, 350));
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/v2\/search\?.*limit=6/)
    );
  });

  it("does NOT call the suggest API when input is shorter than 2 chars", async () => {
    render(<RecherchePageContent />);
    const input = screen.getByRole("searchbox");

    await act(async () => {
      fireEvent.change(input, { target: { value: "Y" } });
      await new Promise((r) => setTimeout(r, 350));
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("displays suggestion entries in a listbox after typing 2+ chars", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(suggestApiResponse),
    });
    render(<RecherchePageContent />);
    const input = screen.getByRole("searchbox");

    await act(async () => {
      fireEvent.change(input, { target: { value: "Yo" } });
      await new Promise((r) => setTimeout(r, 350));
    });

    await waitFor(() => {
      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });
    expect(screen.getByText("Shona")).toBeInTheDocument();
    expect(screen.getByText("Yoruba")).toBeInTheDocument();
  });

  // ── 6. empty state (post-search, no results) ───────────────────────────────

  it("shows the empty-state after a search that returns no results", async () => {
    mockFetch.mockResolvedValue(okJson(emptyApiResponse));
    render(<RecherchePageContent />);

    const input = screen.getByRole("searchbox");
    const submit = screen.getByRole("button", { name: /rechercher/i });

    await act(async () => {
      fireEvent.change(input, { target: { value: "xyzzy" } });
      fireEvent.click(submit);
      await new Promise((r) => setTimeout(r, 100));
    });

    await waitFor(() => {
      expect(screen.getByText(/aucun résultat/i)).toBeInTheDocument();
    });
  });

  it("empty state includes a check-spelling suggestion", async () => {
    mockFetch.mockResolvedValue(okJson(emptyApiResponse));
    render(<RecherchePageContent />);

    const input = screen.getByRole("searchbox");
    const submit = screen.getByRole("button", { name: /rechercher/i });

    await act(async () => {
      fireEvent.change(input, { target: { value: "xyzzy" } });
      fireEvent.click(submit);
      await new Promise((r) => setTimeout(r, 100));
    });

    await waitFor(() => {
      expect(screen.getByText(/vérifiez l.orthographe/i)).toBeInTheDocument();
    });
  });

  // @req REQ-002
  it("empty state has a 'Parcourir par famille' link to the families directory", async () => {
    mockFetch.mockResolvedValue(okJson(emptyApiResponse));
    render(<RecherchePageContent />);

    const input = screen.getByRole("searchbox");
    const submit = screen.getByRole("button", { name: /rechercher/i });

    await act(async () => {
      fireEvent.change(input, { target: { value: "xyzzy" } });
      fireEvent.click(submit);
      await new Promise((r) => setTimeout(r, 100));
    });

    await waitFor(() => {
      const link = screen.getByRole("link", { name: /parcourir par famille/i });
      expect(link).toBeInTheDocument();
      expect(link.getAttribute("href")).toBe(
        getLocalizedRoute("fr", "families")
      );
    });
  });

  it("empty state has 'Signaler donnée manquante' link that pre-populates the query", async () => {
    mockFetch.mockResolvedValue(okJson(emptyApiResponse));
    render(<RecherchePageContent />);

    const input = screen.getByRole("searchbox");
    const submit = screen.getByRole("button", { name: /rechercher/i });

    await act(async () => {
      fireEvent.change(input, { target: { value: "xyzzy" } });
      fireEvent.click(submit);
      await new Promise((r) => setTimeout(r, 100));
    });

    await waitFor(() => {
      const link = screen.getByRole("link", {
        name: /signaler donn.e manquante/i,
      });
      expect(link).toBeInTheDocument();
      expect(link.getAttribute("href")).toMatch(/contribute/);
      expect(link.getAttribute("href")).toMatch(/xyzzy/);
    });
  });

  // ── 7. results list ────────────────────────────────────────────────────────

  it("renders a results list after a successful search", async () => {
    mockFetch.mockResolvedValue(okJson(searchApiResponse));
    render(<RecherchePageContent />);

    const input = screen.getByRole("searchbox");
    const submit = screen.getByRole("button", { name: /rechercher/i });

    await act(async () => {
      fireEvent.change(input, { target: { value: "Zulu" } });
      fireEvent.click(submit);
      await new Promise((r) => setTimeout(r, 100));
    });

    await waitFor(() => {
      expect(screen.getByText("Zulu")).toBeInTheDocument();
    });
  });

  // @req REQ-002
  it("makes every result card a link to its fiche", async () => {
    mockFetch.mockResolvedValue(okJson(searchApiResponse));
    render(<RecherchePageContent />);

    await act(async () => {
      fireEvent.change(screen.getByRole("searchbox"), {
        target: { value: "peuples zoulous" },
      });
      fireEvent.click(screen.getByRole("button", { name: /rechercher/i }));
      await new Promise((r) => setTimeout(r, 100));
    });

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Zulu" })).toHaveAttribute(
        "href",
        getPeopleRoute("fr", "PPL_ZULU")
      );
    });
  });

  // @req REQ-002
  it("keeps country and family hits when a region filter is active", async () => {
    // Only peoples carry countryIds, so testing every result against the
    // region erased country and family hits the moment one was picked.
    vi.mocked(nextNavigation.useSearchParams).mockReturnValue(
      new URLSearchParams("q=Krou&region=west") as ReturnType<
        typeof nextNavigation.useSearchParams
      >
    );
    mockFetch.mockResolvedValue(
      okJson({
        data: {
          peoples: [],
          countries: [{ id: "CIV", nameFr: "Côte d'Ivoire" }],
          families: [{ id: "FLG_KROU", nameFr: "Krou" }],
          total: 2,
        },
      })
    );

    await act(async () => {
      render(<RecherchePageContent />);
      await new Promise((r) => setTimeout(r, 100));
    });

    await waitFor(() => {
      expect(
        screen.getByRole("link", { name: "Côte d'Ivoire" })
      ).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Krou" })).toBeInTheDocument();
    });
  });

  // @req REQ-002
  it("orders results by relevance across entity kinds, not peoples first", async () => {
    mockFetch.mockResolvedValue(
      okJson({
        data: {
          peoples: [
            { id: "PPL_LOW", nameMain: "Peuple", relevance: 0.2, content: {} },
          ],
          countries: [{ id: "CIV", nameFr: "Côte d'Ivoire", relevance: 0.3 }],
          families: [],
          total: 2,
        },
      })
    );

    render(<RecherchePageContent />);

    await act(async () => {
      fireEvent.change(screen.getByRole("searchbox"), {
        target: { value: "ivoire" },
      });
      fireEvent.click(screen.getByRole("button", { name: /rechercher/i }));
      await new Promise((r) => setTimeout(r, 100));
    });

    // The envelope groups peoples first; "Pertinence" must reorder across
    // kinds rather than fall through to a no-op comparator.
    await waitFor(() => {
      expect(
        screen
          .getAllByTestId("search-result-card")
          .map((card) => card.getAttribute("data-result-type"))
      ).toEqual(["country", "people"]);
    });
  });

  // @req REQ-002
  it("groups split fiches of the same people into one card (ETNI-1391)", async () => {
    mockFetch.mockResolvedValue(
      okJson({
        data: {
          peoples: [
            {
              id: "PPL_FULANI",
              nameMain: "Peul",
              relevance: 0.5,
              content: {
                appellations: {
                  peopleGroupId: "PGRP_FULANI",
                  peopleGroupLabel: "Peul / Fulani",
                },
              },
            },
            {
              id: "PPL_FULANI_MASSINA",
              nameMain: "Peul du Massina",
              relevance: 0.4,
              content: {
                appellations: {
                  peopleGroupId: "PGRP_FULANI",
                  peopleGroupLabel: "Peul / Fulani",
                },
              },
            },
          ],
          countries: [],
          families: [],
          total: 2,
        },
      })
    );
    render(<RecherchePageContent />);

    await act(async () => {
      fireEvent.change(screen.getByRole("searchbox"), {
        target: { value: "fulani" },
      });
      fireEvent.click(screen.getByRole("button", { name: /rechercher/i }));
      await new Promise((r) => setTimeout(r, 100));
    });

    await waitFor(() => {
      expect(
        screen.getByTestId("search-people-group-card")
      ).toBeInTheDocument();
    });
    expect(screen.queryAllByTestId("search-result-card")).toHaveLength(0);
    expect(screen.getByRole("link", { name: "Peul" })).toHaveAttribute(
      "href",
      getPeopleRoute("fr", "PPL_FULANI")
    );
    expect(
      screen.getByRole("link", { name: "Peul du Massina" })
    ).toHaveAttribute("href", getPeopleRoute("fr", "PPL_FULANI_MASSINA"));
  });

  // @req REQ-002
  it("runs a family-scoped search when the URL carries one and no query", async () => {
    vi.mocked(nextNavigation.useSearchParams).mockReturnValue(
      new URLSearchParams("family=FLG_KROU") as ReturnType<
        typeof nextNavigation.useSearchParams
      >
    );
    mockFetch.mockResolvedValue(okJson(searchApiResponse));

    await act(async () => {
      render(<RecherchePageContent />);
      await new Promise((r) => setTimeout(r, 100));
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("familyId=FLG_KROU")
    );
  });

  // @req REQ-002
  it("shows the active relation as a dismissible chip", async () => {
    vi.mocked(nextNavigation.useSearchParams).mockReturnValue(
      new URLSearchParams("country=CIV") as ReturnType<
        typeof nextNavigation.useSearchParams
      >
    );
    mockFetch.mockResolvedValue(okJson(searchApiResponse));

    await act(async () => {
      render(<RecherchePageContent />);
      await new Promise((r) => setTimeout(r, 100));
    });

    const chipRow = screen.getByTestId("filter-chip-row");
    expect(
      within(chipRow).getByText(
        /peuples du pays côte d’ivoire|peuples du pays côte d'ivoire/i
      )
    ).toBeInTheDocument();
  });

  // @req REQ-002
  it("leads with a pivot block when the query names one entity exactly", async () => {
    mockFetch.mockResolvedValue(okJson(searchApiResponse));
    render(<RecherchePageContent />);

    await act(async () => {
      fireEvent.change(screen.getByRole("searchbox"), {
        target: { value: "Zulu" },
      });
      fireEvent.click(screen.getByRole("button", { name: /rechercher/i }));
      await new Promise((r) => setTimeout(r, 100));
    });

    await waitFor(() => {
      expect(screen.getByTestId("search-pivot")).toBeInTheDocument();
    });
    // Promoted, not duplicated.
    expect(screen.queryAllByTestId("search-result-card")).toHaveLength(0);
    expect(
      within(screen.getByTestId("search-pivot")).getByRole("link", {
        name: /ouvrir la fiche/i,
      })
    ).toHaveAttribute("href", getPeopleRoute("fr", "PPL_ZULU"));
  });

  // @req REQ-002
  it("renders no pivot for an ambiguous query", async () => {
    mockFetch.mockResolvedValue(
      okJson({
        data: {
          peoples: [
            { id: "A", nameMain: "Bété", relevance: 0.8, content: {} },
            { id: "B", nameMain: "Béti", relevance: 0.75, content: {} },
          ],
          countries: [],
          families: [],
          total: 2,
        },
      })
    );
    render(<RecherchePageContent />);

    await act(async () => {
      fireEvent.change(screen.getByRole("searchbox"), {
        target: { value: "bet" },
      });
      fireEvent.click(screen.getByRole("button", { name: /rechercher/i }));
      await new Promise((r) => setTimeout(r, 100));
    });

    await waitFor(() => {
      expect(screen.getAllByTestId("search-result-card")).toHaveLength(2);
    });
    expect(screen.queryByTestId("search-pivot")).not.toBeInTheDocument();
  });

  // @req REQ-124
  it("promotes no card and keeps the list flat when two results share a normalized name (homonymy)", async () => {
    mockFetch.mockResolvedValue(
      okJson({
        data: {
          peoples: [
            { id: "A", nameMain: "Bété", relevance: 0.9, content: {} },
            { id: "B", nameMain: "BETE", relevance: 0.1, content: {} },
          ],
          countries: [],
          families: [],
          total: 2,
        },
      })
    );
    render(<RecherchePageContent />);

    await act(async () => {
      fireEvent.change(screen.getByRole("searchbox"), {
        target: { value: "Bété" },
      });
      fireEvent.click(screen.getByRole("button", { name: /rechercher/i }));
      await new Promise((r) => setTimeout(r, 100));
    });

    await waitFor(() => {
      expect(screen.getAllByTestId("search-result-card")).toHaveLength(2);
    });
    expect(screen.queryByTestId("search-pivot")).not.toBeInTheDocument();
  });

  // ── 8. no session history ──────────────────────────────────────────────────

  it("input uses autocomplete=off to prevent browser search history", () => {
    render(<RecherchePageContent />);
    const input = screen.getByRole("searchbox");
    expect(input.getAttribute("autocomplete")).toBe("off");
  });
});
