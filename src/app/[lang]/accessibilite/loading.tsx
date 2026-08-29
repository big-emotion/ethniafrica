import { PageLoadingScreen } from "@/components/system/PageLoadingScreen";

// @req REQ-104
export default function AccessibiliteLoading() {
  return (
    <PageLoadingScreen
      label="Chargement de la déclaration d'accessibilité"
      sectionName="Accessibilité"
    />
  );
}
