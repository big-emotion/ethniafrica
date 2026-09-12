import Link from "next/link";

import type {
  CountryPatronymes,
  PatronymeLinkSummary,
} from "@/api/v2/services/patronymeFicheLinks";
import { FicheSection } from "@/components/fiche/FicheSection";
import { FicheTile } from "@/components/fiche/FicheTile";
import { FieldProvenanceMarker } from "@/components/fiche/FieldProvenanceMarker";
import {
  NAME_INDEX_THRESHOLD,
  groupNamesBySystem,
  initialOf,
  namesChapterTitle,
  sortNames,
  type FicheName,
} from "@/lib/fiche/names";
import { getPatronymeRoute } from "@/lib/routing";
import { getTranslation } from "@/lib/translations";
import type { Language } from "@/types/shared";

const ALPHABET = Array.from({ length: 26 }, (_, step) =>
  String.fromCharCode(65 + step)
);

type FicheNamesChapterProps = { language: Language } & (
  | { scope: "people"; names: PatronymeLinkSummary[] | null }
  | { scope: "country"; patronymes: CountryPatronymes | null }
);

/** The distinct systems a list holds, the most represented first. */
function systemsLine(names: readonly FicheName[], language: Language): string {
  return groupNamesBySystem(names, language)
    .map(
      (group) =>
        getTranslation(language).patronymes.nameSystemLabels[group.system]
    )
    .join(" · ");
}

function NameLinks({
  names,
  language,
}: {
  names: readonly FicheName[];
  language: Language;
}) {
  return (
    <ul className="afh-pills afh-name-pills">
      {names.map((name) => (
        <li key={name.id}>
          <Link href={getPatronymeRoute(language, name.id)}>
            {name.nameMain}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * A run of names, indexed A–Z only past the threshold. The index shows the
 * whole alphabet so a gap reads as a gap and not as the end of the list, and
 * an absent letter is plainly not a link.
 */
function NameList({
  names,
  groupKey,
  groupLabel,
  language,
}: {
  names: readonly FicheName[];
  groupKey: string;
  groupLabel: string;
  language: Language;
}) {
  const sorted = sortNames(names, language);
  if (sorted.length <= NAME_INDEX_THRESHOLD) {
    return <NameLinks names={sorted} language={language} />;
  }

  const byLetter = new Map<string, FicheName[]>();
  for (const name of sorted) {
    const letter = initialOf(name.nameMain);
    byLetter.set(letter, [...(byLetter.get(letter) ?? []), name]);
  }
  const anchor = (letter: string) =>
    `names-${groupKey}-${letter === "#" ? "other" : letter.toLowerCase()}`;
  const letters = [...ALPHABET, ...(byLetter.has("#") ? ["#"] : [])];
  const copy = getTranslation(language).patronymes.onFiche;

  return (
    <>
      <nav
        aria-label={`${copy.countryAlphabeticalIndexLabel} — ${groupLabel}`}
        className="afh-name-index"
      >
        {letters.map((letter) =>
          byLetter.has(letter) ? (
            <a key={letter} data-letter="present" href={`#${anchor(letter)}`}>
              {letter}
            </a>
          ) : (
            <span key={letter} data-letter="absent">
              {letter}
            </span>
          )
        )}
      </nav>
      {Array.from(byLetter, ([letter, entries]) => (
        <div key={letter} id={anchor(letter)} className="afh-name-letter">
          <p className="afh-tile-term">{letter}</p>
          <NameLinks names={entries} language={language} />
        </div>
      ))}
    </>
  );
}

/**
 * The names chapter both records share (REQ-133, operator ruling 2026-09-12).
 *
 * Titled for what it lists — personal names, or patronymics when every entry
 * is one. A people's names are filed by naming system. A country keeps its two
 * registers apart: what a source attests here stays open, and what its
 * peoples carry without an attestation here folds behind a tile that names
 * those peoples, so the second is never read as the first.
 *
 * The anchors are the ones the two chapters already published, so shared
 * links survive the new titles.
 */
// @req REQ-133 REQ-154
export function FicheNamesChapter(props: FicheNamesChapterProps) {
  const { language } = props;
  const copy = getTranslation(language).patronymes;
  const onFiche = copy.onFiche;

  if (props.scope === "people") {
    const { names } = props;
    return (
      <FicheSection
        title={namesChapterTitle("people", names, language)}
        id={language === "fr" ? "chapitre-noms-portes" : "chapitre-names-borne"}
      >
        {names === null || names.length === 0 ? (
          <FieldProvenanceMarker
            state="documented-gap"
            reason={
              names === null ? onFiche.peopleUnavailable : onFiche.peopleEmpty
            }
            language={language}
          />
        ) : (
          <div className="afh-names">
            {groupNamesBySystem(names, language).map((group) => (
              <div key={group.system} className="afh-names-group">
                <div className="afh-names-head">
                  <h3 className="afh-names-title">
                    {copy.nameSystemLabels[group.system]}
                  </h3>
                  <span className="afh-names-tally">
                    {onFiche.nameCount(group.names.length)}
                  </span>
                </div>
                <NameList
                  names={group.names}
                  groupKey={group.system}
                  groupLabel={copy.nameSystemLabels[group.system]}
                  language={language}
                />
              </div>
            ))}
          </div>
        )}
      </FicheSection>
    );
  }

  const { patronymes } = props;
  const attested = patronymes?.attested ?? [];
  const carried = patronymes?.borneByPeoples ?? [];
  const peoples = Array.from(
    new Set(
      carried.flatMap((name) =>
        name.viaPeoples.map((people) => people.nameMain)
      )
    )
  ).join(", ");
  const prefix = onFiche.reachViaPrefix;

  return (
    <FicheSection
      title={namesChapterTitle(
        "country",
        patronymes ? [...attested, ...carried] : null,
        language
      )}
      id={
        language === "fr" ? "chapitre-noms-attestes" : "chapitre-attested-names"
      }
    >
      {patronymes === null ||
      (attested.length === 0 && carried.length === 0) ? (
        <FieldProvenanceMarker
          state="documented-gap"
          reason={
            patronymes === null
              ? onFiche.countryUnavailable
              : onFiche.countryEmpty
          }
          language={language}
        />
      ) : (
        <div className="afh-names">
          {attested.length > 0 ? (
            <div data-names-register="attested" className="afh-names-group">
              <div className="afh-names-head">
                <h3 className="afh-names-title">{onFiche.attestedLabel}</h3>
                <span className="afh-names-tally">
                  {onFiche.nameCount(attested.length)}
                </span>
              </div>
              <NameList
                names={attested}
                groupKey="attested"
                groupLabel={onFiche.attestedLabel}
                language={language}
              />
              <p data-names-systems="" className="afh-names-systems">
                {systemsLine(attested, language)}
              </p>
            </div>
          ) : null}
          {carried.length > 0 ? (
            <div data-names-register="reach">
              <FicheTile
                language={language}
                title={onFiche.reachLabel}
                value={onFiche.nameCount(carried.length)}
                closedFact={`${prefix.charAt(0).toLocaleUpperCase(language)}${prefix.slice(1)} ${peoples}`}
                detailText={carried.map((name) => name.nameMain).join(" ")}
              >
                <NameList
                  names={carried}
                  groupKey="reach"
                  groupLabel={onFiche.reachLabel}
                  language={language}
                />
                <p data-names-systems="" className="afh-names-systems">
                  {systemsLine(carried, language)}
                </p>
              </FicheTile>
            </div>
          ) : null}
        </div>
      )}
    </FicheSection>
  );
}
