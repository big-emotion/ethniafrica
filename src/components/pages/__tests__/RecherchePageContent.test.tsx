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
const emptyApiResponse = { data: { results: [], total: 0 } };
const suggestApiResponse = {
  data: {
    results: [
      { id: "PPL_SHONA", type: "people", name: "Shona" },
      { id: "PPL_YORUBA", type: "people", name: "Yoruba" },
    ],
    total: 2,
  },
};
const searchApiResponse = {
  data: {
    results: [
      {
        id: "PPL_ZULU",
        type: "people",
        name: "Zulu",
        snippet: "Peuple bantou d'Afrique australe",
        population: 12000000,
        languageFamilyName: "Bantou",
        countryIds: ["ZAF"],
      },
    ],
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
    vi.mocked(nextNavigation.useRouter).mockReturnValue({
      replace: vi.fn(),
      push: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    });
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

  it("empty state has a 'Parcourir par famille' link to /fr/familles", async () => {
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
      expect(link.getAttribute("href")).toBe("/fr/familles");
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

  // ── 8. no session history ──────────────────────────────────────────────────

  it("input uses autocomplete=off to prevent browser search history", () => {
    render(<RecherchePageContent />);
    const input = screen.getByRole("searchbox");
    expect(input.getAttribute("autocomplete")).toBe("off");
  });
});
