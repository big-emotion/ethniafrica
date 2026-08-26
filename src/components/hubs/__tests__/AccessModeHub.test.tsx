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
    id: "comparer",
    name: "Comparer deux peuples",
    accessMode: "jouer",
    page: "compare",
    availability: "static",
    available: true,
  },
  {
    id: "liens",
    name: "Les liens invisibles",
    accessMode: "jouer",
    page: null,
    availability: "unavailable",
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

  // @req REQ-114 @req REQ-106
  it("renders a module with no route (liens) with no anchor element", () => {
    render(<AccessModeHub language="fr" mode="jouer" modules={jouerModules} />);

    expect(
      screen.getByTestId("hub-module-unavailable-liens")
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("hub-module-link-liens")
    ).not.toBeInTheDocument();
  });

  // Comparer stopped being a shell once its picker was wired, so the axis
  // no longer opens on an entry the reader cannot act on.
  // @req REQ-114 @req REQ-106
  it("renders comparer as a live link now that its picker exists", () => {
    render(<AccessModeHub language="fr" mode="jouer" modules={jouerModules} />);

    expect(screen.getByTestId("hub-module-link-comparer")).toHaveAttribute(
      "href",
      getLocalizedRoute("fr", "compare")
    );
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
});
