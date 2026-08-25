import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

import { ColonizationModulePage } from "../ColonizationModulePage";
import type { ColonizationModuleData } from "@/lib/colonizationDataTransformer";
import type { PeopleFragmentation } from "@/api/v2/schemas/peopleFragmentation";

vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="page-layout">{children}</div>
  ),
}));

afterEach(() => cleanup());

const eweFragmentation: PeopleFragmentation = {
  peopleId: "PPL_EWE",
  autonym: "Eʋe",
  exonym: "Ewe",
  countryCount: 2,
  countries: [
    {
      iso3: "GHA",
      nameFr: "Ghana",
      populationShare: 0.62,
      assertionId: "aaaaaaaa-1111-1111-1111-111111111111",
    },
    { iso3: "TGO", nameFr: "Togo", populationShare: 0.38, assertionId: null },
  ],
  borderPairs: [{ a: "GHA", b: "TGO" }],
};

const emptyData: ColonizationModuleData = {
  doctrine: { slug: "heritage-colonial" },
  fragmentation: null,
  mapSection: null,
  imposedNames: null,
  displacement: null,
  resistances: null,
  sources: null,
};

const dataWithFragmentation: ColonizationModuleData = {
  ...emptyData,
  fragmentation: [{ peopleId: "PPL_EWE", fragmentation: eweFragmentation }],
  sources: [
    {
      peopleId: "PPL_EWE",
      countryIso3: "GHA",
      assertionId: "aaaaaaaa-1111-1111-1111-111111111111",
    },
  ],
};

// @req REQ-091 FR90
describe("ColonizationModulePage (Epic 13, Story 13.9, ETNI-533)", () => {
  // @req REQ-091 FR90
  it("renders the doctrine intro card linking the live heritage-colonial doctrine", () => {
    render(<ColonizationModulePage data={emptyData} />);
    expect(
      screen.getByRole("link", { name: "Lire la doctrine" })
    ).toHaveAttribute("href", "/fr/doctrine/heritage-colonial");
  });

  // @req REQ-091 FR90
  it("renders breadcrumbs", () => {
    render(<ColonizationModulePage data={emptyData} />);
    expect(
      screen.getByRole("navigation", { name: "Fil d'ariane" })
    ).toBeInTheDocument();
  });

  // @req REQ-091 FR90
  it("gracefully omits every section when the transformer reports no data", () => {
    render(<ColonizationModulePage data={emptyData} />);
    expect(
      screen.queryByText("Peuples fragmentés par les frontières coloniales")
    ).toBeNull();
    expect(screen.queryByText("Sources")).toBeNull();
  });

  // @req REQ-091 FR90
  it("renders the fragmentation index section when fragmentation data is present", () => {
    render(<ColonizationModulePage data={dataWithFragmentation} />);
    expect(
      screen.getByText("Peuples fragmentés par les frontières coloniales")
    ).toBeInTheDocument();
    expect(screen.getByText("Eʋe")).toBeInTheDocument();
  });

  // @req REQ-091 FR90
  it("renders the sources footer when source data is present", () => {
    render(<ColonizationModulePage data={dataWithFragmentation} />);
    expect(screen.getByText("Sources")).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: "voir les sources" }).length
    ).toBeGreaterThan(0);
  });
});
