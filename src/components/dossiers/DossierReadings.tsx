import type { DossierReading } from "@/lib/afrik/parsers/dossierTypes";

/**
 * The block the Dossiers axis exists for: one fact, read twice.
 *
 * The stance line is deliberately generic — « La lecture officielle », « La
 * contre-lecture » — and the specific claim lives in the reading's own label.
 * Brand charter §8.5: a group title states something about its actual
 * contents, and a written-once sentence over a slot that holds twelve
 * different arguments is a title that can never be wrong, which is the same as
 * saying nothing. « Ce qu'elle ne mesure pas » would be false of half the
 * chapters; « La contre-lecture » is true of all of them, and the label under
 * it carries what this one actually says.
 *
 * Order is fixed and not a prop. The authoritative account is stated first,
 * whole and without irony, because a reader who meets the widening before the
 * thing being widened has been handed a rebuttal to an argument nobody made.
 */

const STANCE_LABELS: Record<DossierReading["stance"], string> = {
  official: "La lecture officielle",
  counter: "La contre-lecture",
};

const STANCE_ORDER: DossierReading["stance"][] = ["official", "counter"];

export interface DossierReadingsProps {
  readings: DossierReading[];
  chapterKey: string;
}

// @req REQ-114
export function DossierReadings({
  readings,
  chapterKey,
}: DossierReadingsProps) {
  const ordered = STANCE_ORDER.flatMap((stance) =>
    readings.filter((reading) => reading.stance === stance)
  );

  if (ordered.length === 0) return null;

  return (
    <ul
      className="afh-dossier-readings"
      data-testid={`dossier-readings-${chapterKey}`}
    >
      {ordered.map((reading, index) => (
        <li
          key={`${reading.stance}-${index}`}
          className={`afh-dossier-reading ${
            reading.stance === "counter" ? "is-counter" : "is-official"
          }`}
          data-stance={reading.stance}
        >
          <p className="afh-dossier-reading-stance">
            {STANCE_LABELS[reading.stance]}
          </p>
          {/* h3, not h2: a reading is an item of the chapter above it, and an
              h2 here would let twelve of them outrank the six chapter titles
              that govern them. */}
          <h3 className="afh-dossier-reading-label">{reading.label}</h3>
          <p className="afh-dossier-reading-body">{reading.body}</p>
        </li>
      ))}
    </ul>
  );
}
