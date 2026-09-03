import { PageLoadingScreen } from "@/components/system/PageLoadingScreen";

/**
 * One boundary for the pillar and its five chapters.
 *
 * It sits at the root of the `nommer` segment rather than on each leaf,
 * which `loaderCoverage.test.ts` allows only because none of the six routes
 * below can answer `notFound()`: the chapters are five static directories,
 * not a `[chapitre]` route that would have to 404 an unknown slug. Making
 * them dynamic would have forced the boundary down onto the parameterised
 * segment and reopened the soft-404 the fiches are grandfathered into.
 *
 * Nothing is declared on `dossiers/` itself: that would be the nearest
 * boundary above every future 404 on the axis. Same reasoning as
 * `../migrations/loading.tsx`.
 */
// @req REQ-104
export default function NommerLoading() {
  return <PageLoadingScreen label="Chargement du dossier sur les noms" />;
}
