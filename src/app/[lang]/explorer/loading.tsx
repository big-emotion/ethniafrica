import { PageLoadingScreen } from "@/components/system/PageLoadingScreen";

/**
 * The wait for the routes on the Explorer axis that are whole pages: the hub
 * and `recherche`. Without a `loading.tsx` App Router has nothing to swap in
 * and blocks the navigation on the server response — the reader clicks and
 * the previous page simply stays, with no sign that anything is happening.
 *
 * Two kinds of route under this one declare a nearer boundary and never
 * stream through it, for two unrelated reasons.
 *
 * The three facets, because they are `FacetHubShell`'s `children` rather than
 * pages: a `PageLoadingScreen` there lands inside the shell and paints a
 * second header, trail and title band under the globe. See
 * `FacetPanelLoading`.
 *
 * The three fiches and a people's `liens`, because they answer 404: a
 * `notFound()` reached after its shell has been flushed cannot change a
 * status code that has already gone out, and the fiche would answer 200 for
 * an entity the corpus does not hold.
 */
// @req REQ-104
export default function ExplorerLoading() {
  return (
    <PageLoadingScreen label="Chargement de l'atlas" sectionName="Explorer" />
  );
}
