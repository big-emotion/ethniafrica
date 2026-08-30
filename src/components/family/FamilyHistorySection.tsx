import type { FamilyHistoryData } from "@/lib/familyDataTransformer";
import { FicheFieldList } from "@/components/fiche/FicheProse";
import { FlagTarget } from "@/components/flags/FlagTarget";

import { chapterAnchorId } from "@/lib/ficheChapters";

/** The chapter this section is, in the fiche's reading rail. */
const CHAPTER_TITLE = "Histoire et origines";

export interface FamilyHistorySectionProps {
  data: FamilyHistoryData;
  familyId: string;
  /** Cloudflare Turnstile public site key, required to enable the live FlagTarget wiring on this heading (AC5). */
}

const historyFields = [
  ["Origine probable", "probableOrigin"],
  ["Période d'émergence", "emergencePeriod"],
  ["Diffusion", "diffusion"],
  ["Ruptures historiques", "historicalBreaks"],
  ["Zones de contact", "contactZones"],
  ["Événements majeurs", "majorEvents"],
] as const;

// @req REQ-047
export function FamilyHistorySection({
  data,
  familyId,
}: FamilyHistorySectionProps) {
  if (!historyFields.some(([, field]) => Boolean(data[field]))) return null;

  return (
    <section
      aria-labelledby="family-history-heading"
      id={chapterAnchorId(CHAPTER_TITLE)}
      data-fiche-section={CHAPTER_TITLE}
    >
      <h2 id="family-history-heading">{CHAPTER_TITLE}</h2>
      <FicheFieldList
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
            fieldLabel: "Histoire et origines",
          }}
          triggerLabel="Signaler cette section"
          className="w-auto text-afh-caption"
        />
      </div>
    </section>
  );
}
