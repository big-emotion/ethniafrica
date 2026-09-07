import { getDossierBySlug } from "@/lib/dossiers/corpus";

/**
 * Whether the dossier reached by this slug may be served.
 *
 * Read off the dossier itself. It used to be read off the module registry:
 * every dossier declared a module, the module declared `editorialReadiness`,
 * and withdrawing a reading meant editing a TypeScript file that describes
 * menus. Readiness is a property of the dossier, so the dossier carries it.
 *
 * The slug reaching this function is always the French one, in both locales:
 * an English address is rewritten onto the French route in `middleware.ts`
 * (`toRouteFilePath`), so `/en/dossiers/kongo-kingdom` arrives here as
 * `royaume-kongo`. A slug the corpus does not know is withheld rather than
 * served — that is either a reader guessing at a URL or a dossier removed
 * from the corpus, and neither is a page to publish.
 */
// @req REQ-113
export function isDossierSlugPublished(slug: string): boolean {
  return getDossierBySlug(slug)?.readiness === "ready";
}
