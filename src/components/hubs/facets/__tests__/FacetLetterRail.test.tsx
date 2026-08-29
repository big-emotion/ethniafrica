import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FacetLetterRail } from "@/components/hubs/facets/FacetLetterRail";
import { getFacetRoute } from "@/lib/hubs/facets";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

/**
 * The alphabetical index, lifted out of the peoples page.
 *
 * It moves for two reasons. It is the third narrowing on a surface that now
 * offers one line, so it belongs in the fold with the others; and it was the
 * only narrowing living outside the form, which is how applying a family
 * silently dropped the letter a reader was on.
 *
 * It stays 27 anchors. A letter is a reading of the corpus, so it has an
 * address -- which is also what makes it work before hydration and followable
 * by a crawler. Folding it away keeps every one of them in the DOM.
 */

const PEUPLES = getFacetRoute("fr", "peoples");

const href = (letter: string | null) =>
  letter ? `${PEUPLES}?lettre=${letter}` : PEUPLES;

describe("the facet letter rail", () => {
  // @req REQ-114
  it("offers every letter of the alphabet, and a way back to all of them", () => {
    render(<FacetLetterRail current={null} hrefFor={href} />);

    expect(screen.getAllByRole("link")).toHaveLength(27);
    expect(screen.getByRole("link", { name: "Tous" })).toHaveAttribute(
      "href",
      PEUPLES
    );
  });

  // @req REQ-114
  it("marks the letter the reading is on", () => {
    render(<FacetLetterRail current="K" hrefFor={href} />);

    expect(screen.getByRole("link", { name: "K" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(screen.getByRole("link", { name: "Tous" })).not.toHaveAttribute(
      "aria-current"
    );
  });

  // @req REQ-114
  it("marks the whole alphabet as the reading when no letter is chosen", () => {
    render(<FacetLetterRail current={null} hrefFor={href} />);

    expect(screen.getByRole("link", { name: "Tous" })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });
});
