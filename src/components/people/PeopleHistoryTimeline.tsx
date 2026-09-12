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

/**
 * The four topics `content.history` declares, in the order the strict model
 * lists them.
 */
const FIELDS = [
  "kingdomsOrChiefdoms",
  "relationsWithNeighbors",
  "conflictsOrAlliances",
  "diaspora",
] as const satisfies ReadonlyArray<keyof PeopleHistoryData>;

/**
 * Renders each declared topic as its own station on the chronology spine
 * `PeopleHistoryChapter` owns — not a sub-list grouped under one shared
 * label. `content.history` carries no date field at all (unlike
 * `content.origins.formationPeriod`), so every station here reads its period
 * as undated; that is the corpus's honest ceiling, not a rendering gap, and
 * REQ-148 already treats an undated station the same way for a country's
 * polities.
 *
 * Returns bare `<li>` elements, no wrapping list of its own: the caller's
 * `<ol>` is the single spine, and a second list here would split it in two.
 */
// @req REQ-003 REQ-155
export function PeopleHistoryTimeline({
  data,
  chips,
  notes,
  language = FALLBACK_LOCALE,
}: PeopleHistoryTimelineProps) {
  const copy = peopleCopy[language].historyFields;
  const undated = peopleCopy[language].chapterDetails.historyUndated;
  const present = FIELDS.filter((key) => Boolean(data[key]));

  if (present.length === 0) return null;

  const labels: Record<(typeof FIELDS)[number], string> = {
    kingdomsOrChiefdoms: copy.kingdoms,
    relationsWithNeighbors: copy.neighbours,
    conflictsOrAlliances: copy.conflicts,
    diaspora: copy.diaspora,
  };

  return (
    <>
      {present.map((key) => (
        <li className="afh-tl-item" key={key}>
          <span className="afh-tl-period">{undated}</span>
          <div>
            <h3>{labels[key]}</h3>
            <ProseWithChip
              language={language}
              text={data[key] as string}
              chip={chips?.[key]}
              note={notes?.[key]}
            />
          </div>
        </li>
      ))}
    </>
  );
}
