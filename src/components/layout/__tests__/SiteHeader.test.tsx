import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeProvider } from "next-themes";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { PRODUCT_NAME } from "@/lib/brand";
import { getTranslation } from "@/lib/translations";
import { getNavModules } from "@/lib/hubs/moduleRegistry";
import { getModuleHref } from "@/lib/hubs/moduleHref";

let mockPathname = "/fr";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

// jsdom evaluates the header's media queries against its own 1024px window,
// so these run on the wide branch: the three axis triggers are painted and
// the burger is not. The burger is therefore reached by test id — an
// element behind `display: none` computes an empty accessible name, so a
// role+name query cannot see it. Which branch a real width paints is
// settled against the mockup in the browser, not here.
const BURGER = "site-nav-burger";

const t = getTranslation("fr");

const renderHeader = (props: { onSearchClick?: () => void } = {}) =>
  render(
    <ThemeProvider attribute="class">
      <SiteHeader language="fr" {...props} />
    </ThemeProvider>
  );

const trigger = (label: string) => screen.getByRole("button", { name: label });

const panel = () => screen.getByTestId("site-megapanel");

beforeEach(() => {
  mockPathname = "/fr";
});

afterEach(cleanup);

describe("SiteHeader — three intentions, not ten modules (atlas charter §3)", () => {
  // @req REQ-114
  it("offers exactly the three access modes as entry points", () => {
    renderHeader();

    const entries = within(
      screen.getByRole("group", { name: "Points d'entrée" })
    ).getAllByRole("button");

    expect(entries.map((button) => button.textContent)).toEqual([
      "Explorer",
      "Comprendre",
      "Jouer",
    ]);
  });

  // The flat bar this replaces put nine destinations in the header. The
  // modules now live behind the click, so none of them may be in the bar.
  // @req REQ-114
  it("keeps every module out of the bar until an axis is opened", () => {
    renderHeader();

    expect(screen.queryByTestId("site-megapanel")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Les peuples d'Afrique" })
    ).not.toBeInTheDocument();
  });

  // @req REQ-114
  it("carries the brand back to the home", () => {
    renderHeader();

    expect(screen.getByRole("link", { name: PRODUCT_NAME })).toHaveAttribute(
      "href",
      "/fr"
    );
  });

  // The brandmark is the coloured continent, not a gradient disc: the mark
  // has to denote the subject, and a disc denotes nothing.
  // @req REQ-111
  it("draws the continent as its brandmark", () => {
    const { container } = renderHeader();

    const mark = container.querySelector(".sh-brand img");
    expect(mark).toBeInTheDocument();
    expect(mark?.getAttribute("src")).toContain("africa");
  });

  // The name sits beside the mark, so announcing the mark too would say the
  // product twice.
  // @req REQ-111
  it("leaves the brandmark out of the accessible name", () => {
    const { container } = renderHeader();

    expect(container.querySelector(".sh-brand img")).toHaveAttribute("alt", "");
  });
});

describe("SiteHeader — the panel behind the click (REQ-114)", () => {
  // @req REQ-114
  it("deploys an axis's modules with their real routes", () => {
    renderHeader();

    fireEvent.click(trigger("Explorer"));

    expect(trigger("Explorer")).toHaveAttribute("aria-expanded", "true");
    expect(panel()).toHaveTextContent(t.hubs.explorer.menuBlurb);

    for (const navModule of getNavModules("explorer")) {
      const href = getModuleHref(navModule, "fr");
      expect(
        screen.getByRole("link", { name: navModule.name })
      ).toHaveAttribute("href", href);
    }
  });

  // The route is shown, not just linked: the reader sees where the click
  // lands before spending it (charter §3).
  // @req REQ-114
  it("shows each module's route as text on its card", () => {
    renderHeader();

    fireEvent.click(trigger("Explorer"));

    expect(panel()).toHaveTextContent("/fr/peuples");
    expect(panel()).toHaveTextContent("/fr/pays");
  });

  // @req REQ-114
  it("closes when its own trigger is clicked again", () => {
    renderHeader();

    fireEvent.click(trigger("Explorer"));
    fireEvent.click(trigger("Explorer"));

    expect(trigger("Explorer")).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByTestId("site-megapanel")).not.toBeInTheDocument();
  });

  // @req REQ-114
  it("swaps to another axis without closing first", () => {
    renderHeader();

    fireEvent.click(trigger("Explorer"));
    fireEvent.click(trigger("Comprendre"));

    expect(trigger("Explorer")).toHaveAttribute("aria-expanded", "false");
    expect(trigger("Comprendre")).toHaveAttribute("aria-expanded", "true");
    expect(panel()).toHaveTextContent(t.hubs.comprendre.menuBlurb);
  });

  // The mockup has no router; in a SPA the panel would otherwise survive the
  // very click that navigated through it.
  // @req REQ-114
  it("closes when the reader lands on a new route", () => {
    const { rerender } = renderHeader();

    fireEvent.click(trigger("Explorer"));
    mockPathname = "/fr/peuples";
    rerender(
      <ThemeProvider attribute="class">
        <SiteHeader language="fr" />
      </ThemeProvider>
    );

    expect(screen.queryByTestId("site-megapanel")).not.toBeInTheDocument();
  });

  // @req REQ-114
  it("marks the module the reader is already reading", () => {
    mockPathname = "/fr/peuples";
    renderHeader();

    fireEvent.click(trigger("Explorer"));

    expect(
      screen.getByRole("link", { name: "Les peuples d'Afrique" })
    ).toHaveAttribute("aria-current", "page");
    expect(
      screen.getByRole("link", { name: "Les pays d'Afrique" })
    ).not.toHaveAttribute("aria-current");
  });
});

describe("SiteHeader — keyboard contract (atlas charter §3)", () => {
  // @req REQ-114
  it("closes on Escape and hands the focus back to the trigger", () => {
    renderHeader();

    fireEvent.click(trigger("Jouer"));
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByTestId("site-megapanel")).not.toBeInTheDocument();
    expect(trigger("Jouer")).toHaveFocus();
  });

  // @req REQ-114
  it("moves between axes with the arrow keys, wrapping at both ends", () => {
    renderHeader();

    trigger("Explorer").focus();
    fireEvent.keyDown(trigger("Explorer"), { key: "ArrowRight" });
    expect(trigger("Comprendre")).toHaveFocus();

    fireEvent.keyDown(trigger("Comprendre"), { key: "ArrowLeft" });
    expect(trigger("Explorer")).toHaveFocus();

    fireEvent.keyDown(trigger("Explorer"), { key: "ArrowLeft" });
    expect(trigger("Jouer")).toHaveFocus();
  });

  // An open panel follows the focus, so arrowing along the bar reads the
  // axes rather than making the reader re-open each one.
  // @req REQ-114
  it("carries an open panel along with the arrow keys", () => {
    renderHeader();

    fireEvent.click(trigger("Explorer"));
    fireEvent.keyDown(trigger("Explorer"), { key: "ArrowRight" });

    expect(trigger("Comprendre")).toHaveAttribute("aria-expanded", "true");
    expect(panel()).toHaveTextContent(t.hubs.comprendre.menuBlurb);
  });
});

describe("SiteHeader — what the corpus does not have (REQ-106)", () => {
  // @req REQ-106
  it("never offers a route that does not resolve", () => {
    renderHeader();

    for (const axis of ["Explorer", "Comprendre", "Jouer"]) {
      fireEvent.click(trigger(axis));
      for (const link of within(panel()).getAllByRole("link")) {
        expect(link.getAttribute("href")).toMatch(/^\/fr\//);
      }
    }
  });

  // @req REQ-106
  it("renders an unbuilt module as an unfocusable Bientôt entry", () => {
    renderHeader();
    fireEvent.click(trigger("Jouer"));

    const unbuilt = getNavModules("jouer").filter(
      (navModule) => getModuleHref(navModule, "fr") === null
    );

    for (const navModule of unbuilt) {
      const entry = screen.getByTestId(`site-nav-module-${navModule.id}`);
      expect(entry).toHaveTextContent(t.hubs.unavailableLabel);
      expect(entry).toHaveAttribute("aria-disabled", "true");
      expect(entry).toHaveAttribute("tabindex", "-1");
      expect(entry.tagName).not.toBe("A");
    }
  });
});

describe("SiteHeader — the controls that stay in the bar", () => {
  // @req REQ-114
  it("opens the search from the bar", () => {
    const onSearchClick = vi.fn();
    renderHeader({ onSearchClick });

    fireEvent.click(screen.getByRole("button", { name: "Rechercher" }));

    expect(onSearchClick).toHaveBeenCalledOnce();
  });

  // The surface switch is reachable from every route, which is the whole
  // point of it living in the bar rather than on one page.
  // @req REQ-115
  it("keeps the surface switch in the bar", () => {
    renderHeader();

    // Matched by test id rather than by role: the switch renders a
    // placeholder until next-themes has resolved the reader's surface, and
    // the contract asserted here is that the bar holds it either way.
    expect(screen.getByTestId(/^theme-toggle/)).toBeInTheDocument();
  });

  // Carried over from the bar this replaces: a route-local sticky secondary
  // bar would collide with a fixed header (R3/FR105).
  // @req REQ-114
  it("stays static rather than fixed or sticky on every route", () => {
    for (const pathname of ["/fr", "/fr/pays"]) {
      mockPathname = pathname;
      renderHeader();

      const header = screen.getByTestId("site-header");
      expect(header.className).not.toMatch(/(^|\s)fixed(\s|$)/);
      expect(header.className).not.toMatch(/(^|\s)sticky(\s|$)/);
      cleanup();
    }
  });

  // @req REQ-114
  it("gives every bar control a >= 44px hit area", () => {
    renderHeader();

    for (const label of ["Explorer", "Comprendre", "Jouer", "Rechercher"]) {
      expect(trigger(label)).toHaveClass("min-h-11");
    }
  });
});

describe("SiteHeader — the mobile tray (atlas charter §3)", () => {
  // @req REQ-114
  it("opens a tray holding the same three axes", () => {
    renderHeader();

    fireEvent.click(screen.getByTestId(BURGER));

    const tray = screen.getByRole("dialog");
    for (const axis of ["Explorer", "Comprendre", "Jouer"]) {
      expect(
        within(tray).getByRole("button", { name: new RegExp(axis) })
      ).toBeInTheDocument();
    }
  });

  // @req REQ-114
  it("deploys an axis's modules inside the tray", () => {
    renderHeader();

    fireEvent.click(screen.getByTestId(BURGER));
    const tray = screen.getByRole("dialog");
    fireEvent.click(within(tray).getByRole("button", { name: /Explorer/ }));

    expect(
      within(tray).getByRole("link", { name: "Les peuples d'Afrique" })
    ).toHaveAttribute("href", "/fr/peuples");
  });
});
