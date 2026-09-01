import { FicheLoadingScreen } from "@/components/fiche/FicheLoadingScreen";

/**
 * See the country fiche's loading file. The language fiche has no globe to
 * warm up, but the entity's own boundary keeps a 404 real rather than
 * bubbling it up to the atlas segment's shared loading shell (REQ-052).
 */
// @req REQ-104
export default function LanguageFicheLoading() {
  return <FicheLoadingScreen entityType="language" />;
}
