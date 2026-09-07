import { PageLoadingScreen } from "@/components/system/PageLoadingScreen";
import { systemStatesCopy } from "@/lib/i18n/copy/systemStates";

// @req REQ-104
export default function AccessibiliteLoading() {
  return (
    <PageLoadingScreen
      label={{
        en: systemStatesCopy.en.loading.accessibility,
        fr: systemStatesCopy.fr.loading.accessibility,
      }}
    />
  );
}
