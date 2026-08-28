import { FicheLoadingScreen } from "@/components/fiche/FicheLoadingScreen";

/**
 * See the country fiche's loading file. The family fiche measured the slowest
 * of the three, because its footprint is a union computed over every people
 * carrying the family.
 */
// @req REQ-104
export default function FamilyFicheLoading() {
  return (
    <FicheLoadingScreen entityType="language-family" sectionName="Familles" />
  );
}
