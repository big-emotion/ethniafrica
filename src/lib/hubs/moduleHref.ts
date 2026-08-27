import { getLocalizedRoute } from "@/lib/routing";
import type { HubModuleDefinition } from "@/lib/hubs/moduleRegistry";
import type { Language } from "@/types/shared";

/**
 * Where a hub module lives. Extracted from AccessModeHub, which resolved it
 * inline, once the home's hero slot needed the same answer to label the
 * module it drew. Two copies of this rule is the drift isModuleEnabled's own
 * comment warns about: the hub and the home would disagree about a module's
 * address the first time a game changed its slug.
 *
 * A game has no PageType of its own — it is addressed by slug under the
 * Jouer hub — so the slug wins over any page. `null` means the module is not
 * addressable, and a caller must render it as unavailable rather than link
 * to a route that does not resolve.
 */
// @req REQ-114
export function moduleHref(
  language: Language,
  module: Pick<HubModuleDefinition, "page" | "gameSlug">
): string | null {
  if (module.gameSlug) return `/${language}/jouer/${module.gameSlug}`;
  if (module.page) return getLocalizedRoute(language, module.page);
  return null;
}
