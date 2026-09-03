import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { NoResultsLeads } from "../NoResultsLeads";
import type { SearchLead } from "@/types/afrik-frontend";
import { getCountryRoute, getFamilyRoute, getPeopleRoute } from "@/lib/routing";

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

const leads: SearchLead[] = [
  { type: "people", id: "PPL_BAMBARA", name: "Bambara", similarity: 0.4 },
  { type: "country", id: "MLI", name: "Mali", similarity: 0.3 },
  {
    type: "languageFamily",
    id: "FLG_MANDE",
    name: "Mandé",
    similarity: 0.25,
  },
];

describe("NoResultsLeads", () => {
  // @req REQ-125
  it("renders nothing when there are no leads", () => {
    const { container } = render(<NoResultsLeads leads={[]} language="fr" />);

    expect(container).toBeEmptyDOMElement();
  });

  // @req REQ-125
  it("links each lead to its fiche", () => {
    render(<NoResultsLeads leads={leads} language="fr" />);

    expect(screen.getByRole("link", { name: /Bambara/ })).toHaveAttribute(
      "href",
      getPeopleRoute("fr", "PPL_BAMBARA")
    );
    expect(screen.getByRole("link", { name: /Mali/ })).toHaveAttribute(
      "href",
      getCountryRoute("fr", "MLI")
    );
    expect(screen.getByRole("link", { name: /Mandé/ })).toHaveAttribute(
      "href",
      getFamilyRoute("fr", "FLG_MANDE")
    );
  });

  // @req REQ-125
  it("labels each lead with its entity kind", () => {
    render(<NoResultsLeads leads={leads} language="fr" />);

    expect(screen.getByRole("link", { name: /Bambara/ })).toHaveTextContent(
      "Peuple"
    );
    expect(screen.getByRole("link", { name: /Mali/ })).toHaveTextContent(
      "Pays"
    );
    expect(screen.getByRole("link", { name: /Mandé/ })).toHaveTextContent(
      "Famille linguistique"
    );
  });

  // @req REQ-125
  it("fires onNavigate when a lead is activated", () => {
    const onNavigate = vi.fn();
    render(
      <NoResultsLeads leads={leads} language="fr" onNavigate={onNavigate} />
    );

    screen.getByRole("link", { name: /Bambara/ }).click();

    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
});
