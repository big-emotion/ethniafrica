import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

import NamingDossierPage, { metadata } from "../page";
import { NAMING_DOSSIER_SECTIONS } from "@/lib/dossiers/namingDossier";
import { getLocalizedRoute } from "@/lib/routing";

/**
 * The dossier the two naming axes needed and neither could hold.
 *
 * Appellations indexes 3 134 ethnonym forms and Nom publishes five naming
 * systems; an index has no room to say why either is contested, so a reader
 * met the evidence and never the argument.
 */
describe("the « Nommer les peuples » dossier", () => {
  // @req REQ-114
  it("opens each section and sends the reader to the axis it argues about", () => {
    render(<NamingDossierPage />);

    for (const section of NAMING_DOSSIER_SECTIONS) {
      expect(
        screen.getByRole("heading", { level: 2, name: section.title })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: section.link.label })
      ).toHaveAttribute("href", getLocalizedRoute("fr", section.link.page));
    }
  });

  /**
   * DEC-040 is a rule about what the software may not do, and the only place
   * it can be said to a reader is here — the fiche states the association, and
   * a reader takes the inference for granted unless it is refused out loud.
   */
  // @req REQ-114
  it("refuses the inference from a name to a person's people, in words", () => {
    const { container } = render(<NamingDossierPage />);

    expect(container.textContent).toMatch(
      /jamais l'origine d'une personne|jamais l'origine d’une personne/
    );
  });

  // @req REQ-091
  it("declares the canonical URL for the dossier", () => {
    expect(metadata.alternates?.canonical).toBe(
      getLocalizedRoute("fr", "naming")
    );
  });
});
