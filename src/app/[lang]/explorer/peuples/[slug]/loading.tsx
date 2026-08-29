import { FicheLoadingScreen } from "@/components/fiche/FicheLoadingScreen";

/**
 * See the country fiche's loading file: the people fiche fans out to five
 * Supabase reads before its first byte, and this is what stands in for it.
 */
// @req REQ-104
export default function PeopleFicheLoading() {
  return <FicheLoadingScreen entityType="people" sectionName="Peuples" />;
}
