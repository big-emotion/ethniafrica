/**
 * The way out of a fiche.
 *
 * Measured on production 2026-09-07: ten fiches ended at a 100 % exit rate
 * after four minutes of reading. The document held; it simply stopped without
 * pointing anywhere. These tests hold the two halves of the fix — that the
 * links are there, and that a click is counted so the next measurement can say
 * whether they worked.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FicheOnward } from "@/components/fiche/FicheOnward";
import { trackEvent } from "@/lib/analytics/trackEvent";
import type { OnwardLink } from "@/lib/fiche/onwardLinks";

vi.mock("@/lib/analytics/trackEvent", () => ({
  trackEvent: vi.fn(),
}));

const links: OnwardLink[] = [
  {
    kind: "language-family",
    name: "Nigéro-congolais",
    href: "/fr/atlas/familles/FLG_NIGERO_CONGOLAIS",
  },
  { kind: "country", name: "Nigeria", href: "/fr/atlas/pays/NGA" },
];

describe("FicheOnward", () => {
  beforeEach(() => {
    vi.mocked(trackEvent).mockClear();
  });

  // @req REQ-091
  it("gives the reader a way on to every fiche the corpus relates", () => {
    render(<FicheOnward from="people" links={links} language="fr" />);

    expect(
      screen.getByRole("link", { name: /Nigéro-congolais/ })
    ).toHaveAttribute("href", "/fr/atlas/familles/FLG_NIGERO_CONGOLAIS");
    expect(screen.getByRole("link", { name: /Nigeria/ })).toHaveAttribute(
      "href",
      "/fr/atlas/pays/NGA"
    );
  });

  // @req REQ-091
  it("names what kind of thing each link leads to", () => {
    render(<FicheOnward from="people" links={links} language="fr" />);

    expect(screen.getByText("Famille linguistique")).toBeInTheDocument();
    expect(screen.getByText("Pays")).toBeInTheDocument();
  });

  // @req REQ-091
  it("announces itself to the reading rail as the chapter it is", () => {
    const { container } = render(
      <FicheOnward from="people" links={links} language="fr" />
    );

    expect(
      container.querySelector("[data-fiche-section='Poursuivre']")
    ).not.toBeNull();
  });

  // @req REQ-091
  it("is absent, not empty, when the corpus relates the fiche to nothing", () => {
    const { container } = render(
      <FicheOnward from="people" links={[]} language="fr" />
    );

    expect(container).toBeEmptyDOMElement();
  });

  // @req REQ-046
  it("records which kind of fiche the reader left and which they chose", () => {
    render(<FicheOnward from="people" links={links} language="fr" />);

    fireEvent.click(screen.getByRole("link", { name: /Nigeria/ }));

    expect(trackEvent).toHaveBeenCalledWith("fiche:related_click", {
      from: "people",
      to: "country",
    });
  });
});
