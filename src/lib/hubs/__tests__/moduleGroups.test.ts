import { describe, expect, it } from "vitest";

import { getGroupedModules } from "@/lib/hubs/moduleGroups";
import {
  MODULE_GROUP_ORDER,
  getModulesForAccessMode,
  type AccessMode,
  type HubModuleDefinition,
} from "@/lib/hubs/moduleRegistry";
import { hubsCopy } from "@/lib/i18n/copy/hubs";
import { LOCALES } from "@/lib/locale";
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
    const shelves = getGroupedModules(liveModules("jeux"));

    expect(shelves.map((shelf) => shelf.id)).toEqual([
      "jeux-pays",
      "jeux-quiz",
    ]);
    expect(shelves.flatMap((shelf) => shelf.modules.map((m) => m.id))).toEqual([
      "mercator",
      "quiz",
    ]);
  });

  // A shelf holding one module is not a shelf *where opening it costs a click*.
  // Both Jouer shelves hold one since the charter's second cut, which is why
  // that hub reads as a flat row of cards. The header panel does not consult
  // this flag — see ModuleShelf.singleton.
  // @req REQ-120
  it("marks a shelf that holds a single module as one to skip past", () => {
    const shelves = getGroupedModules(liveModules("jeux"));
    const bySize = Object.fromEntries(
      shelves.map((shelf) => [shelf.id, shelf.singleton])
    );

    expect(bySize["jeux-pays"]).toBe(true);
    expect(bySize["jeux-quiz"]).toBe(true);
  });

  /**
   * The rubrics of the dossiers axis, and the reason this file changed.
   *
   * Eleven dossiers were drawn as one flat row — ten of them **Bientôt**, four
   * of them about the Congo — so the axis read as a site about one country.
   * Filing by domain scatters those four across Organisation and Religions,
   * which is what a rubric is for: the reader meets a subject, not a wave of
   * publication.
   *
   * Pinned member by member rather than counted, because a dossier silently
   * landing in the wrong rubric is the failure a count cannot see.
   */
  /**
   * The four surfaces of the dossiers axis, filed by domain.
   *
   * Four, not eleven: the seven Réalités dossiers left the registry for the
   * corpus, so what remains here is a pillar, a bank, a map and a static page.
   * The corpus half of the same filing is pinned in `dossiers/__tests__/menu`.
   */
  // @req REQ-120
  it("files the axis's own surfaces under domain rubrics, in order", () => {
    const shelves = getGroupedModules(liveModules("dossiers"));

    expect(
      shelves.map((shelf) => [shelf.id, shelf.modules.map((m) => m.id)])
    ).toEqual([
      ["dossiers-noms", ["nommer", "anecdotes"]],
      ["dossiers-organisation", ["regards-colonisation"]],
      ["dossiers-populations", ["frise"]],
    ]);
  });

  // Every module of the axis is filed. One carrying no rubric would vanish
  // from a filed panel entirely, which is a worse failure than the flat row
  // this replaced — the reader would never learn the surface exists.
  // @req REQ-120
  it("leaves no dossier-axis module without a rubric", () => {
    const unfiled = getModulesForAccessMode("dossiers").filter(
      (definition) => !definition.group
    );

    expect(unfiled.map((definition) => definition.id)).toEqual([]);
  });

  // Explorer holds five entry points and a search: few enough to read at once,
  // so nothing is filed and that surface stays flat.
  // @req REQ-120
  it("leaves an axis whose modules carry no shelf ungrouped", () => {
    expect(getGroupedModules(liveModules("atlas"))).toEqual([]);
  });

  // A shelf whose modules were all dropped upstream — a dark feature flag,
  // an empty table — must not leave an empty heading behind.
  // @req REQ-120
  it("drops a shelf left with nothing on it", () => {
    const onlyTheQuiz = asModules(
      getModulesForAccessMode("jeux").filter((m) => m.id === "quiz")
    );

    expect(getGroupedModules(onlyTheQuiz).map((s) => s.id)).toEqual([
      "jeux-quiz",
    ]);
  });

  // Asserted in both locales, which the French-only label on the registry
  // could not do: a rubric heading is reader-facing copy, and an English
  // reader met a French heading over English dossier titles.
  // @req REQ-120 @req REQ-145
  it("names every shelf for the reader, in every published locale", () => {
    for (const language of LOCALES) {
      for (const id of MODULE_GROUP_ORDER) {
        const label = hubsCopy[language].moduleGroupNames[id];

        expect(label).toMatch(/^\S/);
        expect(label.length).toBeGreaterThan(2);
      }
    }
  });
});
