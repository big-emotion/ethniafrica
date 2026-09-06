import type { FamilyHistoryData } from "@/lib/familyDataTransformer";
import { FicheFieldList } from "@/components/fiche/FicheProse";
import { FlagTarget } from "@/components/flags/FlagTarget";
import { FALLBACK_LOCALE } from "@/lib/locale";
import { familyCopy } from "@/lib/i18n/copy/family";
import type { Language } from "@/types/shared";

import { chapterAnchorId } from "@/lib/ficheChapters";

/** The chapter this section is, in the fiche's reading rail. */
export interface FamilyHistorySectionProps {
  data: FamilyHistoryData;
  familyId: string;
  language?: Language;
  /** Cloudflare Turnstile public site key, required to enable the live FlagTarget wiring on this heading (AC5). */
}

// @req REQ-047
export function FamilyHistorySection({
  data,
  familyId,
  language = FALLBACK_LOCALE,
}: FamilyHistorySectionProps) {
  const copy = familyCopy[language].history;
  const historyFields = [
    [copy.probableOrigin, "probableOrigin"],
    [copy.emergencePeriod, "emergencePeriod"],
    [copy.diffusion, "diffusion"],
    [copy.historicalBreaks, "historicalBreaks"],
    [copy.contactZones, "contactZones"],
    [copy.majorEvents, "majorEvents"],
  ] as const;
  if (!historyFields.some(([, field]) => Boolean(data[field]))) return null;

  return (
    <section
      aria-labelledby="family-history-heading"
      id={chapterAnchorId(copy.title)}
      data-fiche-section={copy.title}
    >
      <h2 id="family-history-heading">{copy.title}</h2>
      <FicheFieldList
        language={language}
        fields={historyFields.flatMap(([label, field]) =>
          data[field] ? [{ label, prose: data[field] }] : []
        )}
      />
      <div data-testid="section-flag-target-history">
        <FlagTarget
          target={{
            type: "fiche_section",
            id: familyId,
            fieldPath: "history",
            fieldLabel: copy.title,
          }}
          triggerLabel={copy.report}
          className="w-auto text-afh-caption"
        />
      </div>
    </section>
  );
}
