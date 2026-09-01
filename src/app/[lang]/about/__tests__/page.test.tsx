import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { HubModule } from "@/lib/hubs/moduleAvailability";
import type { AccessMode } from "@/lib/hubs/moduleRegistry";

const mocks = vi.hoisted(() => ({
  counts: {
    peoples: 4213,
    countries: 91,
    families: 37,
    migrations: 5,
  },
  syntheses: [
    {
      id: "BDI",
      nameFr: "Burundi",
      summary: "Chapeau du Burundi.",
      formerNames: [],
      peoples: [],
      kingdoms: [],
      languages: ["kirundi"],
    },
  ],
  modulesByAxis: {
    atlas: [{ id: "search", available: true }],
    dossiers: [{ id: "names", available: true }],
    jeux: [{ id: "quiz", available: true }],
  },
  getCorpusCounts: vi.fn(),
  getHubModules: vi.fn(),
  loadSynthesisRail: vi.fn(),
}));

vi.mock("@/lib/home/corpusCounts", () => ({
  getCorpusCounts: mocks.getCorpusCounts,
}));

vi.mock("@/lib/hubs/moduleAvailability", () => ({
  getHubModules: mocks.getHubModules,
}));

vi.mock("@/lib/home/synthesisRailData", () => ({
  loadSynthesisRail: mocks.loadSynthesisRail,
}));

vi.mock("@/components/pages/AboutPageShell", () => ({
  default: ({ children }: { children: ReactNode }) => (
    <div data-testid="about-page-shell">{children}</div>
  ),
}));

vi.mock("@/components/pages/AboutPageContent", () => ({
  default: ({
    counts,
    modulesByAxis,
    syntheses,
  }: {
    counts: typeof mocks.counts;
    modulesByAxis: Record<AccessMode, HubModule[]>;
    syntheses: typeof mocks.syntheses;
  }) => (
    <div
      data-testid="about-page-content"
      data-counts={JSON.stringify(counts)}
      data-module-ids={JSON.stringify(
        Object.fromEntries(
          Object.entries(modulesByAxis).map(([mode, modules]) => [
            mode,
            modules.map((module) => module.id),
          ])
        )
      )}
      data-synthesis-ids={syntheses.map(({ id }) => id).join(",")}
    />
  ),
}));

import AboutPage from "../page";

describe("AboutPage server boundary (REQ-091)", () => {
  beforeEach(() => {
    mocks.getCorpusCounts.mockReset();
    mocks.getCorpusCounts.mockResolvedValue(mocks.counts);
    mocks.getHubModules.mockReset();
    mocks.getHubModules.mockImplementation(async (mode: AccessMode) =>
      Promise.resolve(mocks.modulesByAxis[mode] as unknown as HubModule[])
    );
    mocks.loadSynthesisRail.mockReset();
    mocks.loadSynthesisRail.mockResolvedValue(mocks.syntheses);
  });

  // @req REQ-091
  it("keeps the route server-capable and delegates its interactive shell", () => {
    const source = readFileSync(
      join(process.cwd(), "src/app/[lang]/about/page.tsx"),
      "utf8"
    );

    expect(source).not.toMatch(/^["']use client["'];/m);
    expect(source).not.toMatch(/\b(?:useEffect|useParams|useLanguage)\b/);
    expect(source).toMatch(/<AboutPageShell>/);
    expect(source).toMatch(/Promise\.all\(/);
  });

  // @req REQ-132
  it("resolves every moved block's data on the server and passes it to About content", async () => {
    render(await AboutPage());

    expect(mocks.getCorpusCounts).toHaveBeenCalledOnce();
    expect(mocks.loadSynthesisRail).toHaveBeenCalledOnce();
    expect(mocks.getHubModules.mock.calls.map(([mode]) => mode)).toEqual([
      "atlas",
      "dossiers",
      "jeux",
    ]);

    const content = screen.getByTestId("about-page-content");
    expect(content).toHaveAttribute(
      "data-counts",
      JSON.stringify(mocks.counts)
    );
    expect(content).toHaveAttribute(
      "data-module-ids",
      JSON.stringify({
        atlas: ["search"],
        dossiers: ["names"],
        jeux: ["quiz"],
      })
    );
    expect(content).toHaveAttribute("data-synthesis-ids", "BDI");
  });
});
