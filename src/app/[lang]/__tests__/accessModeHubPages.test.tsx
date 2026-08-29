import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import React from "react";

import type { HubModule } from "@/lib/hubs/moduleAvailability";
import { getLocalizedRoute } from "@/lib/routing";
import { getTranslation } from "@/lib/translations";

const { getHubModulesMock } = vi.hoisted(() => ({
  getHubModulesMock: vi.fn(),
}));

vi.mock("@/lib/hubs/moduleAvailability", () => ({
  getHubModules: getHubModulesMock,
}));

const { getContinentPeopleCountsMock } = vi.hoisted(() => ({
  getContinentPeopleCountsMock: vi.fn(async () => ({ NGA: 68, TZA: 99 })),
}));

vi.mock("@/api/v2/services/continentPeopleCounts", () => ({
  getContinentPeopleCounts: getContinentPeopleCountsMock,
}));

// The scene's choosable set: every country the corpus documents, which is
// wider than the twelve the radial field draws.
const { getCountryIndexMock } = vi.hoisted(() => ({
  getCountryIndexMock: vi.fn(async () => [
    { id: "NGA" },
    { id: "TZA" },
    { id: "LSO" },
  ]),
}));

vi.mock("@/api/v2/services/countryService", () => ({
  getCountryIndex: getCountryIndexMock,
}));

// The band's title is stubbed through rather than dropped: it is the page's
// only `h1` since the hub stopped raising one of its own, so a route that
// forgot to pass it would leave the page headless with every other assertion
// here still green.
vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({
    children,
    title,
  }: {
    children: React.ReactNode;
    title?: string;
  }) => (
    <div data-testid="page-layout">
      <span data-testid="page-layout-title">{title}</span>
      {children}
    </div>
  ),
}));

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

const comprendreModules: HubModule[] = [
  {
    id: "noms",
    name: "Noms & appellations",
    accessMode: "comprendre",
    page: "names",
    availability: "data",
    dataSource: "name_records",
    available: true,
  },
  {
    id: "frise",
    name: "Premiers repères de migrations",
    accessMode: "comprendre",
    page: "migrations",
    availability: "data",
    dataSource: "migration_events",
    available: false,
  },
  {
    id: "doctrine",
    name: "La doctrine éditoriale",
    accessMode: "comprendre",
    page: "doctrine",
    availability: "static",
    available: true,
  },
];

const jouerModules: HubModule[] = [
  {
    id: "quiz",
    name: "Le quiz",
    accessMode: "jouer",
    page: "quiz",
    availability: "data",
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
    available: false,
  },
];

describe("access-mode hub routes (REQ-114)", () => {
  // @req REQ-114
  it("resolves the explorer hub route and lists its modules", async () => {
    getHubModulesMock.mockResolvedValueOnce(explorerModules);
    const { default: ExplorerHubPage } = await import("../explorer/page");

    render(await ExplorerHubPage());

    expect(getHubModulesMock).toHaveBeenCalledWith("explorer");
    expect(screen.getByTestId("access-mode-hub-explorer")).toBeInTheDocument();
    expect(screen.getByTestId("hub-module-link-peuples")).toBeInTheDocument();
    expect(screen.getByTestId("hub-module-link-recherche")).toBeInTheDocument();
    expect(
      screen.getByTestId("hub-module-unavailable-familles")
    ).toBeInTheDocument();
  });

  // The four module links are server-rendered and unconditional, so the
  // map is never the only way in. A count that fails costs the scene its
  // data, not the reader their route.
  // @req REQ-114
  it("still lists the explorer modules when the continent counts fail", async () => {
    getHubModulesMock.mockResolvedValueOnce(explorerModules);
    getContinentPeopleCountsMock.mockRejectedValueOnce(
      new Error("supabase unreachable")
    );
    const { default: ExplorerHubPage } = await import("../explorer/page");

    render(await ExplorerHubPage());

    expect(screen.getByTestId("hub-module-link-peuples")).toBeInTheDocument();
    expect(screen.getByTestId("hub-module-link-recherche")).toBeInTheDocument();
  });

  // Three axes, three scenes: what stops the hubs from reading as the same
  // list under three labels.
  // @req REQ-114
  it("mounts a distinct scene on each of the three hubs", async () => {
    getHubModulesMock.mockResolvedValueOnce(explorerModules);
    const { default: ExplorerHubPage } = await import("../explorer/page");
    const { unmount: unmountExplorer } = render(await ExplorerHubPage());
    expect(
      screen.getByTestId("access-mode-hub-explorer-scene")
    ).toBeInTheDocument();
    unmountExplorer();

    getHubModulesMock.mockResolvedValueOnce(comprendreModules);
    const { default: ComprendreHubPage } = await import("../comprendre/page");
    const { unmount: unmountComprendre } = render(await ComprendreHubPage());
    expect(
      screen.getByTestId("access-mode-hub-comprendre-scene")
    ).toBeInTheDocument();
    unmountComprendre();

    getHubModulesMock.mockResolvedValueOnce(jouerModules);
    const { default: JouerHubPage } = await import("../jouer/page");
    render(await JouerHubPage());
    expect(
      screen.getByTestId("access-mode-hub-jouer-scene")
    ).toBeInTheDocument();
  });

  // @req REQ-114
  it("resolves the comprendre hub route and lists its modules", async () => {
    getHubModulesMock.mockResolvedValueOnce(comprendreModules);
    const { default: ComprendreHubPage } = await import("../comprendre/page");

    render(await ComprendreHubPage());

    expect(getHubModulesMock).toHaveBeenCalledWith("comprendre");
    expect(
      screen.getByTestId("access-mode-hub-comprendre")
    ).toBeInTheDocument();
    expect(screen.getByTestId("hub-module-link-doctrine")).toBeInTheDocument();
    expect(screen.getByTestId("hub-module-link-noms")).toBeInTheDocument();
    expect(
      screen.getByTestId("hub-module-unavailable-frise")
    ).toBeInTheDocument();
  });

  // @req REQ-114
  it("resolves the jouer hub route and lists its modules", async () => {
    getHubModulesMock.mockResolvedValueOnce(jouerModules);
    const { default: JouerHubPage } = await import("../jouer/page");

    render(await JouerHubPage());

    expect(getHubModulesMock).toHaveBeenCalledWith("jouer");
    expect(screen.getByTestId("access-mode-hub-jouer")).toBeInTheDocument();
    expect(screen.getByTestId("hub-module-link-quiz")).toBeInTheDocument();
    expect(screen.getByTestId("hub-module-link-comparer")).toHaveAttribute(
      "href",
      `${getLocalizedRoute("fr", "jouerHub")}/vraie-taille`
    );
    expect(
      screen.getByTestId("hub-module-unavailable-liens")
    ).toBeInTheDocument();
  });

  // Left to the shell's fallback, all three opened on the product name — the
  // masthead repeated one line lower. Each route now hands the band the title
  // of the axis it serves.
  // @req REQ-114
  it("hands the title band the axis's own page title on each of the three hubs", async () => {
    const { hubs } = getTranslation("fr");

    getHubModulesMock.mockResolvedValueOnce(explorerModules);
    const { default: ExplorerHubPage } = await import("../explorer/page");
    const { unmount: unmountExplorer } = render(await ExplorerHubPage());
    expect(screen.getByTestId("page-layout-title")).toHaveTextContent(
      hubs.explorer.pageTitle
    );
    unmountExplorer();

    getHubModulesMock.mockResolvedValueOnce(comprendreModules);
    const { default: ComprendreHubPage } = await import("../comprendre/page");
    const { unmount: unmountComprendre } = render(await ComprendreHubPage());
    expect(screen.getByTestId("page-layout-title")).toHaveTextContent(
      hubs.comprendre.pageTitle
    );
    unmountComprendre();

    getHubModulesMock.mockResolvedValueOnce(jouerModules);
    const { default: JouerHubPage } = await import("../jouer/page");
    render(await JouerHubPage());
    expect(screen.getByTestId("page-layout-title")).toHaveTextContent(
      hubs.jouer.pageTitle
    );
  });
});
