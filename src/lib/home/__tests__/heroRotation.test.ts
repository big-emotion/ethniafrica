import { describe, expect, it } from "vitest";
import {
  DEFAULT_HERO_MODULE_ID,
  pickHeroModule,
} from "@/lib/home/heroRotation";
import type { HubModule } from "@/lib/hubs/moduleAvailability";
import type { AccessMode } from "@/lib/hubs/moduleRegistry";

const hubModule = (overrides: Partial<HubModule>): HubModule => ({
  id: "x",
  name: "X",
  accessMode: "jeux",
  page: null,
  availability: "data",
  available: true,
  ...overrides,
});

const byAxis = (modules: HubModule[]): Record<AccessMode, HubModule[]> => ({
  atlas: modules.filter((m) => m.accessMode === "atlas"),
  dossiers: modules.filter((m) => m.accessMode === "dossiers"),
  jeux: modules.filter((m) => m.accessMode === "jeux"),
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
        hubModule({ id: "mercator", heroable: "globe" }),
      ]),
      { random: first }
    );

    expect(drawn?.id).toBe("mercator");
  });

  // @req REQ-114
  it("never draws a module the corpus cannot fill", () => {
    const drawn = pickHeroModule(
      byAxis([
        hubModule({ id: "liens", heroable: "globe", available: false }),
        hubModule({ id: "mercator", heroable: "globe" }),
      ]),
      { random: first }
    );

    expect(drawn?.id).toBe("mercator");
  });

  // @req REQ-114
  it("reaches every eligible module, across all three axes", () => {
    const modules = byAxis([
      hubModule({
        id: "familles",
        accessMode: "atlas",
        heroable: "globe",
      }),
      hubModule({
        id: "frise",
        accessMode: "dossiers",
        heroable: "globe",
      }),
      hubModule({ id: "mercator", heroable: "globe" }),
    ]);

    expect(pickHeroModule(modules, { random: first })?.id).toBe("familles");
    expect(pickHeroModule(modules, { random: last })?.id).toBe("mercator");
  });

  // @req REQ-114
  it("honours a pin, whatever the draw would have returned", () => {
    const drawn = pickHeroModule(
      byAxis([
        hubModule({ id: "mercator", heroable: "globe" }),
        hubModule({ id: "liens", heroable: "globe" }),
      ]),
      { pin: "liens", random: first }
    );

    expect(drawn?.id).toBe("liens");
  });

  // @req REQ-114
  it("falls back to the draw when a pin names no eligible module", () => {
    const drawn = pickHeroModule(
      byAxis([hubModule({ id: "mercator", heroable: "globe" })]),
      { pin: "does-not-exist", random: first }
    );

    expect(drawn?.id).toBe("mercator");
  });

  // The band is a claim the reader reads, not a turn the reader takes.
  // @req REQ-115
  it("never draws a game, whichever axis it sits on", () => {
    const drawn = pickHeroModule(
      byAxis([
        hubModule({ id: "appellations", heroable: "game" }),
        hubModule({ id: "repartition", heroable: "game" }),
        hubModule({ id: "mercator", heroable: "globe" }),
      ]),
      { random: first }
    );

    expect(drawn?.id).toBe("mercator");
  });

  // @req REQ-115
  it("refuses a pin naming a game rather than opening a play loop", () => {
    const drawn = pickHeroModule(
      byAxis([
        hubModule({ id: "mercator", heroable: "globe" }),
        hubModule({ id: "appellations", heroable: "game" }),
      ]),
      { pin: "appellations", random: first }
    );

    expect(drawn?.id).toBe("mercator");
  });

  // @req REQ-115
  it("returns null when every heroable module is a game", () => {
    expect(
      pickHeroModule(
        byAxis([hubModule({ id: "appellations", heroable: "game" })]),
        { random: first }
      )
    ).toBeNull();
  });

  // @req REQ-115
  it("still draws the two contemplative previews beside the globe", () => {
    const modules = byAxis([
      hubModule({
        id: "familles",
        accessMode: "atlas",
        heroable: "family-crown",
      }),
      hubModule({
        id: "frise",
        accessMode: "dossiers",
        heroable: "migration-paths",
      }),
      hubModule({ id: "mercator", heroable: "globe" }),
    ]);

    expect(pickHeroModule(modules, { random: first })?.id).toBe("familles");
    expect(pickHeroModule(modules, { random: last })?.id).toBe("mercator");
  });

  // @req REQ-114
  it("returns null when nothing is eligible, so the caller can keep the globe", () => {
    expect(
      pickHeroModule(byAxis([hubModule({ id: "recherche" })]), {
        random: first,
      })
    ).toBeNull();
  });

  /**
   * The home pins this id, so the band is the same on every arrival. A draw
   * would give a reader who came twice two different sites, and one who came
   * once no way to tell the band was a sample at all.
   */
  // @req REQ-115
  it("names a module the band can actually open on", () => {
    const modules = byAxis([
      hubModule({
        id: "familles",
        accessMode: "atlas",
        heroable: "family-crown",
      }),
      hubModule({ id: DEFAULT_HERO_MODULE_ID, heroable: "globe" }),
    ]);

    // Whatever the draw would have said, the pin wins — both ends of it.
    expect(
      pickHeroModule(modules, { pin: DEFAULT_HERO_MODULE_ID, random: first })
        ?.id
    ).toBe(DEFAULT_HERO_MODULE_ID);
    expect(
      pickHeroModule(modules, { pin: DEFAULT_HERO_MODULE_ID, random: last })?.id
    ).toBe(DEFAULT_HERO_MODULE_ID);
  });

  // @req REQ-115
  it("still falls back to the draw if the pinned module ever stops being eligible", () => {
    const withoutTheDefault = byAxis([
      hubModule({
        id: "familles",
        accessMode: "atlas",
        heroable: "family-crown",
      }),
    ]);

    expect(
      pickHeroModule(withoutTheDefault, {
        pin: DEFAULT_HERO_MODULE_ID,
        random: first,
      })?.id
    ).toBe("familles");
  });
});
