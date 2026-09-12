import type { ParagraphNoteData } from "@/components/people/peopleFicheNotes";
import { FieldProvenanceMarker } from "@/components/fiche/FieldProvenanceMarker";
import { FicheTile } from "@/components/fiche/FicheTile";
import { peopleCopy } from "@/lib/i18n/copy/people";
import {
  hasRelatedContent,
  type PeopleCultureData,
  type PeopleRelatedData,
  type PeopleRelationPreviewItem,
} from "@/lib/peopleDataTransformer";
import type { AssociatedGroup } from "@/lib/people/associatedPeopleLinks";
import type { Language } from "@/types/shared";

import { PeopleCultureGrid } from "./PeopleCultureGrid";
import { PeopleRelatedPeoplesSection } from "./PeopleRelatedPeoplesSection";
import { ProseWithChip } from "./ProseWithChip";

export interface PeopleCultureChapterProps {
  culture: PeopleCultureData;
  related: PeopleRelatedData;
  associatedGroups: AssociatedGroup[];
  peopleId?: string;
  relationsPreview?: PeopleRelationPreviewItem[];
  cultureNotes?: Partial<Record<string, ParagraphNoteData>>;
  language: Language;
}

const organisationFields = [
  "politicalSystem",
  "clanOrganization",
  "ageClassSystems",
  "roleOfLineages",
  "religiousAuthority",
] as const;

/** Only a sentence already written in the source can serve as a closed fact. */
function splitSourcedProse(text: string) {
  const match = text.trim().match(/^([\s\S]{20,}?[.!?])\s+([\s\S]+)$/);
  return match
    ? { fact: match[1], detail: match[2] }
    : { fact: text.trim(), detail: null };
}

function CultureProseTile({
  title,
  text,
  note,
  language,
}: {
  title: string;
  text: string;
  note?: ParagraphNoteData;
  language: Language;
}) {
  const { fact, detail } = splitSourcedProse(text);
  return (
    <FicheTile
      title={title}
      closedFact={fact}
      detailText={detail ?? undefined}
      closedFactContent={
        detail ? (
          fact
        ) : (
          <ProseWithChip text={text} note={note} language={language} />
        )
      }
    >
      {detail ? (
        <ProseWithChip text={detail} note={note} language={language} />
      ) : undefined}
    </FicheTile>
  );
}

// @req REQ-003 REQ-097
export function PeopleCultureChapter({
  culture,
  related,
  associatedGroups,
  peopleId,
  relationsPreview = [],
  cultureNotes,
  language,
}: PeopleCultureChapterProps) {
  const hasRitesAndSymbols = Boolean(culture.majorRites || culture.symbols);
  const hasArts = Boolean(culture.artsAndMusic);
  const hasSpirituality = Boolean(culture.spiritualities);
  const hasNeighbours =
    hasRelatedContent(related) || relationsPreview.length > 0;
  if (!hasRitesAndSymbols && !hasArts && !hasSpirituality && !hasNeighbours) {
    return <FieldProvenanceMarker state="missing" language={language} />;
  }

  const copy = peopleCopy[language];
  const tileCopy = copy.chapterDetails;
  const ritesFact = culture.majorRites || culture.symbols || "";
  const ritesDetail = culture.majorRites ? culture.symbols : undefined;
  const closedRitesNote = culture.majorRites
    ? cultureNotes?.majorRites
    : cultureNotes?.symbols;
  const organisationFactKey = organisationFields.find((key) => related[key]);
  const organisationFact = organisationFactKey
    ? related[organisationFactKey] || ""
    : associatedGroups.length > 0
      ? tileCopy.associatedGroups(associatedGroups.length)
      : tileCopy.documentedRelations(relationsPreview.length);
  const relatedDetail = organisationFactKey
    ? { ...related, [organisationFactKey]: undefined }
    : related;
  const hasOrganisationDetail =
    organisationFields.some((key) => relatedDetail[key]) ||
    associatedGroups.length > 0 ||
    (Boolean(peopleId) && relationsPreview.length > 0);
  const organisationDetailText = [
    ...organisationFields.map((key) => relatedDetail[key]),
    ...associatedGroups.map((group) => group.label),
    ...(peopleId
      ? relationsPreview.map((relation) => relation.neighborName)
      : []),
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {hasRitesAndSymbols && (
        <FicheTile
          title={tileCopy.cultureRitesAndSymbols}
          closedFact={ritesFact}
          detailText={closedRitesNote ? undefined : ritesDetail}
          closedFactContent={closedRitesNote ? undefined : ritesFact}
        >
          {closedRitesNote ? (
            <PeopleCultureGrid
              data={culture}
              fields={["majorRites", "symbols"]}
              notes={cultureNotes}
              language={language}
            />
          ) : ritesDetail ? (
            <PeopleCultureGrid
              data={culture}
              fields={["symbols"]}
              notes={cultureNotes}
              language={language}
            />
          ) : undefined}
        </FicheTile>
      )}
      {hasArts && (
        <CultureProseTile
          title={copy.cultureFields.artsAndMusic}
          text={culture.artsAndMusic!}
          note={cultureNotes?.artsAndMusic}
          language={language}
        />
      )}
      {hasSpirituality && (
        <CultureProseTile
          title={copy.cultureFields.spiritualities}
          text={culture.spiritualities!}
          note={cultureNotes?.spiritualities}
          language={language}
        />
      )}
      {hasNeighbours && (
        <FicheTile
          title={copy.sections.neighbours}
          closedFact={organisationFact}
          detailText={organisationDetailText}
        >
          {hasOrganisationDetail ? (
            <PeopleRelatedPeoplesSection
              data={relatedDetail}
              language={language}
              peopleId={peopleId}
              relationsPreview={relationsPreview}
              associatedGroups={associatedGroups}
            />
          ) : undefined}
        </FicheTile>
      )}
    </div>
  );
}
