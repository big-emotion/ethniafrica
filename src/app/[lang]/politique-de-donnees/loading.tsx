import { PageLoadingScreen } from "@/components/system/PageLoadingScreen";

// @req REQ-104
export default function PolitiqueDeDonneesLoading() {
  return (
    <PageLoadingScreen
      label="Chargement de la politique de données"
      sectionName="Politique de données"
    />
  );
}
