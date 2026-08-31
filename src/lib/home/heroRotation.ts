import {
  ACCESS_MODES,
  type AccessMode,
  type HeroPreviewKind,
} from "@/lib/hubs/moduleRegistry";
import type { HubModule } from "@/lib/hubs/moduleAvailability";

/**
 * The preview kinds the band is allowed to open on (REQ-115).
 *
 * The hero states a claim; it does not ask for a turn. A play loop in the
 * band spends the reader's first gesture on a round of a game they never
 * chose — and when its island fails to hydrate, the whole surface becomes a
 * dead affordance: four answer buttons that answer nothing, which is what
 * shipped. Ten of the thirteen heroable modules are games, so a uniform
 * draw over `heroable` opened on one better than three times in four.
 *
 * What is left is the set that reads without being touched: a mark that
 * states its claim by standing there. Games keep their route and their
 * shelf under Jouer, which is the axis for a reader who wants a turn.
 */
// @req REQ-115
export const HERO_SLOT_KINDS: HeroPreviewKind[] = [
  "globe",
  "family-crown",
  "migration-paths",
];

/**
 * The module the home's band opens on when the URL names none.
 *
 * The globe is the one preview that states its claim by standing there — it
 * needs no round, no scrub and no legend to be read. `pickHeroModule` still
 * falls back to the draw if this id is ever ineligible, so a registry edit
 * cannot blank the band.
 */
// @req REQ-115
export const DEFAULT_HERO_MODULE_ID = "mercator";

export interface HeroDrawOptions {
  /**
   * Forces one module by id. Three uses: keeping e2e/home-visual.spec.ts
   * deterministic, deep-linking a variant, and making design review
   * reproducible. A pin naming nothing eligible falls back to the draw
   * rather than blanking the band — a mistyped URL must not cost a reader
   * the hero, and neither must a hand-edited one smuggle a game past
   * HERO_SLOT_KINDS.
   */
  pin?: string;
  /** Injected for tests, as africaDots(step, random = Math.random) does. */
  random?: () => number;
}

/**
 * Which module the home's hero shows on this request (REQ-115).
 *
 * This file is deliberately random, in a repo that is deliberately not:
 * /fr/jouer/[jeu] derives its seed from the slug so a game round stays pure
 * and the page stays cacheable. Neither reason applies here. Variation *is*
 * the feature — the hero exists to show that the atlas holds more than one
 * module — and the home has no route cache to lose, since the root layout
 * already awaits connection() for the CSP nonce and the page reads
 * searchParams.
 * Where determinism is genuinely needed, the pin restores it exactly.
 *
 * The draw runs in a server component, so it never re-runs during
 * hydration and cannot desynchronise the client tree.
 *
 * Returns null when nothing is eligible; the caller keeps rendering the
 * globe, which is what the hero did before this slot existed.
 */
// @req REQ-114
// @req REQ-115
export function pickHeroModule(
  modulesByAxis: Record<AccessMode, HubModule[]>,
  options: HeroDrawOptions = {}
): HubModule | null {
  const { pin, random = Math.random } = options;

  const eligible = ACCESS_MODES.flatMap(
    (mode) => modulesByAxis[mode] ?? []
  ).filter(
    (module) =>
      module.heroable !== undefined &&
      HERO_SLOT_KINDS.includes(module.heroable) &&
      module.available
  );

  if (eligible.length === 0) return null;

  if (pin) {
    const pinned = eligible.find((module) => module.id === pin);
    if (pinned) return pinned;
  }

  const index = Math.min(
    eligible.length - 1,
    Math.floor(random() * eligible.length)
  );
  return eligible[index];
}
