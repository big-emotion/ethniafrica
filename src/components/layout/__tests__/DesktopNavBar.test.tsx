import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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

describe("DesktopNavBar — home route header skin", () => {
  // @req [14.5]
  // @req REQ-044
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

  // @req [14.5]
  // @req REQ-044
  it("wears the prototype header skin class only on the home route", () => {
    mockPathname = "/fr";
    render(<DesktopNavBar language="fr" />);
    expect(
      screen.getByRole("navigation", { name: "Navigation principale" })
    ).toHaveClass("afh-home-nav-skin");
    cleanup();

    mockPathname = "/fr/pays";
    render(<DesktopNavBar language="fr" />);
    expect(
      screen.getByRole("navigation", { name: "Navigation principale" })
    ).not.toHaveClass("afh-home-nav-skin");
  });

  // @req [14.5]
  // @req REQ-044
  it("defines the skin class with the exact prototype header.top treatment", () => {
    const css = readFileSync(
      resolve(process.cwd(), "src/styles/home-nav.css"),
      "utf8"
    );
    const rule = css.match(/\.afh-home-nav-skin\s*\{([\s\S]*?)\}/);

    expect(rule).not.toBeNull();
    expect(rule?.[1]).toContain(
      "background: color-mix(in srgb, var(--afh-night-ground) 88%, transparent);"
    );
    expect(rule?.[1]).toContain("backdrop-filter: blur(10px);");
    expect(rule?.[1]).toContain(
      "border-bottom: 1px solid var(--afh-night-line);"
    );
  });

  // @req [14.5]
  // @req REQ-044
  it("renders the brand in Fraunces 900 17px with an uppercase tagline on the home route", () => {
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
  it("treats the logo next to the visible brand name as decorative", () => {
    mockPathname = "/fr";
    render(<DesktopNavBar language="fr" />);

    expect(
      screen.queryByRole("img", { name: PRODUCT_NAME })
    ).not.toBeInTheDocument();
  });

  // @req [14.5]
  // @req REQ-044
  it("does not render the brand wordmark off the home route", () => {
    mockPathname = "/fr/pays";
    render(<DesktopNavBar language="fr" />);

    expect(screen.queryByText(PRODUCT_NAME)).not.toBeInTheDocument();
  });
});
