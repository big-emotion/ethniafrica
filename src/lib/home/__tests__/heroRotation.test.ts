import { describe, expect, it } from "vitest";
import { pickHeroModule } from "@/lib/home/heroRotation";
import type { HubModule } from "@/lib/hubs/moduleAvailability";
import type { AccessMode } from "@/lib/hubs/moduleRegistry";

const hubModule = (overrides: Partial<HubModule>): HubModule => ({
  id: "x",
  name: "X",
  accessMode: "jouer",
  page: null,
  availability: "data",
  available: true,
  ...overrides,
});

const byAxis = (modules: HubModule[]): Record<AccessMode, HubModule[]> => ({
  explorer: modules.filter((m) => m.accessMode === "explorer"),
  comprendre: modules.filter((m) => m.accessMode === "comprendre"),
  jouer: modules.filter((m) => m.accessMode === "jouer"),
});

// A draw that always lands on the first eligible module, so the tests assert
// the filtering rather than the arithmetic.
const first = () => 0;
// ...and one that lands on the last, to prove the whole set is reachable.
const last = () => 0.999999;

describe("pickHeroModule", () => {
  // @req REQ-114
  it("draws only from modules the registry marks heroable", () => {
    const drawn = pickHeroModule(
      byAxis([
        hubModule({ id: "recherche" }),
        hubModule({ id: "mercator", heroable: true }),
      ]),
      { random: first }
    );

    expect(drawn?.id).toBe("mercator");
  });

  // @req REQ-114
  it("never draws a module the corpus cannot fill", () => {
    const drawn = pickHeroModule(
      byAxis([
        hubModule({ id: "liens", heroable: true, available: false }),
        hubModule({ id: "mercator", heroable: true }),
      ]),
      { random: first }
    );

    expect(drawn?.id).toBe("mercator");
  });

  // @req REQ-114
  it("reaches every eligible module, across all three axes", () => {
    const modules = byAxis([
      hubModule({ id: "familles", accessMode: "explorer", heroable: true }),
      hubModule({ id: "frise", accessMode: "comprendre", heroable: true }),
      hubModule({ id: "mercator", heroable: true }),
    ]);

    expect(pickHeroModule(modules, { random: first })?.id).toBe("familles");
    expect(pickHeroModule(modules, { random: last })?.id).toBe("mercator");
  });

  // @req REQ-114
  it("honours a pin, whatever the draw would have returned", () => {
    const drawn = pickHeroModule(
      byAxis([
        hubModule({ id: "mercator", heroable: true }),
        hubModule({ id: "liens", heroable: true }),
      ]),
      { pin: "liens", random: first }
    );

    expect(drawn?.id).toBe("liens");
  });

  // @req REQ-114
  it("falls back to the draw when a pin names no eligible module", () => {
    const drawn = pickHeroModule(
      byAxis([hubModule({ id: "mercator", heroable: true })]),
      { pin: "does-not-exist", random: first }
    );

    expect(drawn?.id).toBe("mercator");
  });

  // @req REQ-114
  it("returns null when nothing is eligible, so the caller can keep the globe", () => {
    expect(
      pickHeroModule(byAxis([hubModule({ id: "recherche" })]), {
        random: first,
      })
    ).toBeNull();
  });
});
