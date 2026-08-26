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

const peuplesModules: HubModule[] = [
  {
    id: "peuples",
    name: "Peuples",
    accessMode: "peuples",
    page: "peoples",
    availability: "data",
    dataSource: "afrik_peoples",
    available: true,
  },
  {
    id: "noms",
    name: "Noms & appellations",
    accessMode: "peuples",
    page: "names",
    availability: "data",
    dataSource: "name_records",
    available: true,
  },
  {
    id: "comparer",
    name: "Comparer deux peuples",
    accessMode: "peuples",
    page: "compare",
    availability: "unavailable",
    available: false,
  },
];

const paysModules: HubModule[] = [
  {
    id: "pays",
    name: "Pays",
    accessMode: "pays",
    page: "countries",
    availability: "data",
    dataSource: "afrik_countries",
    available: true,
  },
  {
    id: "frise",
    name: "Premiers repères de migrations",
    accessMode: "pays",
    page: "migrations",
    availability: "data",
    dataSource: "migration_events",
    available: false,
  },
];

const famillesModules: HubModule[] = [
  {
    id: "familles",
    name: "Familles linguistiques",
    accessMode: "familles",
    page: "families",
    availability: "data",
    dataSource: "afrik_language_families",
    available: true,
  },
  {
    id: "liens",
    name: "Les liens invisibles",
    accessMode: "familles",
    page: null,
    availability: "unavailable",
    available: false,
  },
];

describe("access-mode hub routes (ETNI-1216, REQ-114)", () => {
  // @req REQ-114
  it("resolves the peuples hub route and lists its modules", async () => {
    getHubModulesMock.mockResolvedValueOnce(peuplesModules);
    const { default: PeuplesHubPage } = await import("../peuples-hub/page");

    render(await PeuplesHubPage());

    expect(getHubModulesMock).toHaveBeenCalledWith("peuples");
    expect(screen.getByTestId("access-mode-hub-peuples")).toBeInTheDocument();
    expect(screen.getByTestId("hub-module-link-peuples")).toBeInTheDocument();
    expect(screen.getByTestId("hub-module-link-noms")).toBeInTheDocument();
    expect(
      screen.getByTestId("hub-module-unavailable-comparer")
    ).toBeInTheDocument();
  });

  // @req REQ-114
  it("resolves the pays hub route and lists its modules", async () => {
    getHubModulesMock.mockResolvedValueOnce(paysModules);
    const { default: PaysHubPage } = await import("../pays-hub/page");

    render(await PaysHubPage());

    expect(getHubModulesMock).toHaveBeenCalledWith("pays");
    expect(screen.getByTestId("access-mode-hub-pays")).toBeInTheDocument();
    expect(screen.getByTestId("hub-module-link-pays")).toBeInTheDocument();
    expect(
      screen.getByTestId("hub-module-unavailable-frise")
    ).toBeInTheDocument();
  });

  // @req REQ-114
  it("resolves the familles hub route and lists its modules", async () => {
    getHubModulesMock.mockResolvedValueOnce(famillesModules);
    const { default: FamillesHubPage } = await import("../familles-hub/page");

    render(await FamillesHubPage());

    expect(getHubModulesMock).toHaveBeenCalledWith("familles");
    expect(screen.getByTestId("access-mode-hub-familles")).toBeInTheDocument();
    expect(screen.getByTestId("hub-module-link-familles")).toBeInTheDocument();
    expect(
      screen.getByTestId("hub-module-unavailable-liens")
    ).toBeInTheDocument();
  });
});
