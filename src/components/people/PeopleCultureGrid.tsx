import {
  hasCultureContent,
  type PeopleCultureData,
} from "@/lib/peopleDataTransformer";
import type { ParagraphNoteData } from "@/components/people/peopleFicheNotes";
import { ProseWithChip } from "./ProseWithChip";
import type { CultureChips } from "./ProseWithChip";
import { peopleCopy } from "@/lib/i18n/copy/people";
import { FALLBACK_LOCALE } from "@/lib/locale";
import type { Language } from "@/types/shared";

interface PeopleCultureGridProps {
  data: PeopleCultureData;
  chips?: CultureChips;
  /** One note callout per sourced field, keyed as `chips` is. */
  notes?: Partial<Record<string, ParagraphNoteData>>;
  language?: Language;
}

/**
 * The four fields in the order `public/modele-peuple.json` lists them, which
 * is also the order the fiche reads in: what a people does, what it shows,
 * what it makes, what it believes.
 */
const FIELDS = [
  "majorRites",
  "symbols",
  "artsAndMusic",
  "spiritualities",
] as const satisfies ReadonlyArray<keyof PeopleCultureData>;

// @req REQ-003
export function PeopleCultureGrid({
  data,
  chips,
  notes,
  language = FALLBACK_LOCALE,
}: PeopleCultureGridProps) {
  if (!hasCultureContent(data)) return null;
  const present = FIELDS.filter((key) => Boolean(data[key]));
  const copy = peopleCopy[language].cultureFields;

  return (
    <dl className="afh-prose-fields space-y-[14px]">
      {present.map((key) => (
        <div key={key}>
          <dt className="people-section-label">{copy[key]}</dt>
          <dd className="afh-prose-def">
            <ProseWithChip
              language={language}
              text={data[key] as string}
              chip={chips?.[key]}
              note={notes?.[key]}
            />
          </dd>
        </div>
      ))}
    </dl>
  );
}
