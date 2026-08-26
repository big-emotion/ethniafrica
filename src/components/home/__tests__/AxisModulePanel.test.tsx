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
    availability: "unavailable",
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
  it("deploys exactly the modules it was handed, in the order they were given", () => {
    renderPanel();

    const entries = screen.getAllByTestId(/^axis-module-(?!link|unavailable)/);
    expect(entries.map((entry) => entry.dataset.testid)).toEqual([
      "axis-module-peuples",
      "axis-module-doctrine",
      "axis-module-noms",
    ]);
  });

  // The whole point of opening in place: the reader's next click lands on
  // the module itself, never on the axis slug it used to pass through.
  // @req REQ-114
  it("sends a live module straight to its own page, never to the axis hub", () => {
    renderPanel();

    expect(screen.getByTestId("axis-module-link-peuples")).toHaveAttribute(
      "href",
      getLocalizedRoute("fr", "peoples")
    );
    expect(screen.getByTestId("axis-module-link-doctrine")).toHaveAttribute(
      "href",
      getLocalizedRoute("fr", "doctrine")
    );
    for (const link of screen.getAllByRole("link")) {
      expect(link.getAttribute("href")).not.toBe(
        getLocalizedRoute("fr", "explorerHub")
      );
    }
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
      "/fr/jouer/liens"
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
      screen.getAllByTestId(/^axis-module-(?!link|unavailable)/)
    ).toHaveLength(3);
    expect(screen.getByTestId("axis-module-link-peuples")).toBeInTheDocument();
  });
});
