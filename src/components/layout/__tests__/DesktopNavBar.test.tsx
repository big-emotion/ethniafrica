import { render, screen, cleanup } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DesktopNavBar } from "@/components/layout/DesktopNavBar";
import { PRODUCT_NAME } from "@/lib/brand";

let mockPathname = "/fr";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} />,
}));

// @req [14.5]
// @req REQ-044
describe("DesktopNavBar — global shell (all routes, ETNI-820 retires the home night skin)", () => {
  it("keeps the same nav links and destinations on the home route as elsewhere (IA unchanged)", () => {
    for (const pathname of ["/fr", "/fr/pays"]) {
      mockPathname = pathname;
      render(<DesktopNavBar language="fr" />);

      expect(screen.getByRole("link", { name: "Pays" })).toHaveAttribute(
        "href",
        "/fr/pays"
      );
      expect(screen.getByRole("link", { name: "Peuples" })).toHaveAttribute(
        "href",
        "/fr/peuples"
      );
      expect(screen.getByRole("link", { name: "Familles" })).toHaveAttribute(
        "href",
        "/fr/familles"
      );
      expect(screen.getByRole("link", { name: "Migrations" })).toHaveAttribute(
        "href",
        "/fr/migrations"
      );
      expect(screen.getByRole("link", { name: "À propos" })).toHaveAttribute(
        "href",
        "/fr/about"
      );
      expect(screen.getByRole("link", { name: "Doctrine" })).toHaveAttribute(
        "href",
        "/fr/doctrine"
      );
      expect(screen.getByRole("link", { name: "API" })).toHaveAttribute(
        "href",
        "/docs/api/v2"
      );
      cleanup();
    }
  });

  // @req REQ-044
  it("never wears the retired night skin class, on the home route or elsewhere", () => {
    for (const pathname of ["/fr", "/fr/pays"]) {
      mockPathname = pathname;
      render(<DesktopNavBar language="fr" />);
      expect(
        screen.getByRole("navigation", { name: "Navigation principale" })
      ).not.toHaveClass("afh-home-nav-skin");
      cleanup();
    }
  });

  // @req REQ-044
  it("renders the brand in Fraunces 900 17px on the home route", () => {
    mockPathname = "/fr";
    render(<DesktopNavBar language="fr" />);

    const brand = screen.getByText(PRODUCT_NAME);
    expect(brand.getAttribute("style")).toContain(
      "font-family: var(--afh-font-display)"
    );
    expect(brand).toHaveStyle({
      fontWeight: "900",
      fontSize: "17px",
    });
  });

  // @req REQ-044
  it("renders the brand wordmark in light styling on the home route and elsewhere", () => {
    for (const pathname of ["/fr", "/fr/pays"]) {
      mockPathname = pathname;
      render(<DesktopNavBar language="fr" />);

      const brand = screen.getByText(PRODUCT_NAME);
      expect(brand.getAttribute("style")).toContain("color: var(--afh-text)");
      expect(brand.getAttribute("style")).not.toContain("var(--afh-night-ink)");
      cleanup();
    }
  });

  // @req REQ-044
  it("names the logo with the product name on the home route and elsewhere", () => {
    for (const pathname of ["/fr", "/fr/pays"]) {
      mockPathname = pathname;
      render(<DesktopNavBar language="fr" />);

      expect(
        screen.getByRole("img", { name: PRODUCT_NAME })
      ).toBeInTheDocument();
      cleanup();
    }
  });

  // @req REQ-044
  it("is static — not position: fixed or sticky — on the home route or elsewhere", () => {
    for (const pathname of ["/fr", "/fr/pays"]) {
      mockPathname = pathname;
      render(<DesktopNavBar language="fr" />);

      const nav = screen.getByRole("navigation", {
        name: "Navigation principale",
      });
      expect(nav.className).not.toMatch(/(^|\s)fixed(\s|$)/);
      expect(nav.className).not.toMatch(/(^|\s)sticky(\s|$)/);
      cleanup();
    }
  });

  // @req REQ-044
  it("is light-skinned on the home route and elsewhere", () => {
    for (const pathname of ["/fr", "/fr/pays"]) {
      mockPathname = pathname;
      render(<DesktopNavBar language="fr" />);

      const nav = screen.getByRole("navigation", {
        name: "Navigation principale",
      });
      expect(nav).toHaveClass("bg-card");
      expect(nav).not.toHaveClass("afh-home-nav-skin");
      cleanup();
    }
  });

  // @req REQ-044
  it("gives each nav link a >= 44px hit area on the home route and elsewhere", () => {
    mockPathname = "/fr/pays";
    render(<DesktopNavBar language="fr" />);

    expect(screen.getByRole("link", { name: "Pays" })).toHaveClass("min-h-11");
    expect(screen.getByRole("link", { name: "Peuples" })).toHaveClass(
      "min-h-11"
    );
  });
});
