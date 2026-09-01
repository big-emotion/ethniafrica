import { getAxisHubRoute } from "@/lib/hubs/axisRoutes";
import { getLocalizedRoute, type PageType } from "@/lib/routing";
import type { Language } from "@/types/shared";

/**
 * Where a hub module's click lands.
 *
 * Both surfaces that list modules — the hub page and the home axis panel —
 * read this. They used to each resolve the href themselves, and that
 * duplication is exactly what drifted: REQ-120 made the games addressable
 * by slug, the hub learnt the new rule and the panel never did, so the home
 * rendered eleven live games as "Bientôt" while the hub linked all eleven.
 * One resolver is what stops the two from disagreeing again.
 */
// @req REQ-114
export function getModuleHref(
  module: { page?: PageType | null; gameSlug?: string },
  language: Language
): string | null {
  // A game has no PageType of its own — keeping PageType a closed union is
  // why it is addressed by slug — so the slug wins over any page. The axis
  // segment above it still comes from the slug table, not from this string.
  if (module.gameSlug)
    return `${getAxisHubRoute(language, "jeux")}/${module.gameSlug}`;
  if (module.page) return getLocalizedRoute(language, module.page);
  return null;
}
