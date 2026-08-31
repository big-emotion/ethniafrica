import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { HomeHero } from "@/components/home/HomeHero";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/components/atlas/ContinentGlobeStage", () => ({
  ContinentGlobeStage: ({
    peopleCountsByCountry,
  }: {
    peopleCountsByCountry?: Record<string, number>;
  }) => (
    <div
      data-testid="search-first-globe"
      data-people-count={peopleCountsByCountry?.NGA}
    />
  ),
}));

function follows(first: Element, second: Element): boolean {
  return Boolean(
    first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING
  );
}

function CounterFixture(): ReactNode {
  return <div data-testid="search-first-counts">Compteurs du corpus</div>;
}

// @req REQ-115
describe("search-first home charter (ETNI-1404 / ETNI-1509)", () => {
  // @req REQ-115
  it("opens on one band ordered copy and search, real globe, then counters", () => {
    const { container } = render(
      <HomeHero
        seedWords={undefined}
        peopleCountsByCountry={{ NGA: 40 }}
        counts={<CounterFixture />}
      />
    );

    const band = container.querySelector(".home-hero-inner");
    const copy = container.querySelector(".home-hero-copy");
    const search = screen.getByRole("search");
    const globe = screen.getByTestId("search-first-globe");
    const counts = screen.getByTestId("search-first-counts");

    if (!(band instanceof HTMLElement) || !(copy instanceof HTMLElement)) {
      throw new TypeError("The hero band and copy must be HTML elements");
    }

    expect(band).toContainElement(copy);
    expect(band).toContainElement(search);
    expect(band).toContainElement(globe);
    expect(band).toContainElement(counts);
    expect(follows(copy, globe)).toBe(true);
    expect(follows(globe, counts)).toBe(true);
    expect(globe).toHaveAttribute("data-people-count", "40");
  });

  // The globe component owns the capability probe, committed SVG fallback,
  // keyboard surface and reduced-motion path. The hero only places it.
  // @req REQ-115
  it("mounts the existing ContinentGlobeStage and retires the historical map", () => {
    render(<HomeHero />);

    expect(screen.getByTestId("search-first-globe")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.queryByText(/al-Idrisi/i)).not.toBeInTheDocument();

    const source = readFileSync(
      join(process.cwd(), "src/components/home/HomeHero.tsx"),
      "utf8"
    );
    expect(source).toContain(
      'import { ContinentGlobeStage } from "@/components/atlas/ContinentGlobeStage"'
    );
    expect(source).not.toContain("al-idrisi-1154.jpg");
  });

  // A compact content-sized stack is the mobile contract. At 1240px the
  // exact same document becomes two columns, with counters under the copy.
  // @req REQ-115
  it("is mobile-first and becomes the prescribed two-column grid at 1200px", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/home/HomeHero.tsx"),
      "utf8"
    );

    expect(source).toMatch(
      /\.home-hero-inner\s*\{[^}]*display:\s*grid[^}]*grid-template-areas:\s*"copy"\s*"globe"\s*"counts"/
    );
    expect(source).toMatch(
      /@media\s*\(min-width:\s*1200px\)[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)\s*minmax\(0,\s*1fr\)[\s\S]*?grid-template-areas:\s*"copy globe"\s*"counts globe"/
    );
    expect(source).toMatch(
      /\.home-hero-globe\s+\.home-globe-stage\s*\{[^}]*min-height:\s*320px[^}]*--afh-globe-stage-height:\s*320px/
    );
  });

  // Viewport-height floors made the globe miss the first screen on a phone.
  // This band grows from its contents and contains no hard-coded palette.
  // @req REQ-115
  it("uses neither viewport-sized bands nor colour literals", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/home/HomeHero.tsx"),
      "utf8"
    );

    expect(source).not.toMatch(/\b(?:dvh|svh|vh)\b|min-h-screen/);
    expect(source).not.toMatch(/#[0-9a-f]{3,8}\b|\brgba?\s*\(|\bhsla?\s*\(/i);
  });
});
