import { PageLoadingScreen } from "@/components/system/PageLoadingScreen";

/**
 * The wait for the whole Explorer axis: the hub, the three directories and
 * the search page. Without a `loading.tsx` App Router has nothing to swap in
 * and blocks the navigation on the server response — the reader clicks and
 * the previous page simply stays, with no sign that anything is happening.
 *
 * One file covers the axis because every route under it that answers 404 —
 * the three fiches, and a people's `liens` — already declares a nearer
 * boundary of its own, so none of them starts streaming through this one.
 * That matters more than the keystrokes saved: a `notFound()` reached after
 * its shell has been flushed cannot change a status code that has already
 * gone out, and the fiche would answer 200 for an entity the corpus does not
 * hold.
 */
// @req REQ-104
export default function ExplorerLoading() {
  return (
    <PageLoadingScreen label="Chargement de l'atlas" sectionName="Explorer" />
  );
}
