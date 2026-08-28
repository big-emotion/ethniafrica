import { describe, expect, it } from "vitest";

import { getGroupedModules } from "@/lib/hubs/moduleGroups";
import {
  MODULE_GROUPS,
  getModulesForAccessMode,
  type AccessMode,
  type HubModuleDefinition,
} from "@/lib/hubs/moduleRegistry";
import type { HubModule } from "@/lib/hubs/moduleAvailability";

const asModules = (definitions: HubModuleDefinition[]): HubModule[] =>
  definitions.map((definition) => ({ ...definition, available: true }));

/**
 * What the surfaces are actually handed. `getHubModules` drops nothing now:
 * it used to remove a module behind a dark flag, which is how the quiz shelf
 * went missing from a build that had simply not been given a variable.
 */
const liveModules = (mode: AccessMode): HubModule[] =>
  asModules(getModulesForAccessMode(mode));

describe("moduleGroups — the shelf a module sits on (REQ-120)", () => {
  // Grouping is by the corpus entity a game questions — see
  // docs/design/games-charter.md §1. The quiz shelf is here because the quiz
  // is; it used to vanish with an unset environment variable.
  // @req REQ-120
  it("files every jouer module onto a shelf, in registry order", () => {
    const shelves = getGroupedModules(liveModules("jouer"));

    expect(shelves.map((shelf) => shelf.group.id)).toEqual([
      "jeux-peuples",
      "jeux-pays",
      "jeux-quiz",
    ]);
    expect(shelves.flatMap((shelf) => shelf.modules.map((m) => m.id))).toEqual([
      "appellations",
      "mercator",
      "pays-davant",
      "quiz",
    ]);
  });

  // A shelf holding one module is not a shelf: opening it would cost a
  // click and offer no choice. The panel renders it as its module instead.
  // @req REQ-120
  it("marks a shelf that holds a single module as one to skip past", () => {
    const shelves = getGroupedModules(liveModules("jouer"));
    const bySize = Object.fromEntries(
      shelves.map((shelf) => [shelf.group.id, shelf.singleton])
    );

    expect(bySize["jeux-peuples"]).toBe(true);
    expect(bySize["jeux-pays"]).toBe(false);
  });

  // Explorer and Comprendre hold four and three: few enough to read at
  // once, so nothing is filed and both surfaces stay flat.
  // @req REQ-120
  it("leaves an axis whose modules carry no shelf ungrouped", () => {
    expect(getGroupedModules(liveModules("explorer"))).toEqual([]);
    expect(getGroupedModules(liveModules("comprendre"))).toEqual([]);
  });

  // A shelf whose modules were all dropped upstream — a dark feature flag,
  // an empty table — must not leave an empty heading behind.
  // @req REQ-120
  it("drops a shelf left with nothing on it", () => {
    const onlyAppellations = asModules(
      getModulesForAccessMode("jouer").filter((m) => m.id === "appellations")
    );

    expect(getGroupedModules(onlyAppellations).map((s) => s.group.id)).toEqual([
      "jeux-peuples",
    ]);
  });

  // @req REQ-120
  it("names every shelf for the reader, not for the table behind it", () => {
    for (const group of Object.values(MODULE_GROUPS)) {
      expect(group.label).toMatch(/^\S/);
      expect(group.label.length).toBeGreaterThan(2);
    }
  });
});
