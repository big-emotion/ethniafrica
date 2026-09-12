import type { PatronymeLinkSummary } from "@/api/v2/services/patronymeFicheLinks";
import { FieldProvenanceMarker } from "@/components/fiche/FieldProvenanceMarker";
import { FicheNameList } from "@/components/patronymes/FicheNameList";
import { peopleCopy } from "@/lib/i18n/copy/people";
import { getTranslation } from "@/lib/translations";
import type { Language } from "@/types/shared";

export interface PeopleNamesChapterProps {
  borneNames: PatronymeLinkSummary[] | null;
  language: Language;
}

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
function initial(name: string): string {
  return (
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")[0]
      ?.toUpperCase() ?? ""
  );
}

// @req REQ-133
export function PeopleNamesChapter({
  borneNames,
  language,
}: PeopleNamesChapterProps) {
  const borneCopy = getTranslation(language).patronymes.onFiche;
  const sorted = [...(borneNames ?? [])].sort((a, b) =>
    a.nameMain.localeCompare(b.nameMain, language, { sensitivity: "base" })
  );
  const groups = new Map<string, PatronymeLinkSummary[]>();
  for (const name of sorted) {
    const letter = initial(name.nameMain);
    groups.set(letter, [...(groups.get(letter) ?? []), name]);
  }

  return (
    <div className="space-y-5">
      {borneNames === null || borneNames.length === 0 ? (
        <FieldProvenanceMarker
          state="documented-gap"
          reason={
            borneNames === null
              ? borneCopy.peopleUnavailable
              : borneCopy.peopleEmpty
          }
          language={language}
        />
      ) : (
        <div className="space-y-4">
          {/* 44px cells rather than a gap: each letter is a tap target on a
              phone, and the cell is what spaces the strip. The absent letters
              take the same cell so the row does not comb. */}
          <nav
            aria-label={peopleCopy[language].chapterDetails.borneNamesIndex}
            className="flex flex-wrap text-afh-small"
          >
            {alphabet.map((letter) =>
              groups.has(letter) ? (
                <a
                  key={letter}
                  href={`#noms-portes-${letter.toLowerCase()}`}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center font-semibold text-[var(--accent-ink)] underline-offset-4 hover:underline"
                >
                  {letter}
                </a>
              ) : (
                <span
                  key={letter}
                  aria-disabled="true"
                  className="inline-flex min-h-11 min-w-11 items-center justify-center opacity-40"
                >
                  {letter}
                </span>
              )
            )}
          </nav>
          {Array.from(groups, ([letter, entries]) => (
            <div key={letter} id={`noms-portes-${letter.toLowerCase()}`}>
              <h3 className="people-section-label mb-2">{letter}</h3>
              <FicheNameList names={entries} language={language} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
