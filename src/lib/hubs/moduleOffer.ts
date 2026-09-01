import type { HubModuleDefinition } from "@/lib/hubs/moduleRegistry";

/**
 * Whether a module is *offered*, resolved synchronously from what the calling
 * surface happens to hold.
 *
 * The charter (§3) splits one question in two: a module is *listed* because it
 * exists, and *clickable* because what sits behind the click is worth the
 * reader's trip. `isModuleAvailable` answers the second, but it is async — one
 * half of it is a row count — and that is exactly why the header never asked
 * it. `SiteHeader` is a client component under a client `PageLayout`, so it
 * resolved clickability from `getModuleHref` alone, which only ever answers
 * "does this route exist". The result was three surfaces disagreeing about the
 * same module: the home constellation and `/fr/dossiers` marked _Premiers
 * repères de migrations_ **Bientôt** while the menu above them linked it.
 *
 * So the measured half is passed in as a map and the declared half is computed
 * here, and every surface — server or client, with a probe result or without —
 * runs the same ordering.
 */

/** Module id → whether its corpus answered (see `getModuleAvailabilityMap`). */
export type ModuleAvailabilityMap = Record<string, boolean>;

/** What the resolvers need of a definition. */
type ReadinessInputs = Pick<HubModuleDefinition, "editorialReadiness">;

/**
 * The half of availability that is declared rather than measured, and which
 * therefore holds identically on every machine and in every runtime.
 *
 * Shared by the async server resolver and the sync one below so the ordering
 * lives in one place: a declaration no table can overturn, checked first.
 */
// @req REQ-114
export function isModuleDeclaredReady(definition: ReadinessInputs): boolean {
  return definition.editorialReadiness !== "draft";
}

// @req REQ-106
export function isModuleOffered(
  definition: ReadinessInputs & { id: string },
  availability?: ModuleAvailabilityMap | null
): boolean {
  // Declared beats measured, both here and in `isModuleAvailable`: a probe
  // that found rows must not talk a module its editor called unready back
  // into the menu.
  if (!isModuleDeclaredReady(definition)) return false;

  // No entry means no probe result reached this surface — Storybook, a unit
  // test, any tree rendered without the server layout above it. Answering the
  // declared half is the only honest thing left, and it errs towards offering
  // a built route rather than towards hiding the site behind a missing
  // provider.
  return availability?.[definition.id] ?? true;
}
