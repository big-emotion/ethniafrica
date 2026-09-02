import {
  hasCultureContent,
  type PeopleCultureData,
} from "@/lib/peopleDataTransformer";
import type { ParagraphNoteData } from "@/components/people/peopleFicheNotes";
import { ProseWithChip } from "./ProseWithChip";
import type { CultureChips } from "./ProseWithChip";

interface PeopleCultureGridProps {
  data: PeopleCultureData;
  chips?: CultureChips;
  /** One note callout per sourced field, keyed as `chips` is. */
  notes?: Partial<Record<string, ParagraphNoteData>>;
}

/**
 * The four fields in the order `public/modele-peuple.json` lists them, which
 * is also the order the fiche reads in: what a people does, what it shows,
 * what it makes, what it believes.
 */
const FIELDS = [
  { key: "majorRites", label: "Rites majeurs" },
  { key: "symbols", label: "Symboles" },
  { key: "artsAndMusic", label: "Arts & musique" },
  { key: "spiritualities", label: "Spiritualités" },
] as const satisfies ReadonlyArray<{
  key: keyof PeopleCultureData;
  label: string;
}>;

// @req REQ-003
export function PeopleCultureGrid({
  data,
  chips,
  notes,
}: PeopleCultureGridProps) {
  if (!hasCultureContent(data)) return null;
  const present = FIELDS.filter(({ key }) => Boolean(data[key]));

  return (
    <dl className="afh-prose-fields space-y-[14px]">
      {present.map(({ key, label }) => (
        <div key={key}>
          <dt className="people-section-label">{label}</dt>
          <dd className="afh-prose-def">
            <ProseWithChip
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
