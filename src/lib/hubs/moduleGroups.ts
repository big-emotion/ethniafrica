import {
  MODULE_GROUPS,
  type ModuleGroup,
  type ModuleGroupId,
} from "@/lib/hubs/moduleRegistry";
import type { HubModule } from "@/lib/hubs/moduleAvailability";

export interface ModuleShelf {
  group: ModuleGroup;
  modules: HubModule[];
  /**
   * True when the shelf holds one module. Opening it would cost a click and
   * offer no choice, so the panel renders the module in its place.
   */
  singleton: boolean;
}

/**
 * The modules of one access mode, filed onto their shelves.
 *
 * Returns an empty array for an axis whose modules carry no shelf — which
 * is every axis but Jouer. Explorer holds four modules and Comprendre
 * three: few enough to read at once, so a level between the axis and them
 * would only add a click.
 *
 * Shelves left empty are dropped rather than rendered as a heading over
 * nothing: a module can disappear upstream behind a dark feature flag or an
 * empty table, and the last one to go must take its shelf with it.
 */
// @req REQ-120
export function getGroupedModules(modules: HubModule[]): ModuleShelf[] {
  const byGroup = new Map<ModuleGroupId, HubModule[]>();

  for (const hubModule of modules) {
    if (!hubModule.group) continue;
    const shelf = byGroup.get(hubModule.group);
    if (shelf) shelf.push(hubModule);
    else byGroup.set(hubModule.group, [hubModule]);
  }

  if (byGroup.size === 0) return [];

  // MODULE_GROUPS declaration order, not first-seen order: the shelves read
  // in the same sequence whatever the corpus happens to hold today.
  return (Object.keys(MODULE_GROUPS) as ModuleGroupId[])
    .filter((id) => byGroup.has(id))
    .map((id) => ({
      group: MODULE_GROUPS[id],
      modules: byGroup.get(id) ?? [],
      singleton: (byGroup.get(id) ?? []).length === 1,
    }));
}
