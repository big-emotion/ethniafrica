import { PageLoadingScreen } from "@/components/system/PageLoadingScreen";

// @req REQ-104
export default function MentionsLegalesLoading() {
  return (
    <PageLoadingScreen
      label="Chargement des mentions légales"
      sectionName="Mentions légales"
    />
  );
}
