"use client";

import type { ComponentType } from "react";
import { HomeGlobeStage } from "@/components/home/HomeGlobeStage";

/**
 * The renderable half of a heroable module (REQ-115). The registry carries
 * only the flag, because it is imported by server code and a preview is a
 * `dynamic(..., { ssr: false })` island, which Next permits only inside a
 * Client Component — this file is that client boundary.
 *
 * Every entry is wrapped **once, here, at module scope**. Calling dynamic()
 * during render would mint a new component identity on every pass and
 * remount the island under the reader.
 *
 * Only "standalone" modules appear here. A module filed as "game" is
 * rendered by HeroModuleStage through GamePlayHost, which is already the
 * boundary /fr/jouer/[jeu] uses — so eleven games need no entry at all.
 *
 * mercator is HomeGlobeStage verbatim rather than a re-wrap: it already
 * runs its own ssr:false import and its own WebGL capability probe, and its
 * fallback and its island already share .home-globe-stage's heights. That
 * shared height is the contract every entry owes — the fallback shown
 * during SSR and the island that replaces it must occupy the same box, or
 * the swap shifts the page under the reader.
 *
 * Keys are module ids from MODULE_DEFINITIONS. heroPreviews.test.tsx fails
 * the build if this map and the registry's standalone set ever disagree.
 */
// @req REQ-115
export const HERO_PREVIEWS: Record<string, ComponentType> = {
  mercator: HomeGlobeStage,
};
