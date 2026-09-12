import {
  hasCultureContent,
  type PeopleCultureData,
} from "@/lib/peopleDataTransformer";
import type { ParagraphNoteData } from "@/components/people/peopleFicheNotes";
import { FicheTile, FicheTiles } from "@/components/fiche/FicheTile";
import { ProseWithChip } from "./ProseWithChip";
import type { CultureChips, ParagraphChipData } from "./ProseWithChip";
import { peopleCopy } from "@/lib/i18n/copy/people";
import { FALLBACK_LOCALE } from "@/lib/locale";
import type { Language } from "@/types/shared";

interface PeopleCultureGridProps {
  data: PeopleCultureData;
  fields?: readonly (keyof PeopleCultureData)[];
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

/**
 * A `FicheTile`'s closed state must state a datum, never repeat the rubric
 * name (its own charter, REQ-153) — so a field long enough to hold two
 * sentences is split at its first terminator, and only the first becomes the
 * closed fact. Shared with `PeopleCultureChapter`'s arts/spirituality tiles
 * so the two never drift into two different splitting rules.
 *
 * @req REQ-153
 */
export function splitSourcedProse(text: string) {
  const match = text.trim().match(/^([\s\S]{20,}?[.!?])\s+([\s\S]+)$/);
  return match
    ? { fact: match[1], detail: match[2] }
    : { fact: text.trim(), detail: null };
}

function CultureFieldTile({
  title,
  text,
  chip,
  note,
  language,
}: {
  title: string;
  text: string;
  chip?: ParagraphChipData;
  note?: ParagraphNoteData;
  language: Language;
}) {
  const { fact, detail } = splitSourcedProse(text);
  return (
    <FicheTile
      language={language}
      title={title}
      closedFact={fact}
      detailText={detail ?? undefined}
      closedFactContent={
        detail ? (
          fact
        ) : (
          <ProseWithChip
            language={language}
            text={text}
            chip={chip}
            note={note}
          />
        )
      }
    >
      {detail ? (
        <ProseWithChip
          language={language}
          text={detail}
          chip={chip}
          note={note}
        />
      ) : undefined}
    </FicheTile>
  );
}

// @req REQ-003
export function PeopleCultureGrid({
  data,
  fields = FIELDS,
  chips,
  notes,
  language = FALLBACK_LOCALE,
}: PeopleCultureGridProps) {
  if (!hasCultureContent(data)) return null;
  const present = fields.filter((key) => Boolean(data[key]));
  if (present.length === 0) return null;
  const copy = peopleCopy[language].cultureFields;

  return (
    <FicheTiles>
      {present.map((key) => (
        <CultureFieldTile
          key={key}
          title={copy[key]}
          text={data[key] as string}
          chip={chips?.[key]}
          note={notes?.[key]}
          language={language}
        />
      ))}
    </FicheTiles>
  );
}
