import { PageLoadingScreen } from "@/components/system/PageLoadingScreen";

/**
 * Declared on this leaf rather than on `comprendre/` itself: the axis holds
 * `doctrine/[slug]`, which answers 404 and declares no boundary of its own,
 * so a file one level up would flush its shell — and its status — before the
 * `notFound()` could be reached.
 */
// @req REQ-104
export default function MigrationsLoading() {
  return (
    <PageLoadingScreen
      label="Chargement de la frise des migrations"
      sectionName="Comprendre"
    />
  );
}
