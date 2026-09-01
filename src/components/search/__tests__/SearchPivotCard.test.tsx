import { render, screen, within } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { SearchPivotCard } from "../SearchPivotCard";
import type { SearchResult } from "@/types/afrik-frontend";
import { getFamilyRoute, getCountryRoute, getPeopleRoute } from "@/lib/routing";

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
  autonym: "Bété",
  languageFamilyId: "FLG_KROU",
  languageFamilyName: "Krou",
  countryIds: ["CIV"],
  population: 994_321,
  confidence: 0.87,
};

function renderCard(result: SearchResult) {
  return render(<SearchPivotCard result={result} language="fr" />);
}

describe("SearchPivotCard", () => {
  // @req REQ-124
  it("leads with the autonym and demotes the exonym beside it", () => {
    renderCard({ ...bete, autonym: "Bete", name: "Bété" });

    const heading = screen.getByRole("heading", { level: 2 });
    expect(within(heading).getByText("Bete")).toBeInTheDocument();
    expect(within(heading).getByText("Bété")).toBeInTheDocument();
  });

  // @req REQ-124
  it("shows a single name when there is no distinct autonym", () => {
    renderCard({ ...bete, autonym: undefined });

    const heading = screen.getByRole("heading", { level: 2 });
    expect(within(heading).getByText("Bété")).toBeInTheDocument();
  });

  // @req REQ-124
  it("formats population in fr-FR grouping", () => {
    renderCard({ ...bete, population: 994_321 });

    expect(screen.getByText("994 321")).toBeInTheDocument();
  });

  // @req REQ-124
  it("rounds and shows confidence as a whole percent", () => {
    renderCard({ ...bete, confidence: 0.874 });

    expect(screen.getByText("87 %")).toBeInTheDocument();
  });

  // @req REQ-124
  it("renders a family badge when the corpus carries one", () => {
    renderCard(bete);

    expect(
      screen.getByRole("link", { name: /famille linguistique Krou/i })
    ).toHaveAttribute("href", getFamilyRoute("fr", "FLG_KROU"));
  });

  // @req REQ-124
  it("omits the family badge rather than placeholding it when the corpus has none (FR98)", () => {
    renderCard({
      ...bete,
      languageFamilyId: undefined,
      languageFamilyName: undefined,
    });

    expect(
      screen.queryByRole("link", { name: /famille linguistique/i })
    ).not.toBeInTheDocument();
  });

  // @req REQ-124
  it("renders a country badge when the corpus carries one", () => {
    renderCard(bete);

    expect(screen.getByRole("link", { name: /Côte d.Ivoire/ })).toHaveAttribute(
      "href",
      getCountryRoute("fr", "CIV")
    );
  });

  // @req REQ-124
  it("omits country badges rather than placeholding them when the corpus has none (FR98)", () => {
    renderCard({ ...bete, countryIds: [] });

    expect(
      screen.queryByRole("link", { name: /Côte d.Ivoire/ })
    ).not.toBeInTheDocument();
  });

  // @req REQ-124
  it("links to the fiche through an explicit 'Ouvrir la fiche' link", () => {
    renderCard(bete);

    expect(
      screen.getByRole("link", { name: /ouvrir la fiche/i })
    ).toHaveAttribute("href", getPeopleRoute("fr", "PPL_BETE"));
  });
});
