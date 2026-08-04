import { render, screen, cleanup } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MobileNavBar } from "@/components/MobileNavBar";
import { PRODUCT_NAME } from "@/lib/brand";

let mockPathname = "/fr";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} />,
}));

describe("MobileNavBar — home route header skin", () => {
  // @req [14.5]
  // @req REQ-044
  it("wears the prototype header skin class only on the home route", () => {
    mockPathname = "/fr";
    render(<MobileNavBar language="fr" />);
    expect(screen.getByLabelText("Navigation principale")).toHaveClass(
      "afh-home-nav-skin"
    );
    cleanup();

    mockPathname = "/fr/pays";
    render(<MobileNavBar language="fr" />);
    expect(screen.getByLabelText("Navigation principale")).not.toHaveClass(
      "afh-home-nav-skin"
    );
  });

  // @req [14.5]
  // @req REQ-044
  it("keeps the same nav destinations on the home route (IA unchanged)", () => {
    for (const pathname of ["/fr", "/fr/pays"]) {
      mockPathname = pathname;
      render(<MobileNavBar language="fr" />);
      expect(
        screen.getByRole("button", { name: "Navigation" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Rechercher" })
      ).toBeInTheDocument();
      cleanup();
    }
  });

  // @req [14.5]
  // @req REQ-044
  it("renders the brand wordmark in Fraunces 900 17px on the home route", () => {
    mockPathname = "/fr";
    render(<MobileNavBar language="fr" />);

    const brand = screen.getByText(PRODUCT_NAME);
    expect(brand.getAttribute("style")).toContain(
      "font-family: var(--afh-font-display)"
    );
    expect(brand).toHaveStyle({ fontWeight: "900", fontSize: "17px" });
  });
});

// @req [16.3]
describe("MobileNavBar — global shell (non-home routes, ETNI-800)", () => {
  // @req REQ-044
  it("is static — not position: fixed or sticky — off the home route", () => {
    mockPathname = "/fr/pays";
    render(<MobileNavBar language="fr" />);

    const nav = screen.getByLabelText("Navigation principale");
    expect(nav.className).not.toMatch(/(^|\s)fixed(\s|$)/);
    expect(nav.className).not.toMatch(/(^|\s)sticky(\s|$)/);
  });

  // @req REQ-044
  it("stays fixed on the home route (unchanged until ETNI-820)", () => {
    mockPathname = "/fr";
    render(<MobileNavBar language="fr" />);

    const nav = screen.getByLabelText("Navigation principale");
    expect(nav.className).toMatch(/(^|\s)fixed(\s|$)/);
  });

  // @req REQ-044
  it("is light-skinned off the home route", () => {
    mockPathname = "/fr/pays";
    render(<MobileNavBar language="fr" />);

    const nav = screen.getByLabelText("Navigation principale");
    expect(nav).toHaveClass("bg-card");
    expect(nav).not.toHaveClass("afh-home-nav-skin");
  });

  // @req REQ-044
  it("renders the brand wordmark from brand.ts off the home route too", () => {
    mockPathname = "/fr/pays";
    render(<MobileNavBar language="fr" />);

    expect(screen.getByText(PRODUCT_NAME)).toBeInTheDocument();
  });

  // @req REQ-044
  it("gives the menu and search buttons a >= 44px hit area off the home route", () => {
    mockPathname = "/fr/pays";
    render(<MobileNavBar language="fr" />);

    expect(screen.getByRole("button", { name: "Navigation" })).toHaveClass(
      "min-h-11"
    );
    expect(screen.getByRole("button", { name: "Rechercher" })).toHaveClass(
      "min-h-11",
      "min-w-11"
    );
  });

  // Sticky secondary bars (context triad, filters) are the only elements
  // allowed to be sticky at 430px — the header must never collide with
  // them, which is only guaranteed if the header itself is never
  // sticky/fixed (see DesktopNavBar/MobileNavBar CSS above).
  // @req REQ-044
  it("does not collide with a route-local sticky secondary bar at 430px", () => {
    mockPathname = "/fr/pays";
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 430,
    });

    render(
      <>
        <MobileNavBar language="fr" />
        <div data-testid="secondary-bar" className="sticky top-0 z-40" />
      </>
    );

    const nav = screen.getByLabelText("Navigation principale");
    const secondaryBar = screen.getByTestId("secondary-bar");
    expect(nav.className).not.toMatch(/(^|\s)(fixed|sticky)(\s|$)/);
    expect(secondaryBar.className).toMatch(/(^|\s)sticky(\s|$)/);
  });
});
