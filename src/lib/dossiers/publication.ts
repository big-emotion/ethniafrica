import { LOCALES } from "@/lib/locale";
import { isModulePublished } from "@/lib/hubs/moduleOffer";
import { MODULE_DEFINITIONS } from "@/lib/hubs/moduleRegistry";
import { getLocalizedRoute } from "@/lib/routing";

/**
 * Every dossier slug the routing table can produce, in every locale, mapped
 * back to the module that declares it.
 *
 * Derived rather than transcribed. The Réalités dossiers carry a different
 * slug per locale — `royaume-kongo` and `kongo-kingdom` are one module — and a
 * hand-kept list would have frozen one of the two and served the other, which
 * is the failure mode this map exists to make impossible.
 */
const MODULE_ID_BY_SLUG = new Map<string, string>(
  MODULE_DEFINITIONS.filter(
    (module) => module.accessMode === "dossiers" && module.page !== null
  ).flatMap((module) =>
    LOCALES.map((locale): [string, string] => [
      getLocalizedRoute(locale, module.page).split("/").pop(),
      module.id,
    ])
  )
);

/**
 * Whether the dossier reached by this slug may be served.
 *
 * A slug no module declares is withheld, not served: on this segment that is
 * either a reader guessing at a URL or a dossier fiche that shipped without a
 * registry entry, and neither is a page to publish.
 */
// @req REQ-113
export function isDossierSlugPublished(slug: string): boolean {
  const moduleId = MODULE_ID_BY_SLUG.get(slug);
  return moduleId ? isModulePublished(moduleId) : false;
}
