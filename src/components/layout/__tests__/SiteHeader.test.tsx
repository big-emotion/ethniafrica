import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeProvider } from "next-themes";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { HEADER_RETRACTED_ATTRIBUTE } from "@/hooks/use-header-reveal";
import { ModuleAvailabilityProvider } from "@/components/hubs/ModuleAvailabilityProvider";
import { PRODUCT_NAME } from "@/lib/brand";
import { getTranslation } from "@/lib/translations";
import {
  ACCESS_MODE_LABELS,
  ACCESS_MODES,
  getNavModules,
} from "@/lib/hubs/moduleRegistry";
import type { ModuleAvailabilityMap } from "@/lib/hubs/moduleOffer";
import { getModuleHref } from "@/lib/hubs/moduleHref";
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
      ACCESS_MODE_LABELS.explorer,
      ACCESS_MODE_LABELS.comprendre,
      ACCESS_MODE_LABELS.jouer,
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

  // At phone widths the three fixed-size controls need the brand lockup to
  // yield space. A non-shrinking lockup widened the whole document to 394px
  // in a 375px viewport as soon as this header reached the developer portal.
  // @req REQ-111
  it("lets the mobile brand lockup shrink before the controls overflow", () => {
    renderHeader();

    expect(declarationsFor("\\.sh-brand")).toMatch(/flex:\s*0 1 auto/);
    expect(declarationsFor("\\.sh-brand")).not.toMatch(/flex:\s*none/);
    expect(declarationsFor("\\.sh-controls")).toMatch(/flex:\s*none/);
  });
});

describe("SiteHeader — the panel behind the click (REQ-114)", () => {
  // @req REQ-114
  it("keeps the access mode non-navigating and exposes every module as a direct entry", () => {
    renderHeader();

    fireEvent.click(trigger(ACCESS_MODE_LABELS.explorer));

    expect(trigger(ACCESS_MODE_LABELS.explorer)).toHaveAttribute(
      "aria-expanded",
      "true"
    );
    expect(panel()).toHaveTextContent(t.hubs.explorer.menuBlurb);
    expect(trigger(ACCESS_MODE_LABELS.explorer).tagName).toBe("BUTTON");
    expect(trigger(ACCESS_MODE_LABELS.explorer)).not.toHaveAttribute("href");
    expect(
      within(panel()).getByRole("heading", {
        name: ACCESS_MODE_LABELS.explorer,
      })
    ).not.toHaveAttribute("href");
    expect(
      within(panel()).queryByTestId("site-nav-hub-explorer")
    ).not.toBeInTheDocument();

    // Directory facets are modules in navigation: each one keeps its own
    // destination, full name and availability contract under the access mode.
    for (const navModule of getNavModules("explorer")) {
      const href = getModuleHref(navModule, "fr");
      const entry = within(panel()).getByTestId(
        `site-nav-module-${navModule.id}`
      );

      expect(entry).toHaveAccessibleName(navModule.name);
      expect(entry).toHaveAttribute("href", href);
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

    fireEvent.click(trigger(ACCESS_MODE_LABELS.explorer));

    expect(panel()).not.toHaveTextContent(getLocalizedRoute("fr", "search"));
    expect(panel()).not.toHaveTextContent(getLocalizedRoute("fr", "peoples"));
    expect(panel()).not.toHaveTextContent(getLocalizedRoute("fr", "countries"));
    expect(panel()).not.toHaveTextContent(getLocalizedRoute("fr", "families"));
  });

  // @req REQ-114
  it("closes when its own trigger is clicked again", () => {
    renderHeader();

    fireEvent.click(trigger(ACCESS_MODE_LABELS.explorer));
    fireEvent.click(trigger(ACCESS_MODE_LABELS.explorer));

    expect(trigger(ACCESS_MODE_LABELS.explorer)).toHaveAttribute(
      "aria-expanded",
      "false"
    );
    expect(screen.queryByTestId("site-megapanel")).not.toBeInTheDocument();
  });

  // @req REQ-114
  it("swaps to another axis without closing first", () => {
    renderHeader();

    fireEvent.click(trigger(ACCESS_MODE_LABELS.explorer));
    fireEvent.click(trigger(ACCESS_MODE_LABELS.comprendre));

    expect(trigger(ACCESS_MODE_LABELS.explorer)).toHaveAttribute(
      "aria-expanded",
      "false"
    );
    expect(trigger(ACCESS_MODE_LABELS.comprendre)).toHaveAttribute(
      "aria-expanded",
      "true"
    );
    expect(panel()).toHaveTextContent(t.hubs.comprendre.menuBlurb);
  });

  // The mockup has no router; in a SPA the panel would otherwise survive the
  // very click that navigated through it.
  // @req REQ-114
  it("closes when the reader lands on a new route", () => {
    const { rerender } = renderHeader();

    fireEvent.click(trigger(ACCESS_MODE_LABELS.explorer));
    mockPathname = getLocalizedRoute("fr", "peoples");
    rerender(
      <ThemeProvider attribute="class">
        <SiteHeader language="fr" />
      </ThemeProvider>
    );

    expect(screen.queryByTestId("site-megapanel")).not.toBeInTheDocument();
  });

  // @req REQ-114
  it("marks the direct module the reader is already reading", () => {
    mockPathname = getLocalizedRoute("fr", "peoples");
    renderHeader();

    fireEvent.click(trigger(ACCESS_MODE_LABELS.explorer));

    expect(screen.getByTestId("site-nav-module-peuples")).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(screen.getByTestId("site-nav-module-pays")).not.toHaveAttribute(
      "aria-current"
    );
  });

  // @req REQ-114
  it("renders Explorer directory modules in registry order without a facet sub-navigation", () => {
    renderHeader();

    fireEvent.click(trigger(ACCESS_MODE_LABELS.explorer));

    expect(
      within(panel())
        .getAllByTestId(/^site-nav-module-/)
        .map((entry) => entry.dataset.testid)
    ).toEqual(
      getNavModules("explorer").map(
        (navModule) => `site-nav-module-${navModule.id}`
      )
    );
    expect(
      within(panel()).queryByTestId(/^site-nav-facet-/)
    ).not.toBeInTheDocument();
  });
});

describe("SiteHeader — the About destination (REQ-132)", () => {
  // @req REQ-132
  it("keeps About and the editorial doctrine as distinct Comprendre destinations", () => {
    renderHeader();

    fireEvent.click(trigger(ACCESS_MODE_LABELS.comprendre));

    expect(
      within(panel()).getByRole("link", { name: "À propos du projet" })
    ).toHaveAttribute("href", "/fr/about");
    expect(
      within(panel()).getByRole("link", { name: "La doctrine éditoriale" })
    ).toHaveAttribute("href", getLocalizedRoute("fr", "doctrine"));
  });

  // @req REQ-132
  it("gives About its dedicated information glyph", () => {
    renderHeader();

    fireEvent.click(trigger(ACCESS_MODE_LABELS.comprendre));

    const glyph = screen
      .getByTestId("site-nav-module-about")
      .querySelector(".sh-glyph svg");

    expect(glyph).toBeInTheDocument();
    expect(glyph).toHaveClass("lucide-info");
    expect(glyph).not.toHaveClass("lucide-circle");
  });

  // @req REQ-132
  it("offers the same distinct About and doctrine links in the mobile tray", () => {
    renderHeader();

    fireEvent.click(screen.getByTestId(BURGER));
    const tray = screen.getByRole("dialog");
    fireEvent.click(
      within(tray).getByRole("button", {
        name: new RegExp(ACCESS_MODE_LABELS.comprendre),
      })
    );

    expect(
      within(tray).getByRole("link", { name: "À propos du projet" })
    ).toHaveAttribute("href", "/fr/about");
    expect(
      within(tray).getByRole("link", { name: "La doctrine éditoriale" })
    ).toHaveAttribute("href", getLocalizedRoute("fr", "doctrine"));
  });
});

describe("SiteHeader — keyboard contract (atlas charter §3)", () => {
  // @req REQ-114
  it("closes on Escape and hands the focus back to the trigger", () => {
    renderHeader();

    fireEvent.click(trigger(ACCESS_MODE_LABELS.jouer));
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByTestId("site-megapanel")).not.toBeInTheDocument();
    expect(trigger(ACCESS_MODE_LABELS.jouer)).toHaveFocus();
  });

  // @req REQ-114
  it("moves between axes with the arrow keys, wrapping at both ends", () => {
    renderHeader();

    trigger(ACCESS_MODE_LABELS.explorer).focus();
    fireEvent.keyDown(trigger(ACCESS_MODE_LABELS.explorer), {
      key: "ArrowRight",
    });
    expect(trigger(ACCESS_MODE_LABELS.comprendre)).toHaveFocus();

    fireEvent.keyDown(trigger(ACCESS_MODE_LABELS.comprendre), {
      key: "ArrowLeft",
    });
    expect(trigger(ACCESS_MODE_LABELS.explorer)).toHaveFocus();

    fireEvent.keyDown(trigger(ACCESS_MODE_LABELS.explorer), {
      key: "ArrowLeft",
    });
    expect(trigger(ACCESS_MODE_LABELS.jouer)).toHaveFocus();
  });

  // An open panel follows the focus, so arrowing along the bar reads the
  // axes rather than making the reader re-open each one.
  // @req REQ-114
  it("carries an open panel along with the arrow keys", () => {
    renderHeader();

    fireEvent.click(trigger(ACCESS_MODE_LABELS.explorer));
    fireEvent.keyDown(trigger(ACCESS_MODE_LABELS.explorer), {
      key: "ArrowRight",
    });

    expect(trigger(ACCESS_MODE_LABELS.comprendre)).toHaveAttribute(
      "aria-expanded",
      "true"
    );
    expect(panel()).toHaveTextContent(t.hubs.comprendre.menuBlurb);
  });
});

describe("SiteHeader — what the corpus does not have (REQ-106)", () => {
  // @req REQ-106
  it("never offers a route that does not resolve", () => {
    renderHeader();

    for (const axis of Object.values(ACCESS_MODE_LABELS)) {
      fireEvent.click(trigger(axis));
      for (const link of within(panel()).getAllByRole("link")) {
        expect(link.getAttribute("href")).toMatch(/^\/fr\//);
      }
    }
  });

  // @req REQ-106
  it("renders an unbuilt module as an unfocusable Bientôt entry", () => {
    renderHeader();
    fireEvent.click(trigger(ACCESS_MODE_LABELS.jouer));

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

    fireEvent.click(trigger(ACCESS_MODE_LABELS.comprendre));
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

    fireEvent.click(trigger(ACCESS_MODE_LABELS.jouer));
    expectInert(entryFor("quiz"));
  });

  // @req REQ-106
  it("offers that same module once its corpus fills", () => {
    renderHeader({}, { quiz: true });

    fireEvent.click(trigger(ACCESS_MODE_LABELS.jouer));
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
    fireEvent.click(
      within(tray).getByRole("button", {
        name: new RegExp(ACCESS_MODE_LABELS.comprendre),
      })
    );

    expect(
      within(tray).queryByRole("link", { name: /Appellations/ })
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

    for (const label of [...Object.values(ACCESS_MODE_LABELS), "Rechercher"]) {
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
    for (const axis of Object.values(ACCESS_MODE_LABELS)) {
      expect(
        within(tray).getByRole("button", { name: new RegExp(axis) })
      ).toBeInTheDocument();
    }
  });

  // @req REQ-114
  it("deploys direct module entries without a hub landing link", () => {
    renderHeader();

    fireEvent.click(screen.getByTestId(BURGER));
    const tray = screen.getByRole("dialog");
    fireEvent.click(
      within(tray).getByRole("button", {
        name: new RegExp(ACCESS_MODE_LABELS.explorer),
      })
    );

    expect(
      within(tray).queryByTestId("site-nav-hub-explorer")
    ).not.toBeInTheDocument();
    expect(
      within(tray).getByRole("heading", {
        name: ACCESS_MODE_LABELS.explorer,
      })
    ).not.toHaveAttribute("href");
    for (const navModule of getNavModules("explorer")) {
      expect(
        within(tray).getByTestId(`site-nav-module-${navModule.id}`)
      ).toHaveAttribute("href", getModuleHref(navModule, "fr"));
    }
  });

  // @req REQ-114
  it("keeps panel and tray destination contracts aligned for every access mode", () => {
    renderHeader();

    const contractsFor = (scope: HTMLElement) =>
      within(scope)
        .getAllByTestId(/^site-nav-module-/)
        .map((entry) => ({
          testId: entry.dataset.testid,
          href: entry.getAttribute("href"),
          disabled: entry.getAttribute("aria-disabled"),
        }));

    const panelContracts = new Map<string, ReturnType<typeof contractsFor>>();
    for (const axis of ACCESS_MODES) {
      fireEvent.click(trigger(ACCESS_MODE_LABELS[axis]));
      expect(
        within(panel()).getByRole("heading", {
          name: ACCESS_MODE_LABELS[axis],
        })
      ).not.toHaveAttribute("href");
      const contracts = contractsFor(panel());
      expect(contracts.map(({ testId }) => testId)).toEqual(
        getNavModules(axis).map(
          (navModule) => `site-nav-module-${navModule.id}`
        )
      );
      panelContracts.set(axis, contracts);
    }
    fireEvent.click(trigger(ACCESS_MODE_LABELS.jouer));

    fireEvent.click(screen.getByTestId(BURGER));
    const tray = screen.getByRole("dialog");
    for (const axis of ACCESS_MODES) {
      expect(
        within(tray).getByRole("heading", {
          name: ACCESS_MODE_LABELS[axis],
        })
      ).not.toHaveAttribute("href");
      fireEvent.click(
        within(tray).getByRole("button", {
          name: new RegExp(ACCESS_MODE_LABELS[axis]),
        })
      );
      expect(contractsFor(tray)).toEqual(panelContracts.get(axis));
    }
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
    fireEvent.click(trigger(ACCESS_MODE_LABELS.explorer));

    expect(declarationsFor("\\.sh-panel")).toMatch(/position:\s*absolute/);
  });
});

/**
 * Taking the panel out of the flow removed the one emitter that had been
 * measured — the anchoring correction the panel's own 224px provoked. It left
 * the coupling that made that emitter fatal: the retraction is derived from
 * the scroll position, `SiteHeader` closes the panel whenever the bar
 * retracts, and the scroll position moves for plenty of reasons the reader
 * had no hand in — a font or an image landing, a lazy section settling, a
 * smooth scroll still running out its easing, the browser restoring a
 * position on a back-navigation. Any one of them crosses RETRACT_BELOW_PX and
 * takes the menu down with it, and the reader sees a click that did nothing.
 *
 * So the bar holds its place while a menu is open. The reader opened it
 * deliberately; the ways out are the ones they can aim at — the trigger
 * again, Escape, or a destination in the panel.
 */
describe("SiteHeader — a scroll the reader did not make cannot close the menu", () => {
  const scrollPageTo = (y: number) => {
    Object.defineProperty(window, "scrollY", {
      value: y,
      configurable: true,
      writable: true,
    });
    fireEvent.scroll(window);
  };

  /**
   * The hook takes its decision once per frame, so the assertion has to stand
   * on the far side of one. `waitFor` cannot do this job: it succeeds on its
   * first poll, which lands *before* the frame runs, and every "the menu is
   * still open" assertion then passes whatever the code does. The retraction
   * case below is what proves this flush is real.
   */
  const settleOneFrame = () =>
    act(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        })
    );

  beforeEach(() => scrollPageTo(0));

  // @req REQ-114
  it("holds the masthead open while the axis panel is open", async () => {
    renderHeader();
    fireEvent.click(trigger(ACCESS_MODE_LABELS.explorer));
    expect(panel()).toBeInTheDocument();

    // Well past RETRACT_BELOW_PX and travelling down: everything the bar
    // needs to retract, and none of it asked for by the reader.
    scrollPageTo(400);
    await settleOneFrame();

    expect(
      document.documentElement.getAttribute(HEADER_RETRACTED_ATTRIBUTE)
    ).toBe("false");
    expect(panel()).toBeInTheDocument();
  });

  // @req REQ-114
  it("lets the masthead retract again once the reader has closed the menu", async () => {
    renderHeader();
    fireEvent.click(trigger(ACCESS_MODE_LABELS.explorer));
    scrollPageTo(400);
    await settleOneFrame();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByTestId("site-megapanel")).not.toBeInTheDocument();

    scrollPageTo(800);
    await settleOneFrame();

    expect(
      document.documentElement.getAttribute(HEADER_RETRACTED_ATTRIBUTE)
    ).toBe("true");
  });
});
