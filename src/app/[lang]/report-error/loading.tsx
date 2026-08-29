import { PageLoadingScreen } from "@/components/system/PageLoadingScreen";

// @req REQ-104
export default function ReportErrorLoading() {
  return (
    <PageLoadingScreen
      label="Chargement du signalement d'erreur"
      sectionName="Signaler une erreur"
    />
  );
}
