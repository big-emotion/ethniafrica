import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAllCountries } from "@/lib/afrikLoader";
import type { CountrySummary } from "@/types/afrik-frontend";
import { CountryView } from "@/components/views/CountryView";

vi.mock("@/lib/afrikLoader", () => ({
  getAllCountries: vi.fn(),
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: vi.fn(() => false),
}));

const countries: CountrySummary[] = [
  {
    id: "ZAF",
    nameFr:
      "République d'Afrique du Sud (Republic of South Africa, iNingizimu Afrika)",
    nameCommonFr: "Afrique du Sud",
    nameOfficial:
      "République d'Afrique du Sud (Republic of South Africa, iNingizimu Afrika)",
  },
  {
    id: "ZWE",
    nameFr: "Republic of Zimbabwe",
    nameCommonFr: "Zimbabwe",
    nameOfficial: "Republic of Zimbabwe",
  },
];

function renderCountryView() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <CountryView language="fr" />
    </QueryClientProvider>
  );
}

describe("CountryView", () => {
  beforeEach(() => {
    vi.mocked(getAllCountries).mockResolvedValue(countries);
  });

  // The cards used to be a div with an onClick: reachable by mouse only, and
  // invisible to anything following links. A country fiche is a page, so the
  // way to it is a link.
  // @req REQ-091
  it("makes each card a link to that country's fiche", async () => {
    renderCountryView();

    const link = await screen.findByRole("link", { name: "Afrique du Sud" });
    expect(link).toHaveAttribute("href", "/fr/pays/ZAF");
  });

  // The card's own wrapper, not just any anchor inside it: ConfidenceChip
  // renders one of its own, so asking for `a[href]` anywhere in the subtree
  // would pass on the pointer-only card this test exists to forbid.
  // @req REQ-091
  it("leaves no card reachable by pointer alone", async () => {
    const { container } = renderCountryView();
    await screen.findByText("Afrique du Sud");

    const cards = container.querySelectorAll(".rounded-afh-xl");
    expect(cards.length).toBe(countries.length);
    for (const card of cards) {
      expect(card.querySelector('a[href^="/fr/pays/"]')).not.toBeNull();
    }
  });

  // ConfidenceChip puts its own anchor inside every card. Wrapping the card in
  // a link nested those, which is invalid HTML and threw a hydration error on
  // the whole directory.
  // @req REQ-091
  it("nests no anchor inside another", async () => {
    const { container } = renderCountryView();
    await screen.findByText("Afrique du Sud");

    expect(container.querySelectorAll("a a")).toHaveLength(0);
  });

  // @req REQ-001
  it("uses the French common name for cards and alphabet letters", async () => {
    renderCountryView();

    expect(
      await screen.findByRole("heading", { name: "Afrique du Sud" })
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        "République d'Afrique du Sud (Republic of South Africa, iNingizimu Afrika)"
      )
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "A" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "R" })).toBeDisabled();
  });

  // @req REQ-002
  it("filters by the French common name", async () => {
    renderCountryView();

    await screen.findByRole("heading", { name: "Afrique du Sud" });
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "afrique du sud" },
    });

    expect(
      screen.getByRole("heading", { name: "Afrique du Sud" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Zimbabwe" })
    ).not.toBeInTheDocument();
  });

  // @req REQ-002
  it.each([
    ["the official name", "république d'afrique du sud"],
    ["an endonym embedded in the official name", "iNingizimu Afrika"],
    ["the ISO identifier", "ZAF"],
  ])("matches %s", async (_label, search) => {
    renderCountryView();

    await screen.findByRole("heading", { name: "Afrique du Sud" });
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: search },
    });

    expect(
      screen.getByRole("heading", { name: "Afrique du Sud" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Zimbabwe" })
    ).not.toBeInTheDocument();
  });
});
