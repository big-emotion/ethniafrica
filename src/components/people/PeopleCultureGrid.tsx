import {
  hasCultureContent,
  type PeopleCultureData,
} from "@/lib/peopleDataTransformer";
import { ProseWithChip } from "./ProseWithChip";
import type { CultureChips } from "./ProseWithChip";

interface PeopleCultureGridProps {
  data: PeopleCultureData;
  chips?: CultureChips;
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
export function PeopleCultureGrid({ data, chips }: PeopleCultureGridProps) {
  if (!hasCultureContent(data)) return null;
  const present = FIELDS.filter(({ key }) => Boolean(data[key]));

  return (
    <div className="space-y-[14px]">
      {present.map(({ key, label }) => (
        <div key={key}>
          <p className="people-section-label">{label}</p>
          <ProseWithChip text={data[key] as string} chip={chips?.[key]} />
        </div>
      ))}
    </div>
  );
}
