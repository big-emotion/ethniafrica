import { PageLoadingScreen } from "@/components/system/PageLoadingScreen";
import { systemStatesCopy } from "@/lib/i18n/copy/systemStates";

// @req REQ-104
export default function AboutLoading() {
  return (
    <PageLoadingScreen
      label={{
        en: systemStatesCopy.en.loading.about,
        fr: systemStatesCopy.fr.loading.about,
      }}
    />
  );
}
