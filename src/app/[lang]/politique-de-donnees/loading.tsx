import { PageLoadingScreen } from "@/components/system/PageLoadingScreen";
import { systemStatesCopy } from "@/lib/i18n/copy/systemStates";

// @req REQ-104
export default function PolitiqueDeDonneesLoading() {
  return (
    <PageLoadingScreen
      label={{
        en: systemStatesCopy.en.loading.dataPolicy,
        fr: systemStatesCopy.fr.loading.dataPolicy,
      }}
    />
  );
}
