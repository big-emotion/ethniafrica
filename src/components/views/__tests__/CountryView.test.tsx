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
      <CountryView language="fr" onCountrySelect={vi.fn()} />
    </QueryClientProvider>
  );
}

describe("CountryView", () => {
  beforeEach(() => {
    vi.mocked(getAllCountries).mockResolvedValue(countries);
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
