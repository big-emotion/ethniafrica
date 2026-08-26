import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ThemeProvider } from "next-themes";

import { DesktopNavBar } from "@/components/layout/DesktopNavBar";
import { PRODUCT_NAME } from "@/lib/brand";

let mockPathname = "/fr";
let mockQuizFeatureEnabled = false;

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} />,
}));

vi.mock("@/lib/featureFlags", () => ({
  isQuizFeatureEnabled: () => mockQuizFeatureEnabled,
}));

// @req [14.5]
// @req REQ-044
describe("DesktopNavBar — global shell (all routes, ETNI-820 retires the home night skin)", () => {
  // @req REQ-111 — the home carries this same bar; see the describe block
  // below for why its reduced brand+search variant was retired.
  it("keeps the same nav links and destinations on every route (IA unchanged)", () => {
    for (const pathname of ["/fr/pays", "/fr/peuples"]) {
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
      expect(
        screen.getByRole("link", { name: "Colonisation" })
      ).toHaveAttribute("href", "/fr/regards/colonisation-et-resistances");
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

// @req REQ-111
describe("DesktopNavBar — the bar the home shares with every route (REQ-111)", () => {
  // REQ-111 once reduced the home's bar to brand + search because the page
  // body listed every module. The body now offers three axes instead, so
  // the destinations that reduction hid are no longer one click away.
  // @req REQ-111
  it("keeps the full navigation on the home route too", () => {
    mockPathname = "/fr";
    render(<DesktopNavBar language="fr" />);

    expect(screen.getByText(PRODUCT_NAME)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Rechercher" })
    ).toBeInTheDocument();
    for (const name of [
      "Pays",
      "Peuples",
      "Familles",
      "Migrations",
      "Doctrine",
      "API",
    ]) {
      expect(screen.getByRole("link", { name })).toBeInTheDocument();
    }
  });

  // @req REQ-111
  it("calls onSearchClick when the nav's search control is activated", () => {
    mockPathname = "/fr";
    const onSearchClick = vi.fn();
    render(<DesktopNavBar language="fr" onSearchClick={onSearchClick} />);

    fireEvent.click(screen.getByRole("button", { name: "Rechercher" }));
    expect(onSearchClick).toHaveBeenCalledTimes(1);
  });

  // @req REQ-111
  it("keeps the full navigation present and unchanged on non-hub routes", () => {
    mockPathname = "/fr/pays";
    render(<DesktopNavBar language="fr" />);

    expect(screen.getByRole("link", { name: "Pays" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Peuples" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Familles" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Migrations" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Colonisation" })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "À propos" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Doctrine" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "API" })).toBeInTheDocument();
    // Search used to appear on the home only; it is now on every route,
    // beside the surface switch.
    expect(
      screen.getByRole("button", { name: "Rechercher" })
    ).toBeInTheDocument();
  });

  // @req REQ-111
  it("keeps the navigation landmark and home indicator on the reduced hub nav", () => {
    mockPathname = "/fr";
    render(<DesktopNavBar language="fr" />);

    expect(
      screen.getByRole("navigation", { name: "Navigation principale" })
    ).toBeInTheDocument();
    expect(screen.getByText("Accueil")).toBeInTheDocument();
  });
});

// @req REQ-103 FR66
describe("DesktopNavBar — quiz nav entry (Epic 10, Story 10.8, ETNI-497, AR39)", () => {
  it("does not render a quiz entry when the feature flag is off", () => {
    mockQuizFeatureEnabled = false;
    mockPathname = "/fr/pays";
    render(<DesktopNavBar language="fr" />);

    expect(screen.queryByRole("link", { name: "Quiz" })).toBeNull();
  });

  // @req REQ-103 FR66
  it("renders a quiz entry linking to /fr/quiz when the feature flag is on", () => {
    mockQuizFeatureEnabled = true;
    mockPathname = "/fr/pays";
    render(<DesktopNavBar language="fr" />);

    expect(screen.getByRole("link", { name: "Quiz" })).toHaveAttribute(
      "href",
      "/fr/quiz"
    );
  });

  // The home route narrows the nav to brand + search, so the switch has to
  // be asserted there too or it would silently drop off the one page the
  // reader is most likely to start from.
  // @req REQ-115
  it("carries the parchment/night switch on the home route and beyond", async () => {
    for (const pathname of ["/fr", "/fr/pays"]) {
      mockPathname = pathname;
      render(
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
        >
          <DesktopNavBar language="fr" />
        </ThemeProvider>
      );

      expect(await screen.findByTestId("theme-toggle")).toBeInTheDocument();
      cleanup();
    }
  });
});
