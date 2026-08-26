import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ThemeProvider } from "next-themes";

import { MobileNavBar } from "@/components/MobileNavBar";
import { PRODUCT_NAME } from "@/lib/brand";

let mockPathname = "/fr";
let mockQuizFeatureEnabled = false;
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} />,
}));

vi.mock("@/lib/featureFlags", () => ({
  isQuizFeatureEnabled: () => mockQuizFeatureEnabled,
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

  // @req REQ-091 FR90
  it("navigates to the colonization route from the FLG navigation dropdown", async () => {
    mockPush.mockClear();
    render(<MobileNavBar language="fr" />);
    const trigger = screen.getByRole("button", { name: "Navigation FLG" });
    fireEvent.pointerDown(trigger, { pointerId: 1, button: 0 });
    fireEvent.click(trigger);
    const colonizationItem = await screen.findByRole("menuitem", {
      name: "Colonisation",
    });
    fireEvent.click(colonizationItem);
    expect(mockPush).toHaveBeenCalledWith(
      "/fr/regards/colonisation-et-resistances"
    );
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

// @req REQ-111
describe("MobileNavBar — home hub route keeps every destination reachable (ETNI-1193, REQ-111)", () => {
  it("exposes every destination from the FLG dropdown on the home route at 430px", async () => {
    mockPathname = "/fr";
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 430,
    });

    render(<MobileNavBar language="fr" />);
    const trigger = screen.getByRole("button", { name: "Navigation FLG" });
    fireEvent.pointerDown(trigger, { pointerId: 1, button: 0 });
    fireEvent.click(trigger);

    expect(
      await screen.findByRole("menuitem", { name: "Pays" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "Peuples" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "Familles" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "Migrations" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "Colonisation" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "À propos" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "Doctrine" })
    ).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "API" })).toBeInTheDocument();
  });
});

// @req REQ-103 FR66
describe("MobileNavBar — quiz nav entry (Epic 10, Story 10.8, ETNI-497, AR39)", () => {
  it("does not offer a quiz item in the FLG dropdown when the feature flag is off", async () => {
    mockQuizFeatureEnabled = false;
    render(<MobileNavBar language="fr" />);
    const trigger = screen.getByRole("button", { name: "Navigation FLG" });
    fireEvent.pointerDown(trigger, { pointerId: 1, button: 0 });
    fireEvent.click(trigger);
    await screen.findByRole("menuitem", { name: "Migrations" });
    expect(screen.queryByRole("menuitem", { name: "Quiz" })).toBeNull();
  });

  // @req REQ-103 FR66
  it("offers a quiz item in the FLG dropdown that navigates to /fr/quiz when the flag is on", async () => {
    mockQuizFeatureEnabled = true;
    mockPush.mockClear();
    render(<MobileNavBar language="fr" />);
    const trigger = screen.getByRole("button", { name: "Navigation FLG" });
    fireEvent.pointerDown(trigger, { pointerId: 1, button: 0 });
    fireEvent.click(trigger);
    const quizItem = await screen.findByRole("menuitem", { name: "Quiz" });
    fireEvent.click(quizItem);
    expect(mockPush).toHaveBeenCalledWith("/fr/quiz");
  });

  // @req REQ-115
  it("carries the parchment/night switch beside the search icon", async () => {
    render(
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem={false}
      >
        <MobileNavBar language="fr" />
      </ThemeProvider>
    );

    const toggle = await screen.findByTestId("theme-toggle");
    expect(toggle).toHaveAccessibleName(/nuit/i);
  });
});
