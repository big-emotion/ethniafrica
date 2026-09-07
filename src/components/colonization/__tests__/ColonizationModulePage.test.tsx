import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

import { ColonizationModulePage } from "../ColonizationModulePage";
import type {
  ColonizationModuleData,
  ColonizationTimelineEntry,
} from "@/lib/colonizationDataTransformer";
import type { PeopleFragmentation } from "@/api/v2/schemas/peopleFragmentation";
import { getLocalizedRoute } from "@/lib/routing";

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
  timeline: null,
  timelineBounds: null,
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

const resistanceEntry: ColonizationTimelineEntry = {
  id: "MGR_MAJI_MAJI_REBELLION",
  nameMain: "Rébellion Maji Maji",
  eventType: "resistance",
  classificationStatus: "contested",
  timeRange: { startYear: 1905, endYear: 1907, datingNote: null },
  peoples: [
    {
      id: "PPL_MATUMBI",
      nameMain: "Matumbi",
      endonym: "Matumbi",
      endonymLanguage: "mgw",
    },
  ],
  place: null,
  primarySource: null,
};

const dataWithTimeline: ColonizationModuleData = {
  ...emptyData,
  timeline: [resistanceEntry],
  timelineBounds: { min: 1905, max: 1907 },
};

// @req REQ-091 FR90
describe("ColonizationModulePage (Epic 13, Story 13.9, ETNI-533)", () => {
  // @req REQ-091 FR90
  it("renders the doctrine intro card linking the live heritage-colonial doctrine", () => {
    render(<ColonizationModulePage language="fr" data={emptyData} />);
    expect(
      screen.getByRole("link", { name: "Lire la doctrine" })
    ).toHaveAttribute(
      "href",
      `${getLocalizedRoute("fr", "doctrine")}/heritage-colonial`
    );
  });

  // @req REQ-091 FR90
  /**
   * The module used to mount its own trail. It no longer does: the trail is
   * the shell's, and a module mounting a second one on top of it renders two.
   * The trail this page actually shows is asserted in `siteTrailCoverage`,
   * which checks the route reaches a mount rather than trusting each module to
   * remember one.
   */
  // @req REQ-115
  it("leaves the trail to the shell rather than mounting a second one", () => {
    render(<ColonizationModulePage language="fr" data={emptyData} />);
    expect(
      screen.queryByRole("navigation", { name: "Fil d'ariane" })
    ).toBeNull();
  });

  // @req REQ-091 FR90
  it("gracefully omits every section when the transformer reports no data", () => {
    render(<ColonizationModulePage language="fr" data={emptyData} />);
    expect(
      screen.queryByText("Peuples fragmentés par les frontières coloniales")
    ).toBeNull();
    expect(screen.queryByText("Sources")).toBeNull();
  });

  // @req REQ-091 FR90
  it("renders the fragmentation index section when fragmentation data is present", () => {
    render(
      <ColonizationModulePage language="fr" data={dataWithFragmentation} />
    );
    expect(
      screen.getByText("Peuples fragmentés par les frontières coloniales")
    ).toBeInTheDocument();
    expect(screen.getByText("Eʋe")).toBeInTheDocument();
  });

  // @req REQ-091 FR90
  it("renders the sources footer when source data is present", () => {
    render(
      <ColonizationModulePage language="fr" data={dataWithFragmentation} />
    );
    expect(screen.getByText("Sources")).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: "voir les sources" }).length
    ).toBeGreaterThan(0);
  });

  // @req REQ-101 FR87
  it("omits the timeline section when the transformer reports no timeline", () => {
    render(<ColonizationModulePage language="fr" data={emptyData} />);
    expect(screen.queryByText("Chronologie")).toBeNull();
  });

  // @req REQ-101 FR87
  it("renders both the marker layer and the chronology table when timeline data is present", () => {
    render(<ColonizationModulePage language="fr" data={dataWithTimeline} />);
    expect(screen.getByText("Chronologie")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /événement résistance/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("table", {
        name: "Chronologie des événements coloniaux",
      })
    ).toBeInTheDocument();
  });
});
