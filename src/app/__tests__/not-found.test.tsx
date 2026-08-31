import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  __esModule: true,
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

import NotFound from "@/app/not-found";
import { getLocalizedRoute, getPeopleRoute } from "@/lib/routing";

/**
 * The root boundary is not a leftover: `notFound()` raised in
 * `[lang]/layout.tsx` cannot be caught by `[lang]/not-found.tsx`, which
 * renders inside that very layout. Every rejected segment lands here, and it
 * lands under a URL whose first segment is not a locale — so nothing on this
 * page may be derived from the route.
 */
describe("NotFound (root boundary)", () => {
  // @req REQ-099
  it("renders the same French Fiche introuvable page as the localized 404", () => {
    render(<NotFound />);
    expect(
      screen.getByRole("heading", { name: /fiche introuvable/i })
    ).toBeTruthy();
  });

  /**
   * The page used to prove it was pinned to `fr` by printing the three route
   * templates, corpus key prefixes and all. Its links carry the same proof
   * without teaching the reader a URL grammar they cannot use: a mistyped
   * address is not repairable from a template, and a dead link was never
   * typed at all.
   */
  // @req REQ-099
  it("points at fr, never at the rejected segment, and spells out no key", () => {
    const { container } = render(<NotFound />);

    expect(
      screen
        .getByRole("link", { name: /rechercher une fiche/i })
        .getAttribute("href")
    ).toContain("/fr/");
    expect(container.textContent).not.toMatch(/PPL_|FLG_/);
  });

  // @req REQ-099
  it("sends the reader to the fr search page", () => {
    render(<NotFound />);
    expect(
      screen
        .getByRole("link", { name: /rechercher une fiche/i })
        .getAttribute("href")
    ).toBe(getLocalizedRoute("fr", "search"));
  });

  // @req REQ-099
  it("renders no Oops text anywhere", () => {
    const { container } = render(<NotFound />);
    expect(container.textContent).not.toMatch(/oops/i);
  });
});
