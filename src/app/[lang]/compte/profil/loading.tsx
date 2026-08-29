import { PageLoadingScreen } from "@/components/system/PageLoadingScreen";

/** The profile waits on the session and the reader's own contributions. */
// @req REQ-104
export default function ProfilLoading() {
  return (
    <PageLoadingScreen label="Chargement du profil" sectionName="Compte" />
  );
}
