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
import { SEARCH_RESULT_GROUPS } from "@/lib/search/searchVocabulary";

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
// The mock keeps `page-layout` wrapping only `children` — the
// ".afh-shell wraps content" test below asserts on its firstElementChild —
// and renders the hero head as a *sibling*, mirroring how the real
// `PageHero` sits outside `<main>`. `screen` queries the whole document, so
// tests can still find the h1 regardless of which container it lives in.
vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({
    children,
    title,
    subtitle,
    heroHead,
  }: {
    children: React.ReactNode;
    title?: string;
    subtitle?: string;
    heroHead?: React.ReactNode;
  }) => (
    <>
      <div data-testid="page-hero-mock">
        {heroHead ?? (title ? <h1>{title}</h1> : null)}
        {subtitle ? <p data-testid="page-subtitle">{subtitle}</p> : null}
      </div>
      <div data-testid="page-layout">{children}</div>
    </>
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
const desktopPivotApiResponse = {
  data: {
    peoples: [
      {
        id: "PPL_ZULU",
        nameMain: "Zulu",
        currentCountries: ["ZAF"],
        content: {
          demography: { totalPopulation: 12_000_000 },
          sources: [
            {
              title: "Ethnologue — Zulu",
              url: "https://www.ethnologue.com/language/zul/",
            },
          ],
        },
        relevance: 0.9,
        exactMatch: true,
        confidence: 0.84,
      },
      {
        id: "PPL_NDEBELE",
        nameMain: "Ndébélé",
        content: {},
        relevance: 0.5,
      },
      {
        id: "PPL_XHOSA",
        nameMain: "Xhosa",
        content: {},
        relevance: 0.4,
      },
    ],
    countries: [],
    families: [],
    total: 3,
  },
};

// ── helpers ───────────────────────────────────────────────────────────────────
function okJson(payload: unknown) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(payload),
  } as Response);
}

async function renderPivotWithRelatedResults() {
  mockFetch.mockResolvedValue(okJson(desktopPivotApiResponse));
  render(<RecherchePageContent />);

  await act(async () => {
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "Zulu" },
    });
    fireEvent.click(screen.getByRole("button", { name: /rechercher/i }));
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  await waitFor(() => {
    expect(screen.getByTestId("search-pivot")).toBeInTheDocument();
  });
}

// ── tests ─────────────────────────────────────────────────────────────────────

/**
 * The words a heading uses to claim a kind, folded so a plural claim answers
 * for a singular one — the panel heads a set ("Langues") where the SERP
 * addresses a reader ("une langue").
 */
const claimStems = (heading: string) =>
  heading
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.replace(/s$/, ""));

describe("the scope the SERP declares", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(nextNavigation.useSearchParams).mockReturnValue(
      new URLSearchParams() as ReturnType<typeof nextNavigation.useSearchParams>
    );
    vi.mocked(nextNavigation.useRouter).mockReturnValue({
      replace: vi.fn(),
      push: vi.fn(),
    } as unknown as ReturnType<typeof nextNavigation.useRouter>);
    mockFetch.mockResolvedValue(okJson(emptyApiResponse));
  });

  // The landing state of /fr/recherche is where a reader decides whether the
  // engine can answer a language or a surname at all. Its scope wording is
  // static prose: unlike a lens chip, which SearchLensBar drops when a kind
  // returns nothing, a sentence cannot retract itself. So it owes the reader
  // every kind the search can return — derived from the panel's own registry
  // rather than restated here, which is how it came to promise three of five.
  // @req REQ-002
  it("names every kind the search can return, in both of its scope statements", () => {
    render(<RecherchePageContent />);

    const scopeStatements = [
      screen.getByTestId("page-subtitle").textContent ?? "",
      screen.getByRole("combobox").getAttribute("aria-label") ?? "",
    ];

    for (const statement of scopeStatements) {
      const folded = statement.toLowerCase();
      for (const { heading } of SEARCH_RESULT_GROUPS) {
        for (const stem of claimStems(heading)) {
          expect(folded).toContain(stem);
        }
      }
    }
  });

  // `persons` has no rows, so naming it would promise an answer the corpus
  // cannot give — the same reason SEARCH_RESULT_GROUPS leaves it out and the
  // lens bar filters it away at zero. The neutral accent it takes in the
  // palette (REQ-126) follows from that, it does not cause it.
  // @req REQ-002
  it("names no kind the corpus cannot answer with", () => {
    render(<RecherchePageContent />);

    const combobox = screen.getByRole("combobox");
    const wording = [
      screen.getByTestId("page-subtitle").textContent ?? "",
      combobox.getAttribute("aria-label") ?? "",
      combobox.getAttribute("placeholder") ?? "",
    ];

    for (const statement of wording) {
      expect(statement.toLowerCase()).not.toContain("personne");
    }
  });
});

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
    expect(screen.getByRole("combobox")).toBeInTheDocument();
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

  // A relation is the one filter left; it renders its own dismissible chip
  // (see "shows the active relation as a dismissible chip" below) and clears
  // via the same chip button, so there is nothing else for a "Tout effacer"
  // interplay test to cover once classification/confidence/region are gone.
  // @req REQ-002
  it("does NOT show 'Tout effacer' when no relation is active", () => {
    render(<RecherchePageContent />);
    expect(screen.queryByText(/tout effacer/i)).not.toBeInTheDocument();
  });

  // ── 4. URL sync ────────────────────────────────────────────────────────────

  it("populates the input from the q URL param", () => {
    vi.mocked(nextNavigation.useSearchParams).mockReturnValue(
      new URLSearchParams("q=Yoruba") as ReturnType<
        typeof nextNavigation.useSearchParams
      >
    );
    render(<RecherchePageContent />);
    expect(screen.getByRole("combobox")).toHaveValue("Yoruba");
  });

  // ── 5. auto-suggest ────────────────────────────────────────────────────────

  /**
   * The field declared `role="searchbox"` over a listbox it never claimed —
   * no `aria-expanded`, no `aria-controls`, no `aria-activedescendant`. A
   * searchbox cannot own suggestions, so under a screen reader the canonical
   * search surface offered none, while the accueil and the compare picker
   * offered the same suggestions correctly.
   */
  // @req REQ-002
  it("declares the combobox contract over the suggestions it owns", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(suggestApiResponse),
    });
    render(<RecherchePageContent />);
    const input = screen.getByRole("combobox");

    expect(input).toHaveAttribute("aria-expanded", "false");

    await act(async () => {
      fireEvent.change(input, { target: { value: "Yo" } });
      await new Promise((r) => setTimeout(r, 350));
    });

    const listbox = await screen.findByRole("listbox");
    expect(input).toHaveAttribute("aria-expanded", "true");
    expect(input).toHaveAttribute("aria-controls", listbox.id);
    expect(input).toHaveAttribute("aria-autocomplete", "list");
  });

  // @req REQ-002
  it("walks the suggestions with the arrow keys and points at the highlighted one", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(suggestApiResponse),
    });
    render(<RecherchePageContent />);
    const input = screen.getByRole("combobox");

    await act(async () => {
      fireEvent.change(input, { target: { value: "Yo" } });
      await new Promise((r) => setTimeout(r, 350));
    });
    await screen.findByRole("listbox");

    expect(input).not.toHaveAttribute("aria-activedescendant");

    await act(async () => {
      fireEvent.keyDown(input, { key: "ArrowDown" });
    });

    const [firstOption] = screen.getAllByRole("option");
    expect(input).toHaveAttribute("aria-activedescendant", firstOption.id);
    expect(firstOption).toHaveAttribute("aria-selected", "true");
  });

  // @req REQ-002
  it("closes the suggestions on Escape without emptying the field", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(suggestApiResponse),
    });
    render(<RecherchePageContent />);
    const input = screen.getByRole("combobox");

    await act(async () => {
      fireEvent.change(input, { target: { value: "Yo" } });
      await new Promise((r) => setTimeout(r, 350));
    });
    await screen.findByRole("listbox");

    await act(async () => {
      fireEvent.keyDown(input, { key: "Escape" });
    });

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(input).toHaveValue("Yo");
  });

  it("calls /api/v2/search?...&limit=6 when input reaches 2 chars", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(suggestApiResponse),
    });
    render(<RecherchePageContent />);
    const input = screen.getByRole("combobox");

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
    const input = screen.getByRole("combobox");

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
    const input = screen.getByRole("combobox");

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

    const input = screen.getByRole("combobox");
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

    const input = screen.getByRole("combobox");
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

    const input = screen.getByRole("combobox");
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

    const input = screen.getByRole("combobox");
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

  // @req REQ-125
  it("empty state renders the near-miss leads the API returns", async () => {
    mockFetch.mockResolvedValue(
      okJson({
        data: {
          peoples: [],
          countries: [],
          families: [],
          total: 0,
          leads: [
            {
              kind: "people",
              id: "PPL_BAMBARA",
              name: "Bambara",
              similarity: 0.4,
            },
          ],
        },
      })
    );
    render(<RecherchePageContent />);

    const input = screen.getByRole("combobox");
    const submit = screen.getByRole("button", { name: /rechercher/i });

    await act(async () => {
      fireEvent.change(input, { target: { value: "bamba" } });
      fireEvent.click(submit);
      await new Promise((r) => setTimeout(r, 100));
    });

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /Bambara/ })).toHaveAttribute(
        "href",
        getPeopleRoute("fr", "PPL_BAMBARA")
      );
    });
  });

  // @req REQ-125
  it("empty state omits the leads cartouche when the API returns none", async () => {
    mockFetch.mockResolvedValue(okJson(emptyApiResponse));
    render(<RecherchePageContent />);

    const input = screen.getByRole("combobox");
    const submit = screen.getByRole("button", { name: /rechercher/i });

    await act(async () => {
      fireEvent.change(input, { target: { value: "xyzzy" } });
      fireEvent.click(submit);
      await new Promise((r) => setTimeout(r, 100));
    });

    await waitFor(() => {
      expect(screen.getByText(/aucun résultat/i)).toBeInTheDocument();
    });
    expect(screen.queryByTestId("no-results-leads")).not.toBeInTheDocument();
  });

  // ── 7. results list ────────────────────────────────────────────────────────

  // @req REQ-002
  it("renders a result after a successful search", async () => {
    mockFetch.mockResolvedValue(okJson(searchApiResponse));
    render(<RecherchePageContent />);

    const input = screen.getByRole("combobox");
    const submit = screen.getByRole("button", { name: /rechercher/i });

    await act(async () => {
      fireEvent.change(input, { target: { value: "Zulu" } });
      fireEvent.click(submit);
      await new Promise((r) => setTimeout(r, 100));
    });

    await waitFor(() => {
      expect(screen.getByTestId("search-pivot")).toBeInTheDocument();
    });
  });

  // @req REQ-002
  it("makes every result card a link to its fiche", async () => {
    mockFetch.mockResolvedValue(okJson(searchApiResponse));
    render(<RecherchePageContent />);

    await act(async () => {
      fireEvent.change(screen.getByRole("combobox"), {
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
      fireEvent.change(screen.getByRole("combobox"), {
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
      fireEvent.change(screen.getByRole("combobox"), {
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

  // The page no longer builds the query itself — it calls the shared client
  // (ETNI-1415 AC2). The classification/confidence filters this once also
  // carried are retired (ETNI-1808); only the page limit and the query text
  // reach the request now.
  // @req REQ-002
  it("carries the page limit onto the request", async () => {
    vi.mocked(nextNavigation.useSearchParams).mockReturnValue(
      new URLSearchParams("q=Zulu") as ReturnType<
        typeof nextNavigation.useSearchParams
      >
    );
    mockFetch.mockResolvedValue(okJson(searchApiResponse));

    await act(async () => {
      render(<RecherchePageContent />);
      await new Promise((r) => setTimeout(r, 100));
    });

    const requested = new URL(
      String(mockFetch.mock.calls[0][0]),
      "http://localhost"
    );
    expect(Object.fromEntries(requested.searchParams)).toEqual({
      q: "Zulu",
      limit: "20",
    });
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
      fireEvent.change(screen.getByRole("combobox"), {
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

  // @req REQ-124
  it("keeps the desktop complementary panel when the dominant answer is the only result", async () => {
    mockFetch.mockResolvedValue(okJson(searchApiResponse));
    render(<RecherchePageContent />);

    await act(async () => {
      fireEvent.change(screen.getByRole("combobox"), {
        target: { value: "Zulu" },
      });
      fireEvent.click(screen.getByRole("button", { name: /rechercher/i }));
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    await waitFor(() => {
      expect(screen.getByTestId("search-pivot")).toBeInTheDocument();
    });
    expect(
      screen.getByTestId("dominant-answer-panel-wrapper")
    ).toBeInTheDocument();
  });

  // @req REQ-124
  it("keeps the pivot and result list in the flexible column of a desktop main-aside layout", async () => {
    await renderPivotWithRelatedResults();

    const layout = screen.getByTestId("search-results-layout");
    const main = within(layout).getByTestId("search-results-main");
    expect(layout.className).toMatch(
      /min-\[760px\]:grid-cols-\[minmax\(0,1fr\)_[^\]]+\]/
    );
    expect(layout.className).not.toMatch(/(?:sm|md|lg):grid-cols-/);
    expect(within(main).getByTestId("search-pivot")).toBeInTheDocument();
    expect(within(main).getByTestId("search-results-list")).toBeInTheDocument();
  });

  // Atlas charter §5: one component, two anchorings — a bottom sheet below
  // 760px, a side panel above, same facts either way. The panel used to be
  // `hidden` below the breakpoint, which dropped the facts entirely at
  // 430px; it now stays in flow and is only re-styled from a rule
  // (border-t) into a side panel at the breakpoint.
  // @req REQ-124
  it("keeps the complementary answer in flow as a bottom sheet below 760px, and as a side panel at that breakpoint (ETNI-1796)", async () => {
    await renderPivotWithRelatedResults();

    const wrapper = screen.getByTestId("dominant-answer-panel-wrapper");
    expect(wrapper.className).not.toMatch(/\bhidden\b/);
    expect(wrapper.className).toContain("border-t");
    expect(wrapper.className).toContain("min-[760px]:border-t-0");
    expect(wrapper.className).toContain("min-[760px]:self-start");
    expect(wrapper.className).not.toMatch(/(?:sm|md|lg):block/);
  });

  // @req REQ-124
  it("turns only the remaining desktop results into a two-column grid", async () => {
    await renderPivotWithRelatedResults();

    const list = screen.getByTestId("search-results-list");
    expect(list.className).toContain("grid-cols-1");
    expect(list.className).toContain("min-[760px]:grid-cols-2");
    expect(list.className).not.toMatch(/(?:sm|md|lg):grid-cols-2/);
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
  });

  // The panel used to pin itself with `sticky` under the retracting header;
  // ETNI-1807 (SERP consolidation) drops that so the panel scrolls with the
  // page like the rest of the unified surface.
  // @req REQ-124
  it("no longer pins the complementary panel with position: sticky (ETNI-1807)", async () => {
    await renderPivotWithRelatedResults();

    const wrapper = screen.getByTestId("dominant-answer-panel-wrapper");
    expect(wrapper.className).not.toMatch(/\bsticky\b/);
    expect(wrapper.className).not.toMatch(/top-\[calc/);
  });

  // @req REQ-124
  it("shows the sourced highlight block between the pivot card and the results, with its tier visible", async () => {
    await renderPivotWithRelatedResults();

    const main = screen.getByTestId("search-results-main");
    const children = Array.from(main.children);
    const pivotIndex = children.indexOf(screen.getByTestId("search-pivot"));
    const highlightIndex = children.indexOf(
      screen.getByTestId("sourced-highlight-block")
    );
    expect(highlightIndex).toBeGreaterThan(pivotIndex);

    expect(screen.getByTestId("sourced-highlight-block")).toHaveTextContent(
      /philologue en 1862/
    );
    expect(screen.getByTestId("sourced-highlight-tier")).toHaveTextContent(
      "Source référencée"
    );
  });

  // @req REQ-124
  it("omits the sourced highlight block when the bank has no fact about the pivot", async () => {
    mockFetch.mockResolvedValue(
      okJson({
        data: {
          peoples: [
            {
              id: "PPL_UNKNOWN_ENTITY",
              nameMain: "Peuple inconnu",
              content: {},
            },
          ],
          countries: [],
          families: [],
          total: 1,
        },
      })
    );
    render(<RecherchePageContent />);

    await act(async () => {
      fireEvent.change(screen.getByRole("combobox"), {
        target: { value: "Peuple inconnu" },
      });
      fireEvent.click(screen.getByRole("button", { name: /rechercher/i }));
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    await waitFor(() => {
      expect(screen.getByTestId("search-pivot")).toBeInTheDocument();
    });
    expect(
      screen.queryByTestId("sourced-highlight-block")
    ).not.toBeInTheDocument();
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
      fireEvent.change(screen.getByRole("combobox"), {
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
      fireEvent.change(screen.getByRole("combobox"), {
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
    const input = screen.getByRole("combobox");
    expect(input.getAttribute("autocomplete")).toBe("off");
  });

  // ── 9. SERP consolidation (ETNI-1808) ──────────────────────────────────────

  // @req REQ-124
  it("shows the result grid and no empty-state once a ?q= arrival resolves, with the suggest dropdown closed", async () => {
    vi.mocked(nextNavigation.useSearchParams).mockReturnValue(
      new URLSearchParams("q=Zulu") as ReturnType<
        typeof nextNavigation.useSearchParams
      >
    );
    mockFetch.mockResolvedValue(
      okJson({
        data: {
          peoples: [
            { id: "PPL_ZULU", nameMain: "Zulu", relevance: 0.4, content: {} },
            {
              id: "PPL_XHOSA",
              nameMain: "Xhosa",
              relevance: 0.35,
              content: {},
            },
          ],
          countries: [],
          families: [],
          total: 2,
        },
      })
    );

    await act(async () => {
      render(<RecherchePageContent />);
      await new Promise((r) => setTimeout(r, 100));
    });

    await waitFor(() => {
      expect(screen.getByTestId("search-results-list")).toBeInTheDocument();
    });
    expect(screen.queryByText(/aucun résultat/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  // @req REQ-124
  it("omits a lens whose corpus-wide count is 0 from the mounted lens bar", async () => {
    mockFetch.mockResolvedValue(
      okJson({
        data: {
          peoples: [
            { id: "PPL_ZULU", nameMain: "Zulu", relevance: 0.4, content: {} },
          ],
          countries: [],
          families: [],
          total: 1,
          peoplesTotal: 1,
          countriesTotal: 0,
          familiesTotal: 0,
          languagesTotal: 0,
          personsTotal: 0,
          patronymesTotal: 0,
        },
      })
    );
    render(<RecherchePageContent />);

    await act(async () => {
      fireEvent.change(screen.getByRole("combobox"), {
        target: { value: "peuples zoulous" },
      });
      fireEvent.click(screen.getByRole("button", { name: /rechercher/i }));
      await new Promise((r) => setTimeout(r, 100));
    });

    // The page shows a count on every chip label ("Tout (1)"), so the lens
    // name is matched as a prefix rather than an exact string.
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /^Tout\b/ })
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: /^Peuples\b/ })
    ).toBeInTheDocument();
    for (const name of ["Langues", "Familles", "Pays", "Noms", "Personnes"]) {
      expect(
        screen.queryByRole("button", { name: new RegExp(`^${name}\\b`) })
      ).not.toBeInTheDocument();
    }
  });

  // @req REQ-124
  it("titles the page with the pivot's autonym, the exonym alongside it in the same heading", async () => {
    mockFetch.mockResolvedValue(
      okJson({
        data: {
          peoples: [
            {
              id: "PPL_ZULU",
              nameMain: "Zulu",
              content: { appellations: { selfAppellation: "amaZulu" } },
            },
          ],
          countries: [],
          families: [],
          total: 1,
        },
      })
    );
    render(<RecherchePageContent />);

    await act(async () => {
      fireEvent.change(screen.getByRole("combobox"), {
        target: { value: "Zulu" },
      });
      fireEvent.click(screen.getByRole("button", { name: /rechercher/i }));
      await new Promise((r) => setTimeout(r, 100));
    });

    await waitFor(() => {
      expect(screen.getByTestId("search-pivot")).toBeInTheDocument();
    });
    // Exact rather than substring content: "Zulu" is itself a substring of
    // "amaZulu", so a loose match would pass even without the exonym.
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toBe("amaZulu Zulu");
  });

  // @req REQ-124
  it("titles the page with the result count when no pivot resolves", async () => {
    mockFetch.mockResolvedValue(
      okJson({
        data: {
          peoples: [
            { id: "A", nameMain: "Bété", relevance: 0.8, content: {} },
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
      fireEvent.change(screen.getByRole("combobox"), {
        target: { value: "Bété" },
      });
      fireEvent.click(screen.getByRole("button", { name: /rechercher/i }));
      await new Promise((r) => setTimeout(r, 100));
    });

    await waitFor(() => {
      expect(screen.queryByTestId("search-pivot")).not.toBeInTheDocument();
    });
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent(/2 résultats pour/i);
  });

  // @req REQ-124
  it("titles the page 'Recherche' before any query is committed", () => {
    render(<RecherchePageContent />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Recherche"
    );
  });

  // @req REQ-124
  it("renders the empty state exactly once, with no result grid, for a zero-result response", async () => {
    mockFetch.mockResolvedValue(okJson(emptyApiResponse));
    render(<RecherchePageContent />);

    await act(async () => {
      fireEvent.change(screen.getByRole("combobox"), {
        target: { value: "xyzzy" },
      });
      fireEvent.click(screen.getByRole("button", { name: /rechercher/i }));
      await new Promise((r) => setTimeout(r, 100));
    });

    await waitFor(() => {
      expect(screen.getAllByText(/aucun résultat/i)).toHaveLength(1);
    });
    expect(screen.queryByTestId("search-results-list")).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("search-results-layout")
    ).not.toBeInTheDocument();
  });
});
