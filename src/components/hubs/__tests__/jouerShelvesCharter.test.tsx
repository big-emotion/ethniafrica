import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AccessModeHub } from "@/components/hubs/AccessModeHub";
import { getGroupedModules } from "@/lib/hubs/moduleGroups";
import { getModuleHref } from "@/lib/hubs/moduleHref";
import {
  ACCESS_MODES,
  getModulesForAccessMode,
  isModuleEnabled,
  type AccessMode,
} from "@/lib/hubs/moduleRegistry";
import type { HubModule } from "@/lib/hubs/moduleAvailability";

/**
 * Charter contract for the entry points (atlas-charter.md §3).
 *
 * Two of its rules failed silently for a release and this file is what
 * catches them next time:
 *
 * 1. "A module with no resolvable route renders as Bientôt." The clause used
 *    to ask about `page` being null, which was the same question until
 *    REQ-120 addressed eleven games by slug with `page: null` on purpose.
 *    The home rendered all eleven as Bientôt while the hub linked all
 *    eleven, and both were arguably conformant.
 * 2. "Shelves nest, they never hide." Grouping is what let the panel come
 *    back to four nodes; the day it starts dropping a module instead of
 *    nesting it, the menu asserts something absent from the corpus.
 */

/** What the surfaces are handed: a dark flag drops a module upstream. */
const liveModules = (mode: AccessMode): HubModule[] =>
  getModulesForAccessMode(mode)
    .filter(
      (definition) =>
        definition.availability !== "flagged" || isModuleEnabled(definition)
    )
    .map((definition) => ({ ...definition, available: true }));

describe("atlas charter §3 — the three entry points", () => {
  // @req REQ-114
  it("resolves a route for every module the corpus actually carries", () => {
    for (const mode of ACCESS_MODES) {
      for (const entry of liveModules(mode)) {
        expect(getModuleHref(entry, "fr")).not.toBeNull();
      }
    }
  });

  // The rule the old wording could not express: a game is addressed by
  // slug and carries no page, and that is a resolvable route.
  // @req REQ-114
  it("counts a slug as a route, not as an absent one", () => {
    const games = liveModules("jouer").filter((entry) => entry.gameSlug);

    expect(games.length).toBeGreaterThan(0);
    for (const game of games) {
      expect(game.page).toBeNull();
      expect(getModuleHref(game, "fr")).toBe(`/fr/jouer/${game.gameSlug}`);
    }
  });

  // @req REQ-120
  it("keeps every shelved module on the hub, under a heading of its own", () => {
    const modules = liveModules("jouer");
    render(<AccessModeHub language="fr" mode="jouer" modules={modules} />);

    const shelved = getGroupedModules(modules).flatMap(
      (shelf) => shelf.modules
    );
    expect(shelved.map((entry) => entry.id).sort()).toEqual(
      modules.map((entry) => entry.id).sort()
    );
    for (const entry of modules) {
      expect(screen.getByTestId(`hub-module-${entry.id}`)).toBeInTheDocument();
    }
  });

  // A shelf that told the reader nothing about its size would be hiding
  // rather than nesting.
  // @req REQ-120
  it("makes every shelf declare how much it holds", () => {
    const shelves = getGroupedModules(liveModules("jouer"));

    expect(shelves.length).toBeGreaterThan(0);
    for (const shelf of shelves) {
      expect(shelf.modules.length).toBeGreaterThan(0);
      expect(shelf.singleton).toBe(shelf.modules.length === 1);
    }
  });
});
