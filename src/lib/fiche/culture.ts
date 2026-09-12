import { ficheCopy } from "@/lib/i18n/copy/fiche";
import { peopleCopy } from "@/lib/i18n/copy/people";
import type { AssociatedGroup } from "@/lib/people/associatedPeopleLinks";
import type {
  PeopleCultureData,
  PeopleRelatedData,
} from "@/lib/peopleDataTransformer";
import type { CountryDetail } from "@/types/afrik-frontend";
import type { Language } from "@/types/shared";

import { splitLeadSentence } from "./prose";

/**
 * One culture chapter for both records (operator ruling, 2026-09-12). The
 * adapters return data tiles; `FicheCultureChapter` draws them. Every field
 * is carried whole — the country grid used to reduce each one to three
 * keywords with nothing to open — and folded behind its opening words.
 */

interface CulturePassage {
  /** The corpus field, so a note call can find it. */
  field?: string;
  /** A term above the passage when a tile gathers several fields. */
  label?: string;
  text: string;
}

interface CulturePill {
  label: string;
  /** The record this group names, when the atlas holds exactly one. */
  peopleId?: string;
}

export interface CultureTile {
  key: string;
  label: string;
  value?: string;
  preview: string;
  passages: CulturePassage[];
  pills?: CulturePill[];
  /** Words the record adds inside the tile, so the tile knows it has a body. */
  extraText?: string[];
}

function passageTile(
  key: string,
  label: string,
  candidates: CulturePassage[]
): CultureTile | null {
  const passages = candidates
    .filter((passage) => passage.text.trim())
    .map((passage) => ({ ...passage, text: passage.text.trim() }));
  if (!passages.length) return null;
  return {
    key,
    label,
    preview: splitLeadSentence(passages[0].text).lead,
    passages,
  };
}

/** "Karanga — sous-groupe dominant du centre-sud" → "Karanga". */
function leadingName(label: string): string {
  return label.split(/\s+[—–]\s+/u)[0].trim();
}

interface PeopleCultureInput {
  culture: PeopleCultureData;
  related: PeopleRelatedData;
  relationsWithNeighbors?: string;
  associatedGroups: AssociatedGroup[];
  /** The neighbours of the record's sourced ego network, by name. */
  relationNames: string[];
}

// @req REQ-097 REQ-153
export function peopleCultureTiles(
  input: PeopleCultureInput,
  language: Language
): CultureTile[] {
  const labels = ficheCopy[language].culture;
  const fields = peopleCopy[language].relatedFields;
  const { culture, related } = input;

  const tiles: Array<CultureTile | null> = [
    passageTile("rites", labels.rites, [
      { field: "majorRites", text: culture.majorRites ?? "" },
    ]),
    passageTile("symbols", labels.symbols, [
      { field: "symbols", text: culture.symbols ?? "" },
    ]),
    passageTile("arts", labels.arts, [
      { field: "artsAndMusic", text: culture.artsAndMusic ?? "" },
    ]),
    passageTile("spiritualities", labels.spiritualities, [
      { field: "spiritualities", text: culture.spiritualities ?? "" },
    ]),
    passageTile("organisation", labels.organisation, [
      {
        field: "politicalSystem",
        label: fields.politicalSystem,
        text: related.politicalSystem ?? "",
      },
      {
        field: "clanOrganization",
        label: fields.clanOrganisation,
        text: related.clanOrganization ?? "",
      },
      {
        field: "ageClassSystems",
        label: fields.ageGrades,
        text: related.ageClassSystems ?? "",
      },
      {
        field: "roleOfLineages",
        label: fields.lineages,
        text: related.roleOfLineages ?? "",
      },
      {
        field: "religiousAuthority",
        label: fields.religiousAuthority,
        text: related.religiousAuthority ?? "",
      },
    ]),
  ];

  const relationText = input.relationsWithNeighbors?.trim();
  if (relationText || input.relationNames.length) {
    tiles.push({
      key: "relations",
      label: labels.relations,
      preview: relationText
        ? splitLeadSentence(relationText).lead
        : input.relationNames.slice(0, 3).join(" · "),
      passages: relationText
        ? [{ field: "relationsWithNeighbors", text: relationText }]
        : [],
      ...(input.relationNames.length ? { extraText: input.relationNames } : {}),
    });
  }

  if (input.associatedGroups.length) {
    const names = input.associatedGroups.map((group) =>
      leadingName(group.label)
    );
    const rest = names.length - 3;
    tiles.push({
      key: "groups",
      label: labels.groups,
      value: peopleCopy[language].chapterDetails.associatedGroups(names.length),
      preview: [...names.slice(0, 3), ...(rest > 0 ? [`+${rest}`] : [])].join(
        " · "
      ),
      passages: [],
      pills: input.associatedGroups.map((group) => ({
        label: group.label,
        ...(group.peopleId ? { peopleId: group.peopleId } : {}),
      })),
    });
  }

  return tiles.filter((tile): tile is CultureTile => tile !== null);
}

// @req REQ-092 REQ-153
export function countryCultureTiles(
  culture: CountryDetail["culture"],
  language: Language
): CultureTile[] {
  const labels = ficheCopy[language].culture;
  return [
    passageTile("religions", labels.religions, [
      { text: culture?.dominantReligions ?? "" },
    ]),
    passageTile("lifestyles", labels.lifestyles, [
      { text: culture?.lifestyles ?? "" },
    ]),
    passageTile("organisation", labels.organisation, [
      { text: culture?.socialOrganization ?? "" },
    ]),
    passageTile("relations", labels.relations, [
      { text: culture?.regionalRelations ?? "" },
    ]),
    passageTile("traditions", labels.traditions, [
      { text: culture?.culturalTraditions ?? "" },
    ]),
  ].filter((tile): tile is CultureTile => tile !== null);
}
