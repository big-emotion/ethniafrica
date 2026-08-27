import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AccessModeHub } from "@/components/hubs/AccessModeHub";
import { getLocalizedRoute } from "@/lib/routing";
import { getTranslation } from "@/lib/translations";
import type { HubModule } from "@/lib/hubs/moduleAvailability";

// Mirrors the registry: explorer is the four nominal entry points, and a
// data module goes dark when its table is empty.
const explorerModules: HubModule[] = [
  {
    id: "peuples",
    name: "Les peuples d'Afrique",
    accessMode: "explorer",
    page: "peoples",
    availability: "data",
    dataSource: "afrik_peoples",
    available: true,
  },
  {
    id: "pays",
    name: "Les pays d'Afrique",
    accessMode: "explorer",
    page: "countries",
    availability: "data",
    dataSource: "afrik_countries",
    available: true,
  },
  {
    id: "recherche",
    name: "Recherche libre",
    accessMode: "explorer",
    page: "search",
    availability: "static",
    available: true,
  },
  {
    id: "familles",
    name: "L'arbre des familles",
    accessMode: "explorer",
    page: "families",
    availability: "data",
    dataSource: "afrik_language_families",
    available: false,
  },
];

const jouerModules: HubModule[] = [
  {
    id: "quiz",
    name: "Le quiz",
    accessMode: "jouer",
    page: "quiz",
    availability: "flagged",
    featureFlag: "quiz",
    group: "jeux-quiz",
    available: true,
  },
  {
    id: "comparer",
    name: "Vraie taille",
    accessMode: "jouer",
    page: null,
    gameSlug: "vraie-taille",
    availability: "data",
    dataSource: "afrik_countries",
    group: "jeux-pays",
    available: true,
  },
  {
    id: "liens",
    name: "Les liens invisibles",
    accessMode: "jouer",
    page: null,
    gameSlug: "liens",
    availability: "data",
    dataSource: "afrik_people_relations",
    group: "jeux-liens",
    available: false,
  },
];

describe("AccessModeHub — hub component (REQ-114/REQ-106)", () => {
  // @req REQ-114
  it("renders the hub title for the access mode", () => {
    render(
      <AccessModeHub language="fr" mode="explorer" modules={explorerModules} />
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Explorer" })
    ).toBeInTheDocument();
  });

  // The blurb is what tells a reader why they would pick this axis over
  // the other two. What it *says* is asserted in hubTranslations.test.ts;
  // here we only prove the hub renders it, so re-wording the copy cannot
  // break the component's own suite.
  // @req REQ-114
  it("states what the axis is for alongside its title", () => {
    render(
      <AccessModeHub language="fr" mode="explorer" modules={explorerModules} />
    );

    expect(
      screen.getByTestId("access-mode-hub-explorer-blurb")
    ).toHaveTextContent(getTranslation("fr").hubs.explorer.blurb);
  });

  // @req REQ-114 @req REQ-106
  it("renders a live module as a link to its route", () => {
    render(
      <AccessModeHub language="fr" mode="explorer" modules={explorerModules} />
    );

    const link = screen.getByTestId("hub-module-link-peuples");
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", getLocalizedRoute("fr", "peoples"));
  });

  // @req REQ-114 @req REQ-106
  it("renders a static module as a link without waiting on any data", () => {
    render(
      <AccessModeHub language="fr" mode="explorer" modules={explorerModules} />
    );

    const link = screen.getByTestId("hub-module-link-recherche");
    expect(link).toHaveAttribute("href", getLocalizedRoute("fr", "search"));
  });

  // @req REQ-114 @req REQ-106
  it("renders an unavailable data module with no anchor element", () => {
    render(
      <AccessModeHub language="fr" mode="explorer" modules={explorerModules} />
    );

    expect(
      screen.getByTestId("hub-module-unavailable-familles")
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("hub-module-link-familles")
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId("hub-module-unavailable-familles").querySelector("a")
    ).toBeNull();
  });

  // A game has no PageType of its own: it is reached by slug under the
  // Jouer hub, and the slug has to win over whatever page the module carries.
  // @req REQ-120
  it("links a game to its slug under the jouer hub", () => {
    render(<AccessModeHub language="fr" mode="jouer" modules={jouerModules} />);

    const link = screen.getByTestId("hub-module-link-comparer");
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "/fr/jouer/vraie-taille");
    expect(link).toHaveTextContent("Vraie taille");
  });

  // The quiz keeps a real PageType, so it must still route through it.
  // @req REQ-120
  it("links the quiz to its own route rather than to a game slug", () => {
    render(<AccessModeHub language="fr" mode="jouer" modules={jouerModules} />);

    expect(screen.getByTestId("hub-module-link-quiz")).toHaveAttribute(
      "href",
      getLocalizedRoute("fr", "quiz")
    );
  });

  // @req REQ-120
  it("renders a game whose data source is empty with no anchor element", () => {
    render(<AccessModeHub language="fr" mode="jouer" modules={jouerModules} />);

    expect(
      screen.getByTestId("hub-module-unavailable-liens")
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("hub-module-link-liens")
    ).not.toBeInTheDocument();
  });

  // @req REQ-106
  it("labels every unavailable module Bientôt", () => {
    render(
      <AccessModeHub language="fr" mode="explorer" modules={explorerModules} />
    );

    expect(
      screen.getByTestId("hub-module-unavailable-familles")
    ).toHaveTextContent("Bientôt");
  });

  // @req REQ-114
  it("scopes the hub to its own categorical accent", () => {
    const { rerender } = render(
      <AccessModeHub language="fr" mode="explorer" modules={explorerModules} />
    );
    expect(screen.getByTestId("access-mode-hub-explorer")).toHaveClass(
      "afh-accent-ocre"
    );

    rerender(
      <AccessModeHub language="fr" mode="jouer" modules={jouerModules} />
    );
    expect(screen.getByTestId("access-mode-hub-jouer")).toHaveClass(
      "afh-accent-perv"
    );
  });
});

// One list contract, three scenes: the axis-specific scene is the only
// thing that varies between the three hubs, so the module rows — and with
// them the REQ-106 unavailable contract — stay defined in exactly one place.
describe("AccessModeHub — axis scene (REQ-114)", () => {
  const scene = <div data-testid="test-scene">scène</div>;

  // @req REQ-114
  it("renders the four module rows identically with and without a scene", () => {
    const { unmount } = render(
      <AccessModeHub language="fr" mode="explorer" modules={explorerModules} />
    );
    const withoutScene = explorerModules.map(
      (m) => screen.getByTestId(`hub-module-${m.id}`).outerHTML
    );
    unmount();

    render(
      <AccessModeHub language="fr" mode="explorer" modules={explorerModules}>
        {scene}
      </AccessModeHub>
    );
    const withScene = explorerModules.map(
      (m) => screen.getByTestId(`hub-module-${m.id}`).outerHTML
    );

    expect(withScene).toEqual(withoutScene);
  });

  // The scene reads --accent off the accented section. Mounted outside it,
  // it would pick up the root default and paint the wrong axis colour.
  // @req REQ-114
  it("mounts the scene inside the accented section", () => {
    render(
      <AccessModeHub language="fr" mode="explorer" modules={explorerModules}>
        {scene}
      </AccessModeHub>
    );

    const section = screen.getByTestId("access-mode-hub-explorer");
    expect(within(section).getByTestId("test-scene")).toBeInTheDocument();
  });

  // Focus order is list-then-scene at every width, so the reader reaches
  // the four unconditional links before any optional scenery (WCAG 2.4.3).
  // The layout achieves the desktop two-column look with grid placement
  // alone — never `order:` — so DOM order and visual order agree.
  // @req REQ-114
  it("places the scene after the module list in the DOM", () => {
    render(
      <AccessModeHub language="fr" mode="explorer" modules={explorerModules}>
        {scene}
      </AccessModeHub>
    );

    const list = screen.getByRole("list");
    const rendered = screen.getByTestId("test-scene");

    expect(
      list.compareDocumentPosition(rendered) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  // @req REQ-114
  it("renders no scene container for an axis that passes none", () => {
    render(<AccessModeHub language="fr" mode="comprendre" modules={[]} />);

    expect(
      screen.queryByTestId("access-mode-hub-comprendre-scene")
    ).not.toBeInTheDocument();
  });

  // --accent-tint is the accent over parchment, and no night scope rebinds
  // it. Filling the row with it made every live module on the three hubs a
  // #f1d9ae card under night's cream ink — measured at 1.12:1 on
  // /fr/explorer. A wash takes the colour of what is behind it, so the row
  // reads on whichever surface the reader chose.
  // Asserted against the source rather than the render: happy-dom drops a
  // color-mix() declaration it cannot parse, so the rendered element shows
  // no background either way and only the source can answer.
  // @req REQ-115
  it("fills a live module with a wash that follows the reader's surface", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/hubs/AccessModeHub.tsx"),
      "utf8"
    );

    expect(source).not.toContain("var(--accent-tint)");
    expect(source).toContain("color-mix(in srgb, var(--accent) 16%");
  });
});

describe("hub shelves — the level between an axis and eleven games (REQ-120)", () => {
  // @req REQ-120
  it("files the jouer modules under a heading each, in registry order", () => {
    render(<AccessModeHub language="fr" mode="jouer" modules={jouerModules} />);

    const shelves = screen.getAllByTestId(/^hub-shelf-/);
    expect(shelves.map((shelf) => shelf.dataset.testid)).toEqual([
      "hub-shelf-jeux-pays",
      "hub-shelf-jeux-liens",
      "hub-shelf-jeux-quiz",
    ]);
    expect(
      screen.getByRole("heading", { level: 2, name: "Les pays" })
    ).toBeInTheDocument();
  });

  // The hub is the path without JavaScript and the one a crawler walks.
  // Grouping nests the modules; it must never drop one.
  // @req REQ-120
  it("still lists every module, each on its own shelf", () => {
    render(<AccessModeHub language="fr" mode="jouer" modules={jouerModules} />);

    for (const game of jouerModules) {
      const row = screen.getByTestId(`hub-module-${game.id}`);
      expect(
        within(screen.getByTestId(`hub-shelf-${game.group}`)).getByTestId(
          `hub-module-${game.id}`
        )
      ).toBe(row);
    }
    expect(screen.getByTestId("hub-module-link-comparer")).toHaveAttribute(
      "href",
      "/fr/jouer/vraie-taille"
    );
    expect(
      screen.getByTestId("hub-module-unavailable-liens")
    ).toBeInTheDocument();
  });

  // Explorer holds four modules and Comprendre three: few enough to read
  // at once, so neither is filed and both keep the flat list.
  // @req REQ-120
  it("leaves an unfiled axis on one flat list", () => {
    render(
      <AccessModeHub language="fr" mode="explorer" modules={explorerModules} />
    );

    expect(screen.queryAllByTestId(/^hub-shelf-/)).toHaveLength(0);
    expect(
      screen.getAllByTestId(/^hub-module-(?!link|unavailable)/)
    ).toHaveLength(explorerModules.length);
  });

  // A shelf names itself for the reader; the section takes that heading as
  // its accessible name so the structure is navigable, not just visible.
  // @req REQ-120
  it("names each shelf's region after its own heading", () => {
    render(<AccessModeHub language="fr" mode="jouer" modules={jouerModules} />);

    const shelf = screen.getByTestId("hub-shelf-jeux-pays");
    expect(shelf.tagName).toBe("SECTION");
    expect(shelf).toHaveAttribute(
      "aria-labelledby",
      shelf.querySelector("h2")?.id
    );
  });
});
