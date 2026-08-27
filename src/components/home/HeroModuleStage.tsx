"use client";

import { HERO_PREVIEWS } from "@/components/home/heroPreviews";
import { HomeGlobeStage } from "@/components/home/HomeGlobeStage";

export interface HeroModuleStageProps {
  /** A module id from MODULE_DEFINITIONS, drawn by pickHeroModule. */
  moduleId: string;
}

/**
 * Resolves the drawn module to its preview (REQ-115). The client boundary
 * lives here rather than in HomeHero so the hero itself stays a server
 * component: only the preview lookup needs to be client-side, because the
 * previews are `ssr:false` islands.
 *
 * An id with no preview falls back to the globe rather than leaving the
 * band empty. heroPreviews.test.tsx makes that state unreachable — the
 * registry's heroable set and this map cannot drift — so the branch is
 * defence in depth, not a behaviour anyone should rely on.
 */
// @req REQ-115
export function HeroModuleStage({ moduleId }: HeroModuleStageProps) {
  const Preview = HERO_PREVIEWS[moduleId] ?? HomeGlobeStage;
  return <Preview />;
}

export default HeroModuleStage;
