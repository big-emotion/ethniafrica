import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AxisHubSpread } from "@/components/hubs/AxisHubSpread";
import { HOME_HERO_IMAGES } from "@/lib/home/homeHeroVisuals";
import type { HubModule } from "@/lib/hubs/moduleAvailability";
import { glyphForModule } from "@/lib/hubs/moduleGlyphs";
import {
  ACCENT_BY_ACCESS_MODE,
  ACCESS_MODES,
  getNavModules,
  type AccessMode,
} from "@/lib/hubs/moduleRegistry";
import { TILES_EARNING_A_FLOOR, type HubSpread } from "@/lib/hubs/hubSpread";
import { hubsCopy } from "@/lib/i18n/copy/hubs";

const SPREAD_SOURCE = readFileSync(
  join(process.cwd(), "src/components/hubs/AxisHubSpread.tsx"),
  "utf8"
);

/** Comments carry the rationale, including retired units. Only rules count. */
const withoutComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, "");

const spread = (overrides: Partial<HubSpread> = {}): HubSpread => ({
  orientation: "text-first",
  plate: HOME_HERO_IMAGES[0],
  ...overrides,
});

/** Every module of the axis, offered, as the server resolves them. */
const offeredModules = (axis: AccessMode): HubModule[] =>
  getNavModules(axis).map((definition) => ({ ...definition, available: true }));

const renderHub = (axis: AccessMode, overrides: Partial<HubSpread> = {}) =>
  render(
    <AxisHubSpread
      axis={axis}
      language="fr"
      modules={offeredModules(axis)}
      spread={spread(overrides)}
    />
  );

describe("the axis hub spread — it says what the header says (brand charter §8.6)", () => {
  // @req REQ-114
  it("titles itself with the axis, in the dress §5.3 reserves for one", () => {
    for (const axis of ACCESS_MODES) {
      const { unmount } = renderHub(axis);

      const title = screen.getByRole("heading", { level: 1 });
      expect(title).toHaveTextContent(hubsCopy.fr[axis].title);
      expect(title).toHaveClass("page-title-gradient");

      unmount();
    }
  });

  /**
   * The reader who opens the panel and the reader who lands on the page are
   * owed the same account of what the axis holds, so the page takes the
   * header's own sentence rather than composing a second one.
   */
  // @req REQ-114
  it("describes the axis with the sentence the header shows", () => {
    for (const axis of ACCESS_MODES) {
      const { unmount } = renderHub(axis);
      expect(screen.getByText(hubsCopy.fr[axis].menuBlurb)).toBeInTheDocument();
      unmount();
    }
  });

  /**
   * The whole of the menu's set for the axis, in the menu's order, and nothing
   * the menu does not carry. A hub that lists more is a second navigation for
   * one axis; a hub that lists fewer sends the reader back to the bar.
   */
  // @req REQ-114
  it("draws the axis's nav modules and no others", () => {
    for (const axis of ACCESS_MODES) {
      const { unmount } = renderHub(axis);

      const drawn = screen
        .getAllByTestId(/^hub-tile-/)
        .map((tile) => tile.dataset.testid?.replace("hub-tile-", ""));

      expect(drawn).toEqual(getNavModules(axis).map(({ id }) => id));
      unmount();
    }
  });

  // @req REQ-114
  it("labels each tile as the menu labels it, and signs it the same way", () => {
    for (const axis of ACCESS_MODES) {
      const { unmount } = renderHub(axis);

      for (const definition of getNavModules(axis)) {
        const tile = screen.getByTestId(`hub-tile-${definition.id}`);
        expect(
          within(tile).getByText(
            hubsCopy.fr.moduleNames[definition.id] ?? definition.name
          )
        ).toBeInTheDocument();
        // The sign is the shared table's, so the menu and the hub cannot
        // dress one module two ways.
        expect(glyphForModule(definition.id)).toBeTruthy();
      }

      unmount();
    }
  });

  /**
   * The same inert row the menu draws: told, not offered, and out of the tab
   * order — an anchor with no href would still be a stop the keyboard reaches.
   */
  // @req REQ-114
  it("renders a module in preparation inert, and says so", () => {
    const [first, ...rest] = offeredModules("atlas");
    render(
      <AxisHubSpread
        axis="atlas"
        language="fr"
        modules={[{ ...first, available: false }, ...rest]}
        spread={spread()}
      />
    );

    const tile = screen.getByTestId(`hub-tile-${first.id}`);
    expect(tile.tagName).not.toBe("A");
    expect(tile).toHaveAttribute("aria-disabled", "true");
    expect(within(tile).getByText(hubsCopy.fr.unavailableLabel)).toBeVisible();
  });

  // @req REQ-114
  it("carries one accent, and it is the axis's", () => {
    for (const axis of ACCESS_MODES) {
      const { container, unmount } = renderHub(axis);

      const wrappers = container.querySelectorAll('[class*="afh-accent-"]');
      expect(wrappers).toHaveLength(1);
      expect(wrappers[0]).toHaveClass(ACCENT_BY_ACCESS_MODE[axis]);

      unmount();
    }
  });

  /**
   * The die takes the painting order, never the reading order. A tab sequence
   * that changes with a coin toss is a bug that reproduces half the time.
   */
  // @req REQ-114
  it("keeps the tiles before the plate in both draws", () => {
    for (const orientation of ["text-first", "plate-first"] as const) {
      const { container, unmount } = renderHub("atlas", { orientation });

      const text = container.querySelector('[data-testid="hub-spread-text"]');
      const plate = container.querySelector('[data-testid="hub-spread-plate"]');
      expect(text).not.toBeNull();
      expect(plate).not.toBeNull();
      expect(
        text!.compareDocumentPosition(plate!) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();

      expect(
        container
          .querySelector("[data-orientation]")
          ?.getAttribute("data-orientation")
      ).toBe(orientation);

      unmount();
    }
  });

  /**
   * §9: a licence is published, not named. Two of the pool's plates are public
   * domain and owe nothing; the one that is share-alike owes a URI the reader
   * can reach, not a pair of initials.
   */
  // @req REQ-114
  it("publishes the plate's licence where the record carries one", () => {
    const licensed = HOME_HERO_IMAGES.find((image) => image.licenceUri);
    expect(licensed, "the pool holds no licensed plate to check").toBeTruthy();

    renderHub("atlas", { plate: licensed! });

    const plate = screen.getByTestId("hub-spread-plate");
    expect(within(plate).getByRole("img")).toHaveAccessibleName(licensed!.alt);
    expect(
      within(plate).getByRole("link", { name: /licence/i })
    ).toHaveAttribute("href", licensed!.licenceUri);
  });

  /**
   * The §8.2 exception, held in the terms it was licensed in: the floor is a
   * desktop rule *and* a conditional one. Below 768px the two blocks stack and
   * take their content's height; above it, only an axis carrying enough tiles
   * to fill a screen asks for one.
   */
  // @req REQ-114
  it("measures itself against the viewport only above the stacking width", () => {
    const rules = withoutComments(SPREAD_SOURCE);

    const viewportUnits = [...rules.matchAll(/\d\s*(?:svh|lvh|dvh|vh)\b/g)];
    expect(viewportUnits.length).toBeGreaterThan(0);

    for (const match of viewportUnits) {
      const preceding = rules.slice(0, match.index);
      const query = preceding.lastIndexOf("@media");
      expect(
        query,
        "a viewport height outside any media query"
      ).toBeGreaterThan(-1);
      expect(preceding.slice(query)).toMatch(/min-width/);
      // And inside that query, gated on the axis having earned it — not on
      // the spread merely being a spread.
      expect(preceding.slice(query)).toMatch(/data-earns-floor="true"/);
    }
  });

  /**
   * The count is the condition, so the page states its own answer rather than
   * letting a stylesheet assume every axis is the same size. Measured on
   * 7 September 2026: atlas 6 tiles, dossiers 4, jeux 2 — and the Jouer hub is
   * precisely the surface a screen-tall band would empty out.
   */
  // @req REQ-114
  it("claims the floor only where the axis carries the tiles for it", () => {
    for (const axis of ACCESS_MODES) {
      const { unmount } = renderHub(axis);

      const earned = getNavModules(axis).length >= TILES_EARNING_A_FLOOR;
      expect(screen.getByTestId("hub-spread").dataset.earnsFloor, axis).toBe(
        String(earned)
      );

      unmount();
    }
  });

  /**
   * The page owns no band. `PageLayout` gives a band to a route that names
   * itself, and a hub names itself in its own first block — a plate above it
   * would print the axis twice, which is the shape ETNI-1555 deleted.
   */
  // @req REQ-114
  it("raises no hero band of its own", () => {
    const { container } = renderHub("atlas");
    expect(container.querySelector(".afh-hero")).toBeNull();
  });
});
