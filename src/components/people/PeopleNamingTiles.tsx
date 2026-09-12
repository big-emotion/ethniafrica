import { FicheTile, FicheTiles } from "@/components/fiche/FicheTile";
import { NameOriginCard } from "@/components/names/NameOriginCard";
import { NameSpellingHistory } from "@/components/names/NameSpellingHistory";
import { ConfidenceChip } from "@/components/source-transparency/ConfidenceChip";
import { DoctrineLinkCard } from "@/components/source-transparency/DoctrineLinkCard";
import { AutonymExonymHeading } from "@/components/ui/AutonymExonymHeading";
import { splitLeadSentence } from "@/lib/fiche/prose";
import { peopleCopy } from "@/lib/i18n/copy/people";
import { FALLBACK_LOCALE } from "@/lib/locale";
import type {
  PeopleNameRecordViewData,
  PeopleNamesData,
} from "@/lib/peopleDataTransformer";
import type { NameRecordView } from "@/types/names";
import type { Language } from "@/types/shared";

interface PeopleNamingTilesProps {
  nameMain: string;
  selfAppellation?: string | null;
  exonyms?: string[] | null;
  originOfExonyms?: string | null;
  whyProblematic?: string | null;
  contemporaryUsage?: string | null;
  isoCode?: string;
  /** The people's name records, when the names dossier holds any. */
  records?: PeopleNamesData | null;
  language?: Language;
}

interface ExonymEntry {
  record: NameRecordView;
  /** The dossier record behind the name, when there is one. */
  dossier?: PeopleNameRecordViewData;
}

function sameName(a: string, b: string): boolean {
  return a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();
}

/** What a record says, as plain text, so the tile knows it has a body. */
function recordText(record: NameRecordView): string {
  return [
    record.nameText,
    record.meaning,
    record.imposedBy,
    record.impositionPeriod,
    record.whyProblematic,
    record.contemporaryUsage,
  ]
    .filter(Boolean)
    .join(" ");
}

function exonymWithoutRecord(nameText: string): NameRecordView {
  return {
    nameText,
    nameType: "exonym",
    languageOfOrigin: null,
    meaning: null,
    periodLabel: null,
    imposedBy: null,
    impositionPeriod: null,
    whyProblematic: null,
    contemporaryUsage: null,
  };
}

/**
 * The exonyms the appellations rubric lists, each paired with the dossier
 * record of the same name, then the records the rubric does not list. One
 * entry per name, so no name is printed twice.
 */
function exonymEntries(
  exonyms: string[],
  records: PeopleNameRecordViewData[]
): ExonymEntry[] {
  const unmatched = [...records];
  const listed = exonyms.map((nameText) => {
    const index = unmatched.findIndex((entry) =>
      sameName(entry.record.nameText, nameText)
    );
    const dossier = index >= 0 ? unmatched.splice(index, 1)[0] : undefined;
    return {
      record: dossier?.record ?? exonymWithoutRecord(nameText),
      dossier,
    };
  });
  return [
    ...listed,
    ...unmatched.map((dossier) => ({ record: dossier.record, dossier })),
  ];
}

function chipFor(
  entry: {
    confidenceScore: number | null;
    sourceCount: number;
    lastHumanAuditAt: string | null;
  },
  language: Language
) {
  return (
    <ConfidenceChip
      language={language}
      confidenceScore={entry.confidenceScore}
      sourceCount={entry.sourceCount}
      lastHumanAuditAt={entry.lastHumanAuditAt}
    />
  );
}

/**
 * "Le nom et ses appellations": the name borne, the names imposed, where they
 * come from and how they are used today, each in a tile.
 *
 * Each name is printed once. The chapter used to embed a names section under
 * these tiles that named the autonym and every exonym again, one card per
 * dossier record; the records' context now rides the tile that names them.
 */
// @req REQ-153
export function PeopleNamingTiles({
  nameMain,
  selfAppellation,
  exonyms,
  originOfExonyms,
  whyProblematic,
  contemporaryUsage,
  isoCode,
  records,
  language = FALLBACK_LOCALE,
}: PeopleNamingTilesProps) {
  const copy = peopleCopy[language].naming;
  const autonym = selfAppellation || nameMain;
  const imposed = exonymEntries(
    exonyms?.filter(Boolean) ?? [],
    records?.exonyms ?? []
  );
  const spellings = records?.spellingHistory ?? [];
  const endonyms = records?.endonyms ?? [];
  const endonymText = endonyms
    .map((entry) => recordText(entry.record))
    .join(" ");
  // A record that only repeats the autonym has nothing to fold behind it.
  const endonymBody = endonyms.length > 0 && !sameName(endonymText, autonym);
  const usage = contemporaryUsage || whyProblematic;

  return (
    <FicheTiles>
      <FicheTile
        language={language}
        title={copy.selfDesignation}
        closedFact={autonym}
        closedFactContent={
          <AutonymExonymHeading
            variant="card"
            autonym={autonym}
            autonymIso639_3={isoCode}
          />
        }
        detailText={endonymBody ? endonymText : undefined}
      >
        {endonymBody ? (
          <div className="flex flex-col gap-3">
            {endonyms.map((entry, index) => (
              <NameOriginCard
                key={`endonym-${index}`}
                record={entry.record}
                nameShown={!sameName(entry.record.nameText, autonym)}
                confidenceChip={chipFor(entry, language)}
                language={language}
              />
            ))}
          </div>
        ) : undefined}
      </FicheTile>

      {(imposed.length > 0 || spellings.length > 0) && (
        <FicheTile
          language={language}
          title={copy.exonyms}
          closedFact={
            imposed.length > 0
              ? copy.exonymCount(imposed.length)
              : spellings.map((entry) => entry.nameText).join(" · ")
          }
          detailText={[
            ...imposed.map((entry) => recordText(entry.record)),
            ...spellings.map((entry) => entry.nameText),
          ].join(" ")}
        >
          <div className="flex flex-col gap-3">
            {imposed.map(({ record, dossier }, index) => (
              <div key={`exonym-${index}`} className="flex flex-col gap-2">
                <NameOriginCard
                  record={record}
                  confidenceChip={
                    dossier ? chipFor(dossier, language) : undefined
                  }
                  language={language}
                />
                {record.imposedBy ? (
                  <DoctrineLinkCard
                    slug="endonymes-vs-exonymes"
                    language={language}
                  />
                ) : null}
              </div>
            ))}
            <NameSpellingHistory
              spellings={spellings.map((entry) => ({
                nameText: entry.nameText,
                periodLabel: entry.periodLabel,
                confidenceChip: chipFor(entry, language),
              }))}
            />
          </div>
        </FicheTile>
      )}

      {originOfExonyms && (
        <FicheTile
          language={language}
          title={copy.origin}
          closedFact={splitLeadSentence(originOfExonyms).lead}
          bodyRestatesPreview
        >
          <p className="afh-tile-prose">{originOfExonyms}</p>
        </FicheTile>
      )}

      {usage && (
        <FicheTile
          language={language}
          title={copy.currentUsageAndCritique}
          closedFact={splitLeadSentence(usage).lead}
          bodyRestatesPreview
        >
          <p className="afh-tile-prose">{usage}</p>
          {contemporaryUsage && whyProblematic ? (
            <p>
              <strong>{copy.problematic}</strong> {whyProblematic}
            </p>
          ) : null}
        </FicheTile>
      )}
    </FicheTiles>
  );
}
