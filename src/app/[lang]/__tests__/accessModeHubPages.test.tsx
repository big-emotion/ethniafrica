import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import React from "react";

import type { HubModule } from "@/lib/hubs/moduleAvailability";

const { getHubModulesMock } = vi.hoisted(() => ({
  getHubModulesMock: vi.fn(),
}));

vi.mock("@/lib/hubs/moduleAvailability", () => ({
  getHubModules: getHubModulesMock,
}));

vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="page-layout">{children}</div>
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
    id: "noms",
    name: "Noms & appellations",
    accessMode: "explorer",
    page: "names",
    availability: "data",
    dataSource: "name_records",
    available: false,
  },
];

const comprendreModules: HubModule[] = [
  {
    id: "doctrine",
    name: "La doctrine éditoriale",
    accessMode: "comprendre",
    page: "doctrine",
    availability: "static",
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
];

const jouerModules: HubModule[] = [
  {
    id: "comparer",
    name: "Comparer deux peuples",
    accessMode: "jouer",
    page: "compare",
    availability: "unavailable",
    available: false,
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
      screen.getByTestId("hub-module-unavailable-noms")
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
    expect(
      screen.getByTestId("hub-module-unavailable-comparer")
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("hub-module-unavailable-liens")
    ).toBeInTheDocument();
  });
});
