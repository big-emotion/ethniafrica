import type { PeopleHistoryData } from "@/lib/peopleDataTransformer";
import type { ParagraphNoteData } from "@/components/people/peopleFicheNotes";
import { ProseWithChip } from "./ProseWithChip";
import type { HistoryChips } from "./ProseWithChip";
import { peopleCopy } from "@/lib/i18n/copy/people";
import { FALLBACK_LOCALE } from "@/lib/locale";
import type { Language } from "@/types/shared";

interface PeopleHistoryTimelineProps {
  data: PeopleHistoryData;
  chips?: HistoryChips;
  /** One note callout per sourced field, keyed as `chips` is. */
  notes?: Partial<Record<string, ParagraphNoteData>>;
  language?: Language;
}

// @req REQ-003
export function PeopleHistoryTimeline({
  data,
  chips,
  notes,
  language = FALLBACK_LOCALE,
}: PeopleHistoryTimelineProps) {
  const copy = peopleCopy[language].historyFields;
  const hasContent =
    data.kingdomsOrChiefdoms ||
    data.relationsWithNeighbors ||
    data.conflictsOrAlliances ||
    data.diaspora;

  if (!hasContent) return null;

  return (
    <dl className="afh-prose-fields space-y-[14px]">
      {data.kingdomsOrChiefdoms && (
        <div>
          <dt className="people-section-label">{copy.kingdoms}</dt>
          <dd className="afh-prose-def">
            <ProseWithChip
              language={language}
              text={data.kingdomsOrChiefdoms}
              chip={chips?.kingdomsOrChiefdoms}
              note={notes?.kingdomsOrChiefdoms}
            />
          </dd>
        </div>
      )}

      {data.relationsWithNeighbors && (
        <div>
          <dt className="people-section-label">{copy.neighbours}</dt>
          <dd className="afh-prose-def">
            <ProseWithChip
              language={language}
              text={data.relationsWithNeighbors}
              chip={chips?.relationsWithNeighbors}
              note={notes?.relationsWithNeighbors}
            />
          </dd>
        </div>
      )}

      {data.conflictsOrAlliances && (
        <div>
          <dt className="people-section-label">{copy.conflicts}</dt>
          <dd className="afh-prose-def">
            <ProseWithChip
              language={language}
              text={data.conflictsOrAlliances}
              chip={chips?.conflictsOrAlliances}
              note={notes?.conflictsOrAlliances}
            />
          </dd>
        </div>
      )}

      {data.diaspora && (
        <div>
          <dt className="people-section-label">{copy.diaspora}</dt>
          <dd className="afh-prose-def">
            <ProseWithChip
              language={language}
              text={data.diaspora}
              chip={chips?.diaspora}
              note={notes?.diaspora}
            />
          </dd>
        </div>
      )}
    </dl>
  );
}
