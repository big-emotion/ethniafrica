import { describe, expect, it } from "vitest";
import { HERO_PREVIEWS } from "@/components/home/heroPreviews";
import { MODULE_DEFINITIONS } from "@/lib/hubs/moduleRegistry";
import { GAME_SLUGS } from "@/lib/games/gameRegistry";

const heroable = MODULE_DEFINITIONS.filter((def) => def.heroable);
const standalone = heroable.filter((def) => def.heroable === "standalone");
const games = heroable.filter((def) => def.heroable === "game");

// A module declaring a path it cannot take renders an empty band, and a
// preview no module claims is dead code the draw can never reach. Same
// guard gameRegistry.test.ts puts on hub entries pointing at game slugs.
describe("hero preview registry parity", () => {
  // @req REQ-115
  it("gives every standalone module a preview", () => {
    const missing = standalone
      .map((def) => def.id)
      .filter((id) => !(id in HERO_PREVIEWS));
    expect(missing).toEqual([]);
  });

  // @req REQ-115
  it("claims a standalone module for every preview", () => {
    const claimed = standalone.map((def) => def.id);
    const orphans = Object.keys(HERO_PREVIEWS).filter(
      (id) => !claimed.includes(id)
    );
    expect(orphans).toEqual([]);
  });

  // @req REQ-115
  it("points every heroable game at a registered slug", () => {
    const unregistered = games
      .map((def) => def.gameSlug)
      .filter((slug) => !slug || !GAME_SLUGS.includes(slug));
    expect(unregistered).toEqual([]);
  });

  // A game preview is the play loop, which needs rounds; a standalone one
  // is looked up by id. Declaring "game" without a slug would take neither
  // path and leave the band empty.
  // @req REQ-115
  it("never files a slug-less module as a game", () => {
    expect(games.filter((def) => !def.gameSlug)).toEqual([]);
  });

  // @req REQ-115
  it("keeps the lot large enough for the band to actually rotate", () => {
    expect(heroable.length).toBeGreaterThan(1);
  });
});
