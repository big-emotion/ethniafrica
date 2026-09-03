import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { SearchResultCard } from "../SearchResultCard";
import type { SearchResult } from "@/types/afrik-frontend";
import {
  getCountryRoute,
  getFamilyRoute,
  getLanguageRoute,
  getLocalizedRoute,
  getPatronymeRoute,
  getPeopleRoute,
  getPersonRoute,
} from "@/lib/routing";

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
      getPeopleRoute("fr", "PPL_BETE")
    );
  });

  // @req REQ-002
  it("links a country result to its fiche", () => {
    renderCard({ type: "country", id: "CIV", name: "Côte d'Ivoire" });

    expect(screen.getByRole("link", { name: "Côte d'Ivoire" })).toHaveAttribute(
      "href",
      getCountryRoute("fr", "CIV")
    );
  });

  // @req REQ-002
  it("links a language-family result to its fiche", () => {
    renderCard({ type: "languageFamily", id: "FLG_KROU", name: "Krou" });

    expect(screen.getByRole("link", { name: "Krou" })).toHaveAttribute(
      "href",
      getFamilyRoute("fr", "FLG_KROU")
    );
  });

  // REQ-136: a language reaches its own fiche, not a peoples-scoped search.
  // @req REQ-136
  it("links a language result to its fiche", () => {
    renderCard({ type: "language", id: "swa", name: "Swahili" });

    expect(screen.getByRole("link", { name: "Swahili" })).toHaveAttribute(
      "href",
      getLanguageRoute("fr", "swa")
    );
  });

  // @req REQ-002
  it("sends the linguistic family to a family-scoped search, not to a dead badge", () => {
    renderCard(bete);

    expect(
      screen.getByRole("link", { name: /famille linguistique Krou/i })
    ).toHaveAttribute(
      "href",
      `${getLocalizedRoute("fr", "search")}?family=FLG_KROU`
    );
  });

  // @req REQ-002
  it("names each country in French and scopes a search to it", () => {
    renderCard(bete);

    expect(
      screen.getByRole("link", { name: /Côte d’Ivoire|Côte d'Ivoire/ })
    ).toHaveAttribute(
      "href",
      `${getLocalizedRoute("fr", "search")}?country=CIV`
    );
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

  const delafosse: SearchResult = {
    type: "person",
    id: "PER_DELAFOSSE",
    name: "Maurice Delafosse",
    roleCategory: "ethnographer",
    peopleLinks: [
      { peopleId: "PPL_BETE", relationLabel: "observation" },
      { peopleId: "PPL_DIOULA", relationLabel: "membership" },
    ],
  };

  // @req REQ-126
  it("links a person result to its fiche", () => {
    renderCard(delafosse);

    expect(
      screen.getByRole("link", { name: "Maurice Delafosse" })
    ).toHaveAttribute("href", getPersonRoute("fr", "PER_DELAFOSSE"));
  });

  // @req REQ-126
  it("always shows a person's role category, with no interaction required", () => {
    renderCard(delafosse);

    expect(screen.getByText("Ethnographe")).toBeInTheDocument();
  });

  // @req REQ-126
  it("falls back to the raw role slug when it has no French label", () => {
    renderCard({ ...delafosse, roleCategory: "cartographer" });

    expect(screen.getByText("cartographer")).toBeInTheDocument();
  });

  // @req REQ-126
  it("words membership and observation distinctly, never as the same relation", () => {
    renderCard(delafosse);

    expect(
      screen.getByText("Observe / documente PPL_BETE")
    ).toBeInTheDocument();
    expect(screen.getByText("Membre de PPL_DIOULA")).toBeInTheDocument();
  });

  // @req REQ-126
  it("links each cited people to its own fiche", () => {
    renderCard(delafosse);

    expect(screen.getByRole("link", { name: /PPL_BETE/ })).toHaveAttribute(
      "href",
      getPeopleRoute("fr", "PPL_BETE")
    );
    expect(screen.getByRole("link", { name: /PPL_DIOULA/ })).toHaveAttribute(
      "href",
      getPeopleRoute("fr", "PPL_DIOULA")
    );
  });

  // @req REQ-126
  it("scopes a person result to a neutral accent, not a fifth categorical hue", () => {
    renderCard(delafosse);
    const card = screen.getByTestId("search-result-card");

    expect(card.className).toContain("afh-accent-neutral");
    expect(card.className).not.toContain("--afh-cat-");
  });

  const keita: SearchResult = {
    type: "patronyme",
    id: "PATR_KEITA",
    name: "Keïta",
  };

  // @req REQ-135
  it("links a patronyme result to its fiche", () => {
    renderCard(keita);

    expect(screen.getByRole("link", { name: "Keïta" })).toHaveAttribute(
      "href",
      getPatronymeRoute("fr", "PATR_KEITA")
    );
  });

  // @req REQ-135
  it("scopes a patronyme result to a neutral accent, not a fifth categorical hue", () => {
    renderCard(keita);
    const card = screen.getByTestId("search-result-card");

    expect(card.className).toContain("afh-accent-neutral");
    expect(card.className).not.toContain("--afh-cat-");
  });
});
