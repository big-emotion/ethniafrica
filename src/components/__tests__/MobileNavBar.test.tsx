import { render, screen, cleanup, fireEvent } from "@testing-library/react";
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

// @req [14.5]
// @req REQ-044
describe("MobileNavBar — global shell (all routes, ETNI-820 retires the home night skin)", () => {
  // @req REQ-101 FR81
  it("links to the migrations route from the FLG navigation dropdown", async () => {
    render(<MobileNavBar language="fr" />);
    const trigger = screen.getByRole("button", { name: "Navigation FLG" });
    fireEvent.pointerDown(trigger, { pointerId: 1, button: 0 });
    fireEvent.click(trigger);
    expect(
      await screen.findByRole("menuitem", { name: "Migrations" })
    ).toBeInTheDocument();
  });

  it("never wears the retired night skin class, on the home route or elsewhere", () => {
    for (const pathname of ["/fr", "/fr/pays"]) {
      mockPathname = pathname;
      render(<MobileNavBar language="fr" />);
      expect(screen.getByLabelText("Navigation principale")).not.toHaveClass(
        "afh-home-nav-skin"
      );
      cleanup();
    }
  });

  // @req REQ-044
  it("keeps the same nav destinations on the home route and elsewhere (IA unchanged)", () => {
    for (const pathname of ["/fr", "/fr/pays"]) {
      mockPathname = pathname;
      render(<MobileNavBar language="fr" />);
      expect(
        screen.getByRole("button", { name: "Navigation FLG" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Rechercher" })
      ).toBeInTheDocument();
      cleanup();
    }
  });

  // @req REQ-044
  it("renders the brand wordmark from brand.ts on the home route and elsewhere", () => {
    for (const pathname of ["/fr", "/fr/pays"]) {
      mockPathname = pathname;
      render(<MobileNavBar language="fr" />);
      expect(screen.getByText(PRODUCT_NAME)).toBeInTheDocument();
      cleanup();
    }
  });

  // @req REQ-044
  it("is static — not position: fixed or sticky — on the home route or elsewhere", () => {
    for (const pathname of ["/fr", "/fr/pays"]) {
      mockPathname = pathname;
      render(<MobileNavBar language="fr" />);

      const nav = screen.getByLabelText("Navigation principale");
      expect(nav.className).not.toMatch(/(^|\s)fixed(\s|$)/);
      expect(nav.className).not.toMatch(/(^|\s)sticky(\s|$)/);
      cleanup();
    }
  });

  // @req REQ-044
  it("is light-skinned on the home route and elsewhere", () => {
    for (const pathname of ["/fr", "/fr/pays"]) {
      mockPathname = pathname;
      render(<MobileNavBar language="fr" />);

      const nav = screen.getByLabelText("Navigation principale");
      expect(nav).toHaveClass("bg-card");
      expect(nav).not.toHaveClass("afh-home-nav-skin");
      cleanup();
    }
  });

  // @req REQ-044
  it("gives the menu and search buttons a >= 44px hit area on the home route and elsewhere", () => {
    for (const pathname of ["/fr", "/fr/pays"]) {
      mockPathname = pathname;
      render(<MobileNavBar language="fr" />);

      expect(
        screen.getByRole("button", { name: "Navigation FLG" })
      ).toHaveClass("min-h-11");
      expect(screen.getByRole("button", { name: "Rechercher" })).toHaveClass(
        "min-h-11",
        "min-w-11"
      );
      cleanup();
    }
  });

  // Sticky secondary bars (context triad, filters) are the only elements
  // allowed to be sticky at 430px — the header must never collide with
  // them, which is only guaranteed if the header itself is never
  // sticky/fixed (see DesktopNavBar/MobileNavBar CSS above).
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
