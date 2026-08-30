import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { ActionLink } from "@/components/ui/ActionLink";

/**
 * Form A of the actions charter (docs/design/actions-charter.md §2).
 *
 * The assertions on class names are not implementation detail here: the
 * charter's contract *is* the rendered dress, and it is the only thing that
 * stops the seven hand-set spellings this component replaces from growing
 * back one component at a time.
 */
describe("ActionLink — actions charter form A", () => {
  // @req REQ-091
  it("names its destination and points at it", () => {
    render(
      <ActionLink href="/fr/explorer/pays/ago">Lire la fiche Angola</ActionLink>
    );

    const link = screen.getByRole("link", { name: "Lire la fiche Angola" });
    expect(link).toHaveAttribute("href", "/fr/explorer/pays/ago");
  });

  // @req REQ-091
  it("keeps the arrow out of the accessible name", () => {
    render(<ActionLink href="/fr/explorer/pays">Voir les 54 pays</ActionLink>);

    // The arrow is drawn, but a screen reader must not read "arrow" after
    // every link on the page.
    const link = screen.getByRole("link", { name: "Voir les 54 pays" });
    expect(link.textContent).toContain("→");
  });

  // @req REQ-091
  it("draws an arrow on every action link", () => {
    render(<ActionLink href="/fr/comprendre">Remonter</ActionLink>);

    expect(screen.getByTestId("action-link-arrow")).toHaveAttribute(
      "aria-hidden",
      "true"
    );
  });

  // @req REQ-091
  it("stays a plain anchor for a same-page target", () => {
    // A hash target scrolls; routing it through the client router would
    // remount the page the reader is standing on.
    render(<ActionLink href="#fiche">Lire la fiche complète</ActionLink>);

    const link = screen.getByRole("link", { name: "Lire la fiche complète" });
    expect(link).toHaveAttribute("href", "#fiche");
  });

  // @req REQ-091
  it("carries the charter's label size and target height", () => {
    render(<ActionLink href="/fr/jouer">Se tester</ActionLink>);

    const link = screen.getByRole("link", { name: "Se tester" });
    expect(link.className).toContain("text-afh-small");
    expect(link.className).toContain("min-h-11");
  });

  // @req REQ-091
  it("is bare at rest and underlines only on hover and focus", () => {
    render(<ActionLink href="/fr/jouer">Se tester</ActionLink>);

    const link = screen.getByRole("link", { name: "Se tester" });
    // `underline` unprefixed would be the rest state; only the prefixed
    // forms may appear.
    expect(link.className).not.toMatch(/(?:^|\s)underline(?:\s|$)/);
    expect(link.className).toContain("hover:underline");
    expect(link.className).toContain("focus-visible:underline");
  });

  // @req REQ-091
  it("lets the caller label it for assistive tech without changing the text", () => {
    render(
      <ActionLink
        href="/fr/explorer/familles/flg_nc"
        aria-label="Lire la fiche de la famille nigéro-congolaise"
      >
        Lire la fiche complète
      </ActionLink>
    );

    const link = screen.getByRole("link", {
      name: "Lire la fiche de la famille nigéro-congolaise",
    });
    expect(link.textContent).toContain("Lire la fiche complète");
  });
});
