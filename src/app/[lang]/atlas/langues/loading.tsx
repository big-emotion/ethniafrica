import { PageLoadingScreen } from "@/components/system/PageLoadingScreen";

/** See `../appellations/loading.tsx` for why this sits on the leaf. */
// @req REQ-139
export default function LanguesLoading() {
  return <PageLoadingScreen label="Chargement des langues" />;
}
