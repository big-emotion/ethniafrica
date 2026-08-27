import { describe, expect, it } from "vitest";
import { HERO_PREVIEWS } from "@/components/home/heroPreviews";
import { MODULE_DEFINITIONS } from "@/lib/hubs/moduleRegistry";

const heroableIds = MODULE_DEFINITIONS.filter((def) => def.heroable).map(
  (def) => def.id
);

describe("hero preview registry parity", () => {
  // A heroable module with no preview renders an empty stage, and a preview
  // no module claims is dead code the draw can never reach. Same guard
  // gameRegistry.test.ts puts on hub entries pointing at game slugs.
  // @req REQ-115
  it("gives every heroable module a preview", () => {
    const missing = heroableIds.filter((id) => !(id in HERO_PREVIEWS));
    expect(missing).toEqual([]);
  });

  // @req REQ-115
  it("claims a module for every preview", () => {
    const orphans = Object.keys(HERO_PREVIEWS).filter(
      (id) => !heroableIds.includes(id)
    );
    expect(orphans).toEqual([]);
  });

  // @req REQ-115
  it("keeps at least one module heroable, so the slot is never empty", () => {
    expect(heroableIds.length).toBeGreaterThan(0);
  });
});
