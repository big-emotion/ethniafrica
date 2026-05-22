import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import NotFound from "@/app/[lang]/not-found";

vi.mock("next/navigation", () => ({
  useParams: () => ({ lang: "fr" }),
}));

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

describe("NotFound ([lang]/not-found)", () => {
  it("renders the calm French heading Fiche introuvable", () => {
    render(<NotFound />);
    expect(
      screen.getByRole("heading", { name: /fiche introuvable/i })
    ).toBeTruthy();
  });

  it("explains the fiche-URL pattern", () => {
    const { container } = render(<NotFound />);
    expect(container.textContent).toMatch(/PPL_|FLG_|\/fr\//);
  });

  it("renders a search affordance link or input", () => {
    render(<NotFound />);
    // Either a link to the search page or an input for search
    const searchLinks = screen.getAllByRole("link");
    const hasSearchAffordance = searchLinks.some(
      (l) =>
        l.getAttribute("href")?.includes("recherche") ||
        l.getAttribute("href")?.includes("search")
    );
    expect(hasSearchAffordance).toBe(true);
  });

  it("renders Signaler une URL cassée CTA", () => {
    render(<NotFound />);
    expect(screen.getByText(/signaler une url cassée/i)).toBeTruthy();
  });

  it("renders no emoji in the page", () => {
    const { container } = render(<NotFound />);
    expect(container.textContent).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
  });

  it("renders no Oops text anywhere", () => {
    const { container } = render(<NotFound />);
    expect(container.textContent).not.toMatch(/[Oo]ops/);
  });
});
