import { ACCESS_MODES, type AccessMode } from "@/lib/hubs/moduleRegistry";
import type { HubModule } from "@/lib/hubs/moduleAvailability";

export interface HeroDrawOptions {
  /**
   * Forces one module by id. Three uses: keeping e2e/home-visual.spec.ts
   * deterministic, deep-linking a variant, and making design review
   * reproducible. A pin naming nothing eligible falls back to the draw
   * rather than blanking the band — a mistyped URL must not cost a reader
   * the hero.
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
 * already reads headers() for the CSP nonce and the page reads searchParams.
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
  ).filter((module) => module.heroable !== undefined && module.available);

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
