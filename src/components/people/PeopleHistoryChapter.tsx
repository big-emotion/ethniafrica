import type {
  PeopleHistoryData,
  PeopleOriginData,
} from "@/lib/peopleDataTransformer";
import { hasOriginContent } from "@/lib/peopleDataTransformer";
import { peopleCopy } from "@/lib/i18n/copy/people";
import type { ParagraphNoteData } from "@/components/people/peopleFicheNotes";
import { FieldProvenanceMarker } from "@/components/fiche/FieldProvenanceMarker";
import type { Language } from "@/types/shared";

import { PeopleHistoryTimeline } from "./PeopleHistoryTimeline";
import { PeopleOriginBlock } from "./PeopleOriginBlock";
import { ProseWithChip } from "./ProseWithChip";

export interface PeopleHistoryChapterProps {
  origin: PeopleOriginData;
  history: PeopleHistoryData;
  originNotes?: Partial<Record<string, ParagraphNoteData>>;
  historyNotes?: Partial<Record<string, ParagraphNoteData>>;
  language: Language;
}

/** A single reading path across the fiche's origins and historical role. */
// @req REQ-003
export function PeopleHistoryChapter({
  origin,
  history,
  originNotes,
  historyNotes,
  language,
}: PeopleHistoryChapterProps) {
  const hasOrigin = hasOriginContent(origin);
  const hasHistory = Object.values(history).some(Boolean);
  if (!hasOrigin && !hasHistory) {
    return <FieldProvenanceMarker state="missing" language={language} />;
  }

  const originWithoutPeriod = { ...origin, formationPeriod: undefined };
  const copy = peopleCopy[language].chapterDetails;

  return (
    <ol className="afh-parchment-timeline" aria-label={copy.historyChronology}>
      {hasOrigin && (
        <li className="afh-tl-item">
          <div className="afh-tl-period">
            {origin.formationPeriod ? (
              <ProseWithChip
                language={language}
                text={origin.formationPeriod}
                note={originNotes?.formationPeriod}
              />
            ) : (
              copy.historyUndated
            )}
          </div>
          <div>
            <h3>{peopleCopy[language].sections.origins}</h3>
            <PeopleOriginBlock
              data={originWithoutPeriod}
              notes={originNotes}
              language={language}
            />
          </div>
        </li>
      )}
      {hasHistory && (
        <li className="afh-tl-item">
          <span className="afh-tl-period">{copy.historyUndated}</span>
          <div>
            <h3>{copy.historyRole}</h3>
            <PeopleHistoryTimeline
              data={history}
              notes={historyNotes}
              language={language}
            />
          </div>
        </li>
      )}
    </ol>
  );
}
