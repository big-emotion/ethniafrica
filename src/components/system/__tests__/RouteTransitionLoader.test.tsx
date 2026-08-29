import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RouteTransitionLoader } from "@/components/system/RouteTransitionLoader";
import {
  MAX_VISIBLE_MS,
  MIN_VISIBLE_MS,
  isPageReplacingNavigation,
  remainingVisibleMs,
} from "@/components/system/routeTransitionTiming";
import { LOADER_REVEAL_DELAY_MS } from "@/components/system/AfricaTraceLoader";
import { getLocalizedRoute } from "@/lib/routing";

// Composed from the slug table rather than written out: a module that is
// re-slugged must break here rather than silently stop being tested.
const HOME = "/fr";
const EXPLORER_HUB = getLocalizedRoute("fr", "explorerHub");
const COUNTRIES = getLocalizedRoute("fr", "countries");

let currentPathname = HOME;

vi.mock("next/navigation", () => ({
  usePathname: () => currentPathname,
}));

const anchorTo = (href: string, attributes: Record<string, string> = {}) => {
  const anchor = document.createElement("a");
  anchor.setAttribute("href", href);
  for (const [name, value] of Object.entries(attributes)) {
    anchor.setAttribute(name, value);
  }
  anchor.textContent = "aller";
  document.body.appendChild(anchor);
  return anchor;
};

const clickWith = (
  anchor: HTMLAnchorElement,
  init: Partial<MouseEventInit> = {}
) => {
  act(() => {
    anchor.dispatchEvent(
      new MouseEvent("click", { bubbles: true, button: 0, ...init })
    );
  });
};

describe("remainingVisibleMs — what the interstitial owes the reader", () => {
  // @req REQ-104
  it("owes nothing when the page arrived before the fact was ever painted", () => {
    expect(remainingVisibleMs(0)).toBe(0);
    expect(remainingVisibleMs(LOADER_REVEAL_DELAY_MS - 1)).toBe(0);
  });

  // @req REQ-104
  it("holds a fact that has just appeared for long enough to be read", () => {
    expect(remainingVisibleMs(LOADER_REVEAL_DELAY_MS)).toBe(MIN_VISIBLE_MS);
  });

  // @req REQ-104
  it("owes nothing once the fact has been on screen past the floor", () => {
    expect(
      remainingVisibleMs(LOADER_REVEAL_DELAY_MS + MIN_VISIBLE_MS + 500)
    ).toBe(0);
  });
});

describe("isPageReplacingNavigation — which clicks are about to replace the page", () => {
  const here = `https://africatlas.test${EXPLORER_HUB}`;
  const intent = (
    anchor: HTMLAnchorElement | null,
    overrides: Partial<Parameters<typeof isPageReplacingNavigation>[0]> = {}
  ) =>
    isPageReplacingNavigation({
      anchor,
      currentUrl: here,
      button: 0,
      hasModifier: false,
      defaultPrevented: false,
      ...overrides,
    });

  // @req REQ-104
  it("counts a plain click on an internal link", () => {
    expect(intent(anchorTo(COUNTRIES))).toBe(true);
  });

  // @req REQ-104
  it("ignores a click that opens somewhere other than this page", () => {
    expect(intent(anchorTo("https://example.org/ailleurs"))).toBe(false);
    expect(intent(anchorTo(COUNTRIES, { target: "_blank" }))).toBe(false);
    expect(intent(anchorTo("/fichier.csv", { download: "" }))).toBe(false);
  });

  // @req REQ-104
  it("ignores a click that leaves the reader on the page they are reading", () => {
    // An in-page anchor scrolls; a query change filters a list underneath.
    // Covering the screen for either hides the thing being looked at.
    expect(intent(anchorTo("#sources"))).toBe(false);
    expect(intent(anchorTo(`${EXPLORER_HUB}?lettre=B`))).toBe(false);
    expect(intent(anchorTo(EXPLORER_HUB))).toBe(false);
  });

  // @req REQ-104
  it("ignores a click something else has already handled", () => {
    const anchor = anchorTo(COUNTRIES);

    expect(intent(anchor, { defaultPrevented: true })).toBe(false);
    expect(intent(anchor, { hasModifier: true })).toBe(false);
    expect(intent(anchor, { button: 1 })).toBe(false);
    expect(intent(null)).toBe(false);
  });
});

describe("RouteTransitionLoader (REQ-104 — the wait a server boundary never sees)", () => {
  beforeEach(() => {
    currentPathname = HOME;
    window.history.replaceState({}, "", HOME);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  // @req REQ-113
  it("spends the wait on a fact once a link has been clicked", () => {
    render(<RouteTransitionLoader />);
    expect(
      screen.queryByTestId("route-transition-loader")
    ).not.toBeInTheDocument();

    clickWith(anchorTo(COUNTRIES));

    expect(screen.getByTestId("route-transition-loader")).toBeInTheDocument();
    expect(screen.getByText("Saviez-vous que")).toBeInTheDocument();
  });

  // @req REQ-104
  it("inks the coastline inside an accent scope, never on the bare page", () => {
    // Outside a .afh-accent-* wrapper, --accent resolves to shadcn's bare HSL
    // triplet and `fill: var(--accent)` yields an invalid colour: a black
    // continent on the parchment. Nothing about the markup shows it.
    render(<RouteTransitionLoader />);
    clickWith(anchorTo(COUNTRIES));

    const overlay = screen.getByTestId("route-transition-loader");
    expect(overlay.className).toMatch(/afh-accent-/);
    expect(overlay.querySelector("svg.afh-atl-figure")).not.toBeNull();
  });

  // @req REQ-104
  it("leaves the site header uncovered, so orientation survives the wait", () => {
    // The server's loading screens keep the header by re-rendering PageLayout
    // (REQ-098). An overlay pinned to the top would take that away on exactly
    // the routes it exists to cover.
    const header = document.createElement("div");
    header.setAttribute("data-testid", "site-header");
    Object.defineProperty(header, "getBoundingClientRect", {
      value: () => ({ bottom: 72 }) as DOMRect,
    });
    document.body.appendChild(header);

    render(<RouteTransitionLoader />);
    clickWith(anchorTo(COUNTRIES));

    expect(screen.getByTestId("route-transition-loader")).toHaveStyle({
      top: "72px",
    });
  });

  // @req REQ-104
  it("stays out of the way of a click that is not replacing the page", () => {
    render(<RouteTransitionLoader />);

    clickWith(anchorTo("#sources"));

    expect(
      screen.queryByTestId("route-transition-loader")
    ).not.toBeInTheDocument();
  });

  // @req REQ-104
  it("lets go once the requested page has arrived", () => {
    const view = render(<RouteTransitionLoader />);

    clickWith(anchorTo(COUNTRIES));
    expect(screen.getByTestId("route-transition-loader")).toBeInTheDocument();

    // The navigation lands well past the floor, so nothing more is owed.
    act(() => {
      vi.advanceTimersByTime(LOADER_REVEAL_DELAY_MS + MIN_VISIBLE_MS + 100);
    });
    currentPathname = COUNTRIES;
    view.rerender(<RouteTransitionLoader />);
    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(
      screen.queryByTestId("route-transition-loader")
    ).not.toBeInTheDocument();
  });

  // @req REQ-104
  it("holds a fact that has only just appeared rather than snatching it away", () => {
    const view = render(<RouteTransitionLoader />);

    clickWith(anchorTo(COUNTRIES));
    act(() => {
      vi.advanceTimersByTime(LOADER_REVEAL_DELAY_MS + 50);
    });
    currentPathname = COUNTRIES;
    view.rerender(<RouteTransitionLoader />);

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.getByTestId("route-transition-loader")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(MIN_VISIBLE_MS);
    });
    expect(
      screen.queryByTestId("route-transition-loader")
    ).not.toBeInTheDocument();
  });

  // @req REQ-104
  it("never traps the reader behind a navigation that does not land", () => {
    render(<RouteTransitionLoader />);

    clickWith(anchorTo(COUNTRIES));
    expect(screen.getByTestId("route-transition-loader")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(MAX_VISIBLE_MS + 1);
    });

    expect(
      screen.queryByTestId("route-transition-loader")
    ).not.toBeInTheDocument();
  });
});
