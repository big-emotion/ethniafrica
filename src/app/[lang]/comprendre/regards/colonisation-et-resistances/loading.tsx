import { PageLoadingScreen } from "@/components/system/PageLoadingScreen";

/** See `../../migrations/loading.tsx` for why this sits on the leaf. */
// @req REQ-104
export default function ColonisationLoading() {
  return (
    <PageLoadingScreen label="Chargement des regards sur la colonisation" />
  );
}
