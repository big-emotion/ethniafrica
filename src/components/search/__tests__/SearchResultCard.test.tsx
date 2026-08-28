import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { SearchResultCard } from "../SearchResultCard";
import type { SearchResult } from "@/types/afrik-frontend";

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    className,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className} {...rest}>
      {children}
    </a>
  ),
}));

const bete: SearchResult = {
  type: "people",
  id: "PPL_BETE",
  name: "Bété",
  languageFamilyId: "FLG_KROU",
  languageFamilyName: "Krou",
  countryIds: ["CIV"],
  population: 994_000,
};

function renderCard(result: SearchResult, onNavigate?: () => void) {
  return render(
    <SearchResultCard result={result} language="fr" onNavigate={onNavigate} />
  );
}

describe("SearchResultCard", () => {
  // @req REQ-002
  it("links a people result to its fiche", () => {
    renderCard(bete);

    expect(screen.getByRole("link", { name: "Bété" })).toHaveAttribute(
      "href",
      "/fr/peuples/PPL_BETE"
    );
  });

  // @req REQ-002
  it("links a country result to its fiche", () => {
    renderCard({ type: "country", id: "CIV", name: "Côte d'Ivoire" });

    expect(screen.getByRole("link", { name: "Côte d'Ivoire" })).toHaveAttribute(
      "href",
      "/fr/pays/CIV"
    );
  });

  // @req REQ-002
  it("links a language-family result to its fiche", () => {
    renderCard({ type: "languageFamily", id: "FLG_KROU", name: "Krou" });

    expect(screen.getByRole("link", { name: "Krou" })).toHaveAttribute(
      "href",
      "/fr/familles/FLG_KROU"
    );
  });

  // @req REQ-002
  it("sends the linguistic family to a family-scoped search, not to a dead badge", () => {
    renderCard(bete);

    expect(
      screen.getByRole("link", { name: /famille linguistique Krou/i })
    ).toHaveAttribute("href", "/fr/recherche?family=FLG_KROU");
  });

  // @req REQ-002
  it("names each country in French and scopes a search to it", () => {
    renderCard(bete);

    expect(
      screen.getByRole("link", { name: /Côte d’Ivoire|Côte d'Ivoire/ })
    ).toHaveAttribute("href", "/fr/recherche?country=CIV");
  });

  // @req REQ-002
  it("counts the countries it does not have room to name", () => {
    renderCard({
      ...bete,
      countryIds: ["CIV", "LBR", "GHA", "MLI", "GIN"],
    });

    expect(screen.getByText("+2")).toBeInTheDocument();
  });

  // @req REQ-002
  it("renders the match excerpt as marked text rather than raw markup", () => {
    const { container } = renderCard({
      ...bete,
      snippet: "Wollo ([[Bete]] Amhara)",
    });

    expect(container.querySelectorAll("mark")).toHaveLength(1);
    expect(container.textContent).toContain("Wollo (Bete Amhara)");
  });

  // @req REQ-002
  it("notifies its host when a link is activated, so a modal can close", async () => {
    const onNavigate = vi.fn();
    renderCard(bete, onNavigate);

    await userEvent.click(screen.getByRole("link", { name: "Bété" }));

    expect(onNavigate).toHaveBeenCalled();
  });

  // @req REQ-091
  it("scopes itself to its entity accent instead of naming a category token", () => {
    renderCard(bete);
    const card = screen.getByTestId("search-result-card");

    expect(card.className).toContain("afh-accent-ocre");
    expect(card.className).not.toContain("--afh-cat-");
  });
});
