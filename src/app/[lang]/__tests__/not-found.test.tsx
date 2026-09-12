import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import NotFound from "@/app/[lang]/not-found";
import { getLocalizedRoute } from "@/lib/routing";

const mockUsePathname = vi.fn(() => "/fr/introuvable");
vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
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
  beforeEach(() => mockUsePathname.mockReturnValue("/fr/introuvable"));

  // @req REQ-099
  it("renders the calm French heading Page introuvable", () => {
    render(<NotFound />);
    expect(
      screen.getByRole("heading", { name: /page introuvable/i })
    ).toBeTruthy();
  });

  // @req REQ-099
  it("says why the page is missing, and spells out no atlas key", () => {
    const { container } = render(<NotFound />);
    expect(container.textContent).toMatch(/pas encore publiée/i);
    expect(container.textContent).not.toMatch(/PPL_|FLG_/);
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

  // @req REQ-145
  it("renders the English recovery path below /en", () => {
    mockUsePathname.mockReturnValue("/en/missing");

    render(<NotFound />);

    expect(
      screen.getByRole("heading", { name: "Page not found" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Search for a page" })
    ).toHaveAttribute("href", getLocalizedRoute("en", "search"));
    expect(screen.queryByText(/pas encore publiée/i)).not.toBeInTheDocument();
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
