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
import { ModuleAvailabilityProvider } from "@/components/hubs/ModuleAvailabilityProvider";
import { PRODUCT_NAME } from "@/lib/brand";
import { getTranslation } from "@/lib/translations";
import { getNavModules } from "@/lib/hubs/moduleRegistry";
import type { ModuleAvailabilityMap } from "@/lib/hubs/moduleOffer";
import { getModuleHref } from "@/lib/hubs/moduleHref";
import { getAxisHubRoute } from "@/lib/hubs/axisRoutes";
import { getFacetByPage } from "@/lib/hubs/facets";
import { getLocalizedRoute } from "@/lib/routing";

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

// Most cases render with no resolved availability, which is the state
// Storybook and any tree without the server layout are in: the header falls
// back to the declared half. The cases that care pass a map.
const renderHeader = (
  props: { onSearchClick?: () => void } = {},
  availability: ModuleAvailabilityMap | null = null
) =>
  render(
    <ThemeProvider attribute="class">
      <ModuleAvailabilityProvider value={availability}>
        <SiteHeader language="fr" {...props} />
      </ModuleAvailabilityProvider>
    </ThemeProvider>
  );

const trigger = (label: string) => screen.getByRole("button", { name: label });

const panel = () => screen.getByTestId("site-megapanel");

// The masthead carries its own stylesheet, so the positioning contracts below
// are read off that text rather than off computed styles: happy-dom resolves
// no cascade from an inline <style>, and it lays nothing out either.
const headerStyleSheet = () =>
  screen.getByTestId("site-header").querySelector("style")?.textContent ?? "";

// Every block written for the selector, not the first one: these rules are
// declared once and then adjusted per viewport, and a contract that read only
// the opening rule would pass on a stylesheet that undid it below.
const declarationsFor = (selector: string) =>
  [
    ...headerStyleSheet().matchAll(
      new RegExp(`(?:^|[,{}\\s])${selector}\\s*(?:,[^{]*)?\\{([^}]*)\\}`, "g")
    ),
  ]
    .map((block) => block[1])
    .join("\n");

beforeEach(() => {
  mockPathname = "/fr";
});

afterEach(cleanup);

describe("SiteHeader — the way back to the top", () => {
  // @req REQ-114
  it("is a focus destination without being a stop on the way through the bar", () => {
    // The back-to-top control scrolls the page and sends the focus here; a
    // masthead that took Tab as well would put a nameless stop in front of
    // the brand link on every page.
    renderHeader();

    expect(screen.getByTestId("site-header")).toHaveAttribute("tabindex", "-1");
  });

  // @req REQ-114
  it("carries no id, so a streamed route cannot render two of the same one", () => {
    renderHeader();

    expect(screen.getByTestId("site-header")).not.toHaveAttribute("id");
  });
});

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

    // The lockup gained its qualifier, so the link's accessible name is now
    // the name *and* what the site is. Matched on the opening rather than
    // exactly: the visible text is the accessible text, deliberately, and
    // pinning the whole string here would make the tagline unrewritable.
    expect(
      screen.getByRole("link", { name: new RegExp(`^${PRODUCT_NAME}`) })
    ).toHaveAttribute("href", "/fr");
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
  it("leads with the axis's own hub, and reaches every entry it holds", () => {
    renderHeader();

    fireEvent.click(trigger("Explorer"));

    expect(trigger("Explorer")).toHaveAttribute("aria-expanded", "true");
    expect(panel()).toHaveTextContent(t.hubs.explorer.menuBlurb);

    // The axis label is a disclosure button, so before this the page the axis
    // is named after was reachable from no navigation surface at all.
    expect(
      screen.getByRole("link", { name: t.hubs.explorer.hubEntryName })
    ).toHaveAttribute("href", getAxisHubRoute("fr", "explorer"));

    for (const navModule of getNavModules("explorer")) {
      const href = getModuleHref(navModule, "fr");
      const facet = navModule.page ? getFacetByPage(navModule.page) : null;

      // A facet is offered under its short name, because it names a state of
      // the hub rather than a destination competing with it.
      expect(
        screen.getByRole("link", { name: facet ? facet.label : navModule.name })
      ).toHaveAttribute("href", href);
    }
  });

  /**
   * The menu names destinations; it does not print their addresses. A URL is
   * the router's business, and the browser already shows where a link lands
   * when the reader hovers it. Printed under every entry, it put the project's
   * own path scheme on the page — technique rendered as editorial content.
   *
   * The link still carries the address in `href`, which is the one place a
   * reader, a crawler and a screen reader all agree to look for it.
   */
  // @req REQ-114
  it("names destinations without printing their addresses", () => {
    renderHeader();

    fireEvent.click(trigger("Explorer"));

    expect(panel()).not.toHaveTextContent(getAxisHubRoute("fr", "explorer"));
    expect(panel()).not.toHaveTextContent(getLocalizedRoute("fr", "search"));
    expect(panel()).not.toHaveTextContent(getLocalizedRoute("fr", "peoples"));
    expect(panel()).not.toHaveTextContent(getLocalizedRoute("fr", "countries"));
    expect(panel()).not.toHaveTextContent(getLocalizedRoute("fr", "families"));
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
    mockPathname = getLocalizedRoute("fr", "peoples");
    rerender(
      <ThemeProvider attribute="class">
        <SiteHeader language="fr" />
      </ThemeProvider>
    );

    expect(screen.queryByTestId("site-megapanel")).not.toBeInTheDocument();
  });

  // @req REQ-114
  it("marks the facet the reader is already reading", () => {
    mockPathname = getLocalizedRoute("fr", "peoples");
    renderHeader();

    fireEvent.click(trigger("Explorer"));

    expect(screen.getByRole("link", { name: "Peuples" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(screen.getByRole("link", { name: "Pays" })).not.toHaveAttribute(
      "aria-current"
    );
  });

  // @req REQ-114
  it("keeps the facets on a single scrolling row", () => {
    const { container } = renderHeader();

    fireEvent.click(trigger("Explorer"));

    // happy-dom lays nothing out, so the row's shape is asserted on the
    // declaration itself. The facets are states of one hub: stacked, they
    // read as three destinations competing with the hub they belong to.
    const sheet = container.querySelector("style")?.textContent ?? "";
    const facetRow = sheet.slice(sheet.indexOf(".sh-facets {"));

    expect(facetRow).toMatch(/flex-wrap:\s*nowrap/);
    expect(facetRow).toMatch(/overflow-x:\s*auto/);
    // The wider hub card is what keeps that scrollbar unused at the widths
    // the panel is actually painted on.
    expect(sheet).toMatch(
      /\.sh-grid \.sh-hub\[data-has-facets\] \{[^}]*grid-column:\s*span 2/
    );
    expect(screen.getByTestId("site-nav-hub-explorer")).toHaveAttribute(
      "data-has-facets"
    );
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

/**
 * "A page states one availability, not one per surface" (charter §3). The
 * header used to answer a narrower question than the home and the hub — it
 * asked only whether a route resolved — so `/fr/comprendre` marked _Premiers
 * repères de migrations_ **Bientôt** while the menu above it offered the same
 * module as a link. Three surfaces, three answers, one module.
 */
describe("SiteHeader — reachable and mature are two questions (atlas charter §3)", () => {
  const entryFor = (id: string) => screen.getByTestId(`site-nav-module-${id}`);

  const expectInert = (entry: HTMLElement) => {
    expect(entry).toHaveTextContent(t.hubs.unavailableLabel);
    expect(entry).toHaveAttribute("aria-disabled", "true");
    expect(entry).toHaveAttribute("tabindex", "-1");
    expect(entry.tagName).not.toBe("A");
  };

  // @req REQ-106
  it("withholds the invitation from every module declared in preparation", () => {
    renderHeader();

    const drafts = getNavModules("comprendre").filter(
      (navModule) => navModule.editorialReadiness === "draft"
    );
    expect(drafts.length).toBeGreaterThan(0);

    fireEvent.click(trigger("Comprendre"));
    for (const navModule of drafts) {
      expectInert(entryFor(navModule.id));
    }
  });

  /**
   * The half the header could not reach on its own — only the resolved map
   * knows whether a table answered. Exercised on `quiz`, the one module that
   * is both declared ready and backed by a table: every Comprendre module
   * that reads one is now `draft`, and a draft module would short-circuit
   * before the map was ever consulted, proving nothing about it.
   */
  // @req REQ-106
  it("withholds it from a ready module whose corpus came back empty", () => {
    renderHeader({}, { quiz: false });

    fireEvent.click(trigger("Jouer"));
    expectInert(entryFor("quiz"));
  });

  // @req REQ-106
  it("offers that same module once its corpus fills", () => {
    renderHeader({}, { quiz: true });

    fireEvent.click(trigger("Jouer"));
    const entry = entryFor("quiz");
    expect(entry.tagName).toBe("A");
    expect(entry).toHaveAttribute("href", getLocalizedRoute("fr", "quiz"));
    expect(entry).not.toHaveTextContent(t.hubs.unavailableLabel);
  });

  // The tray is the only navigation below 760px, so an invitation the panel
  // withholds and the tray extends is the same disagreement on a phone.
  // @req REQ-106
  it("withholds it in the tray as well as in the panel", () => {
    renderHeader({}, { noms: false });

    fireEvent.click(screen.getByTestId(BURGER));
    const tray = screen.getByRole("dialog");
    fireEvent.click(within(tray).getByRole("button", { name: /Comprendre/ }));

    expect(
      within(tray).queryByRole("link", { name: /Noms & appellations/ })
    ).not.toBeInTheDocument();
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

  // Pinned since the masthead was given back, and pinned two ways at once:
  // sticky keeps the bar's slot in the flow, so nothing below it has to be
  // padded by a height this file would then have to guarantee, and it makes
  // the masthead a positioned ancestor — which is the box the axis panel
  // hangs from. Fixed would cost both.
  //
  // This asserted the absence of the Tailwind `fixed` and `sticky` classes,
  // which the masthead never carried: the positioning is declared in its own
  // stylesheet. The bar turned sticky underneath a test that went on passing.
  // @req REQ-114
  it("pins the masthead with sticky rather than lifting it out of the flow", () => {
    for (const pathname of ["/fr", getLocalizedRoute("fr", "countries")]) {
      mockPathname = pathname;
      renderHeader();

      expect(declarationsFor("\\.sh-header")).toMatch(/position:\s*sticky/);
      expect(declarationsFor("\\.sh-header")).not.toMatch(/position:\s*fixed/);
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
  it("deploys the hub and its facets inside the tray", () => {
    renderHeader();

    fireEvent.click(screen.getByTestId(BURGER));
    const tray = screen.getByRole("dialog");
    fireEvent.click(within(tray).getByRole("button", { name: /Explorer/ }));

    // The tray is the only navigation below 760px, so a hub reachable in the
    // panel and not here would be unreachable on a phone.
    expect(
      within(tray).getByRole("link", { name: t.hubs.explorer.hubEntryName })
    ).toHaveAttribute("href", getAxisHubRoute("fr", "explorer"));

    expect(within(tray).getByRole("link", { name: "Peuples" })).toHaveAttribute(
      "href",
      getLocalizedRoute("fr", "peoples")
    );
  });
});

describe("SiteHeader — the panel opens over the page, not through it", () => {
  /**
   * The masthead is pinned, so once the reader is into the document its box
   * sits above the top of the screen. A panel opening *inside* that box grows
   * it by its own height — 224px of layout inserted above the viewport — and
   * scroll anchoring pushes the document down by exactly that much to keep
   * the reader's place. The adjustment dispatches a scroll event,
   * `nextRevealState` reads the 224px step as the reader moving down the
   * document, and the bar retracts — which closes the panel in the same frame
   * the click opened it. Measured on recette: 2400 -> 2624 on open, and no
   * menu below the bar. Above RETRACT_BELOW_PX the bar may not retract, which
   * is why the menu worked at the top of the page and nowhere else.
   *
   * Out of flow, the header's box never changes height, so anchoring has
   * nothing to correct. It is also what the charter's `navigation-menu`
   * primitive does (atlas charter §3): a menu overlays the page.
   */
  // @req REQ-114
  it("takes the panel out of the masthead's flow, so opening it cannot move the page", () => {
    renderHeader();
    fireEvent.click(trigger("Explorer"));

    expect(declarationsFor("\\.sh-panel")).toMatch(/position:\s*absolute/);
  });
});
