import { PageLoadingScreen } from "@/components/system/PageLoadingScreen";
import { systemStatesCopy } from "@/lib/i18n/copy/systemStates";

// @req REQ-104
export default function MentionsLegalesLoading() {
  return (
    <PageLoadingScreen
      label={{
        en: systemStatesCopy.en.loading.legalNotice,
        fr: systemStatesCopy.fr.loading.legalNotice,
      }}
    />
  );
}
