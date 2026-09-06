import type { Language } from "@/types/shared";
import type { DossierSource } from "@/lib/afrik/parsers/dossierTypes";
import { DossierCitations } from "./DossierCitations";
import type { DossierReading } from "@/lib/afrik/parsers/dossierTypes";

const STANCE_LABELS: Record<DossierReading["stance"], string> = {
  official: "La lecture officielle",
  counter: "La contre-lecture",
};

const STANCE_ORDER: DossierReading["stance"][] = ["official", "counter"];

export interface DossierReadingsProps {
  readings: DossierReading[];
  chapterKey: string;
  language: Language;
  sources: DossierSource[];
  sourcePrefix: string;
}

// @req REQ-114
export function DossierReadings({
  readings,
  chapterKey,
  language,
  sources,
  sourcePrefix,
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
            {language === "en"
              ? reading.stance === "official"
                ? "The authoritative reading"
                : "The counter-reading"
              : STANCE_LABELS[reading.stance]}
          </p>
          {/* h3, not h2: a reading is an item of the chapter above it, and an
              h2 here would let twelve of them outrank the six chapter titles
              that govern them. */}
          <h3 className="afh-dossier-reading-label">{reading.label}</h3>
          <p className="afh-dossier-reading-body">
            {reading.body}
            <DossierCitations
              refs={reading.sourceRefs}
              sources={sources}
              prefix={sourcePrefix}
            />
          </p>
        </li>
      ))}
    </ul>
  );
}
