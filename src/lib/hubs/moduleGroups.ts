import {
  MODULE_GROUP_ORDER,
  type ModuleGroupId,
} from "@/lib/hubs/moduleRegistry";

/** The least a module must declare to be filed. */
interface Fileable {
  group?: ModuleGroupId;
}

export interface ModuleShelf<T extends Fileable> {
  id: ModuleGroupId;
  modules: T[];
  /**
   * True when the shelf holds one module.
   *
   * Read by a surface where opening a shelf costs a click and offers no
   * choice — there, the module is rendered in its place. The header panel does
   * not consult it: a rubric there is a heading, not a link, so a rubric of one
   * costs nothing and dropping it would leave that dossier floating beside the
   * filed ones with no domain of its own.
   */
  singleton: boolean;
}

/**
 * The modules handed to one surface, filed onto their shelves.
 *
 * Generic over what it files because two kinds of module reach it: the hub's
 * probed `HubModule`, and the header's bare `HubModuleDefinition` — the header
 * is a client component under a client layout, so it never holds a probe
 * result and resolves offering per entry instead (`isModuleOffered`).
 *
 * Returns an empty array for a surface whose modules carry no shelf, so a
 * caller can file and fall back to a flat list with one expression.
 *
 * Shelves left empty are dropped rather than rendered as a heading over
 * nothing: a module can disappear upstream behind an empty table, and the last
 * one to go must take its shelf with it.
 */
// @req REQ-120
export function getGroupedModules<T extends Fileable>(
  modules: T[]
): ModuleShelf<T>[] {
  const byGroup = new Map<ModuleGroupId, T[]>();

  for (const hubModule of modules) {
    if (!hubModule.group) continue;
    const shelf = byGroup.get(hubModule.group);
    if (shelf) shelf.push(hubModule);
    else byGroup.set(hubModule.group, [hubModule]);
  }

  if (byGroup.size === 0) return [];

  // MODULE_GROUP_ORDER, not first-seen order: the shelves read in the same
  // sequence whatever the corpus happens to hold today.
  return MODULE_GROUP_ORDER.filter((id) => byGroup.has(id)).map((id) => ({
    id,
    modules: byGroup.get(id) ?? [],
    singleton: (byGroup.get(id) ?? []).length === 1,
  }));
}
