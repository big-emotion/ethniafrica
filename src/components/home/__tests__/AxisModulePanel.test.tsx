import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AxisModulePanel } from "@/components/home/AxisModulePanel";
import { getLocalizedRoute } from "@/lib/routing";
import type { HubModule } from "@/lib/hubs/moduleAvailability";

let reducedMotion = false;
vi.mock("@/hooks/use-prefers-reduced-motion", () => ({
  usePrefersReducedMotion: () => reducedMotion,
}));

vi.mock("@/components/home/AxisGraphCanvas", () => ({
  AxisGraphCanvas: () => <div data-testid="axis-graph-canvas" />,
}));

const explorerModules: HubModule[] = [
  {
    id: "peuples",
    name: "Les peuples d'Afrique",
    accessMode: "explorer",
    page: "peoples",
    availability: "data",
    available: true,
  },
  {
    id: "doctrine",
    name: "La doctrine éditoriale",
    accessMode: "explorer",
    page: "doctrine",
    availability: "static",
    available: true,
  },
  {
    id: "noms",
    name: "Noms & appellations",
    accessMode: "explorer",
    page: "names",
    availability: "data",
    available: false,
  },
];

const jouerModules: HubModule[] = [
  {
    id: "liens",
    name: "Les liens invisibles",
    accessMode: "jouer",
    page: null,
    gameSlug: "liens",
    availability: "data",
    dataSource: "afrik_people_relations",
    available: true,
  },
  {
    id: "annonce",
    name: "Un module annonce\u0301 avant sa route",
    accessMode: "jouer",
    page: null,
    availability: "data",
    available: false,
  },
];

function renderPanel(
  modules: HubModule[] = explorerModules,
  onClose = vi.fn()
) {
  render(
    <AxisModulePanel
      language="fr"
      mode="explorer"
      modules={modules}
      labelledBy="access-axis-title-explorer"
      onClose={onClose}
    />
  );
  return onClose;
}

afterEach(() => {
  reducedMotion = false;
  cleanup();
});

describe("AxisModulePanel — the modules an axis deploys on the home (REQ-114)", () => {
  // @req REQ-114
  it("leads with the axis hub, then the destinations it was handed", () => {
    renderPanel();

    const entries = screen.getAllByTestId(
      /^axis-(hub|module)-(?!link|unavailable|facet)/
    );
    expect(entries.map((entry) => entry.dataset.testid)).toEqual([
      "axis-hub-explorer",
      "axis-module-doctrine",
      "axis-module-noms",
    ]);
  });

  /**
   * `peuples` is not among the nodes above, and that is the change: it is a
   * facet of the hub, so it is drawn inside the hub's node rather than beside
   * it. Three satellites of equal weight is the shape the home had when the
   * site had three directories.
   */
  // @req REQ-114
  it("draws a facet inside the hub rather than beside it", () => {
    renderPanel();

    expect(screen.queryByTestId("axis-module-peuples")).not.toBeInTheDocument();
    expect(screen.getByTestId("axis-facet-link-peuples")).toHaveAttribute(
      "href",
      getLocalizedRoute("fr", "peoples")
    );
  });

  // The whole point of opening in place: the reader's next click lands on
  // the module itself, never on the axis slug it used to pass through.
  // @req REQ-114
  it("sends a live module straight to its own page, and the hub to the hub", () => {
    renderPanel();

    expect(screen.getByTestId("axis-module-link-doctrine")).toHaveAttribute(
      "href",
      getLocalizedRoute("fr", "doctrine")
    );

    // The axis hub used to be the page a reader was made to pass through, and
    // the panel exists so they no longer have to. It is now offered once, as
    // itself — which is different from being the destination of everything.
    expect(screen.getByTestId("axis-hub-link-explorer")).toHaveAttribute(
      "href",
      getLocalizedRoute("fr", "explorerHub")
    );
    const toHub = screen
      .getAllByRole("link")
      .filter(
        (link) =>
          link.getAttribute("href") === getLocalizedRoute("fr", "explorerHub")
      );
    expect(toHub).toHaveLength(1);
  });

  // @req REQ-106
  it("leaves an unavailable module inert, marked Bientôt rather than linked", () => {
    renderPanel();

    expect(
      screen.getByTestId("axis-module-unavailable-noms")
    ).toHaveTextContent("Bientôt");
    expect(
      screen.queryByTestId("axis-module-link-noms")
    ).not.toBeInTheDocument();
  });

  // A game carries `page: null` by design — it is addressed by slug so
  // PageType stays a closed union — so a panel that reads `page` alone
  // renders every live game as "Bientot". That is how eleven playable
  // games sat inert on the home while the hub linked all eleven.
  // @req REQ-114
  it("addresses a game by its slug rather than leaving it on Bientot", () => {
    render(
      <AxisModulePanel
        language="fr"
        mode="jouer"
        modules={jouerModules}
        labelledBy="access-axis-title-jouer"
        onClose={vi.fn()}
      />
    );

    expect(screen.getByTestId("axis-module-link-liens")).toHaveAttribute(
      "href",
      `${getLocalizedRoute("fr", "jouerHub")}/liens`
    );
    expect(
      screen.queryByTestId("axis-module-unavailable-liens")
    ).not.toBeInTheDocument();
  });

  // A module with neither slug nor page is the other way a module can be
  // unavailable, and it must not become a link to nowhere.
  // @req REQ-106
  it("renders a module that has no route at all as inert", () => {
    render(
      <AxisModulePanel
        language="fr"
        mode="jouer"
        modules={jouerModules}
        labelledBy="access-axis-title-jouer"
        onClose={vi.fn()}
      />
    );

    expect(
      screen.getByTestId("axis-module-unavailable-annonce")
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("axis-module-link-annonce")
    ).not.toBeInTheDocument();
  });

  // @req REQ-114
  it("takes its accessible name from the axis card that opened it", () => {
    renderPanel();

    expect(screen.getByTestId("axis-panel-explorer")).toHaveAttribute(
      "aria-labelledby",
      "access-axis-title-explorer"
    );
  });

  // @req REQ-114
  it("closes on the close control", async () => {
    const onClose = renderPanel();

    await userEvent.click(screen.getByTestId("axis-panel-close-explorer"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // The graph is decoration over a list that already works. Under reduced
  // motion the list is all there is, and it is complete.
  // @req REQ-114
  it("drops the graph under reduced motion and still deploys every module", () => {
    reducedMotion = true;
    renderPanel();

    expect(screen.queryByTestId("axis-graph-canvas")).not.toBeInTheDocument();
    expect(
      screen.getAllByTestId(/^axis-(hub|module)-(?!link|unavailable|facet)/)
    ).toHaveLength(3);
    expect(screen.getByTestId("axis-facet-link-peuples")).toBeInTheDocument();
  });
});

/**
 * Mirrors the registry's jouer shelves: one that holds several games and one
 * that holds a single game, which is the shape the taxonomy produces now the
 * hub carries three games rather than eleven.
 */
const shelvedModules: HubModule[] = [
  {
    id: "appellations",
    name: "Eux, ou les autres ?",
    accessMode: "jouer",
    page: null,
    gameSlug: "appellations",
    availability: "data",
    dataSource: "afrik_peoples",
    group: "jeux-peuples",
    available: true,
  },
  {
    id: "mercator",
    name: "La taille qu'on vous a cachée",
    accessMode: "jouer",
    page: null,
    gameSlug: "mercator",
    availability: "data",
    dataSource: "afrik_countries",
    group: "jeux-pays",
    available: true,
  },
  {
    id: "pays-davant",
    name: "Le pays d'avant",
    accessMode: "jouer",
    page: null,
    gameSlug: "pays-davant",
    availability: "data",
    dataSource: "afrik_countries",
    group: "jeux-pays",
    available: true,
  },
];

const renderShelved = (onClose = vi.fn()) => {
  render(
    <AxisModulePanel
      language="fr"
      mode="jouer"
      modules={shelvedModules}
      labelledBy="access-axis-title-jouer"
      onClose={onClose}
    />
  );
  return onClose;
};

describe("AxisModulePanel — a shelf between the axis and its games (REQ-120)", () => {
  // Many nodes at once is past what the scene can lay out and past what a
  // reader takes in. The shelves bring the first level back to a handful.
  // @req REQ-120
  it("opens on the shelves rather than on every game at once", () => {
    renderShelved();

    expect(
      screen.getAllByTestId(/^axis-shelf-(?!open)/).map((n) => n.dataset.testid)
    ).toEqual(["axis-shelf-jeux-pays"]);
    expect(
      screen.queryByTestId("axis-module-mercator")
    ).not.toBeInTheDocument();
  });

  // A shelf holding one game is not a shelf: opening it would cost a click
  // and offer no choice, so it stands in for its game at the first level.
  // @req REQ-120
  it("promotes a lone game in place of the shelf that would hold it", () => {
    renderShelved();

    expect(screen.getByTestId("axis-module-link-appellations")).toHaveAttribute(
      "href",
      `${getLocalizedRoute("fr", "jouerHub")}/appellations`
    );
    expect(
      screen.queryByTestId("axis-shelf-jeux-peuples")
    ).not.toBeInTheDocument();
  });

  // @req REQ-120
  it("says how many games a shelf holds before the reader opens it", () => {
    renderShelved();

    expect(screen.getByTestId("axis-shelf-jeux-pays")).toHaveTextContent(
      "2 jeux"
    );
  });

  // @req REQ-120
  it("deploys the games of the shelf that was opened, and only those", async () => {
    renderShelved();

    await userEvent.click(screen.getByTestId("axis-shelf-open-jeux-pays"));

    expect(screen.getByTestId("axis-module-link-mercator")).toHaveAttribute(
      "href",
      `${getLocalizedRoute("fr", "jouerHub")}/mercator`
    );
    expect(
      screen.getByTestId("axis-module-link-pays-davant")
    ).toBeInTheDocument();
  });

  // Escape used to close outright. With a level below the axis it has to
  // walk back up it first, or the reader loses the whole panel for one
  // wrong turn. Closing stays AccessAxes' half of the contract, and the
  // two halves are exercised together in its own suite.
  // @req REQ-120
  it("steps Escape back to the shelves rather than closing", async () => {
    const onClose = renderShelved();

    await userEvent.click(screen.getByTestId("axis-shelf-open-jeux-pays"));
    await userEvent.keyboard("{Escape}");

    expect(screen.getByTestId("axis-shelf-jeux-pays")).toBeInTheDocument();
    expect(
      screen.queryByTestId("axis-module-link-mercator")
    ).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  // @req REQ-120
  it("offers a way back that names the shelf being left", async () => {
    renderShelved();

    await userEvent.click(screen.getByTestId("axis-shelf-open-jeux-pays"));
    expect(screen.getByTestId("axis-panel-trail")).toHaveTextContent(
      "Les pays"
    );

    await userEvent.click(screen.getByTestId("axis-panel-back"));
    expect(screen.getByTestId("axis-shelf-jeux-pays")).toBeInTheDocument();
    expect(screen.queryByTestId("axis-panel-back")).not.toBeInTheDocument();
  });

  // The reader's attention is on the level that just changed, so that is
  // where the keyboard has to be — going down and coming back up.
  // @req REQ-120
  it("carries the focus onto each level it opens", async () => {
    renderShelved();

    await userEvent.click(screen.getByTestId("axis-shelf-open-jeux-pays"));
    expect(screen.getByTestId("axis-panel-jouer")).toHaveFocus();
  });

  // An axis whose modules carry no shelf never grows the level at all.
  // @req REQ-120
  it("leaves an unfiled axis one level deep", () => {
    renderPanel();

    expect(screen.queryAllByTestId(/^axis-shelf-/)).toHaveLength(0);
    expect(screen.getByTestId("axis-facet-link-peuples")).toBeInTheDocument();
  });
});
