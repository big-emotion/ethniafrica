import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OG_DESCRIPTION, OG_TITLE } from "@/lib/brand";

const {
  getCorpusCountsMock,
  getContinentPeopleCountsMock,
  getHubModulesMock,
  loadHeroPreviewMock,
  loadSynthesisRailMock,
} = vi.hoisted(() => ({
  getCorpusCountsMock: vi.fn(),
  getContinentPeopleCountsMock: vi.fn(),
  getHubModulesMock: vi.fn(),
  loadHeroPreviewMock: vi.fn(),
  loadSynthesisRailMock: vi.fn(),
}));

const fixtureCounts = {
  peoples: 4213,
  countries: 91,
  families: 37,
  migrations: 5,
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/lib/home/corpusCounts", () => ({
  getCorpusCounts: getCorpusCountsMock,
}));

vi.mock("@/api/v2/services/continentPeopleCounts", () => ({
  getContinentPeopleCounts: getContinentPeopleCountsMock,
}));

vi.mock("@/lib/home/seedWords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/home/seedWords")>();
  return {
    ...actual,
    loadSeedWords: vi.fn(async () => actual.FALLBACK_SEED_WORDS),
  };
});

vi.mock("@/lib/hubs/moduleAvailability", () => ({
  getHubModules: getHubModulesMock,
}));

vi.mock("@/lib/home/heroPreviewData", () => ({
  loadHeroPreview: loadHeroPreviewMock,
}));

vi.mock("@/lib/home/synthesisRailData", () => ({
  loadSynthesisRail: loadSynthesisRailMock,
}));

vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="page-layout">{children}</div>
  ),
}));

vi.mock("@/components/atlas/ContinentGlobeStage", () => ({
  ContinentGlobeStage: () => <div data-testid="home-globe-stage" />,
}));

import Home, { metadata } from "../page";

const renderHome = async () => render(await Home());

describe("home page — search, corpus scale and one fact (ETNI-1404)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCorpusCountsMock.mockResolvedValue(fixtureCounts);
    getContinentPeopleCountsMock.mockResolvedValue({});
    getHubModulesMock.mockResolvedValue([]);
    loadSynthesisRailMock.mockResolvedValue([]);
  });

  // @req REQ-044
  it("keeps one page title and the search-first hero", async () => {
    await renderHome();

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("search")).toBeInTheDocument();
  });

  // @req REQ-113
  it("shows the three real corpus totals and exactly one sourced fact", async () => {
    await renderHome();

    expect(screen.getByTestId("home-count-peoples")).toHaveTextContent(
      /4\s?213/
    );
    expect(screen.getByTestId("home-count-countries")).toHaveTextContent("91");
    expect(screen.getByTestId("home-count-families")).toHaveTextContent("37");
    expect(screen.getAllByTestId("home-did-you-know")).toHaveLength(1);
    expect(
      screen
        .getByTestId("home-did-you-know")
        .querySelector('[data-testid="home-dyk-official-source"]')
    ).not.toBeNull();
  });

  // A rejected count query means “unknown”, never “empty”. The other hero
  // data still renders because each server read owns its own fallback.
  // @req REQ-113
  it("keeps the home usable and marks every total unavailable on read failure", async () => {
    getCorpusCountsMock.mockRejectedValueOnce(new Error("database offline"));

    await renderHome();

    expect(screen.getByRole("search")).toBeInTheDocument();
    expect(screen.getAllByText("Indisponible")).toHaveLength(3);
  });

  // @req REQ-113
  // @req REQ-132
  it("does not render or load the presentation blocks moved to About or retired modules", async () => {
    await renderHome();

    for (const testId of [
      "home-purpose-blocks",
      "access-axes",
      "home-synthesis-rail",
      "home-featured-module",
      "home-trust-strip",
    ]) {
      expect(screen.queryByTestId(testId)).not.toBeInTheDocument();
    }
    expect(getHubModulesMock).not.toHaveBeenCalled();
    expect(loadHeroPreviewMock).not.toHaveBeenCalled();
    expect(loadSynthesisRailMock).not.toHaveBeenCalled();
  });

  // The globe's country signal remains a server-side dependency even though
  // the old FeaturedModule wrapper is gone.
  // @req REQ-115
  it("still resolves the continent people counts for the hero", async () => {
    await renderHome();

    expect(getContinentPeopleCountsMock).toHaveBeenCalledOnce();
  });

  // @req REQ-044
  it("declares the canonical and OpenGraph metadata", () => {
    expect(metadata.alternates?.canonical).toBe("/fr");
    expect(metadata.title).toBe(OG_TITLE);
    expect(metadata.description).toBe(OG_DESCRIPTION);
    expect(metadata.openGraph?.title).toBe(OG_TITLE);
    expect(metadata.openGraph?.description).toBe(OG_DESCRIPTION);
    expect(metadata.openGraph?.url).toBe("/fr");
  });
});
