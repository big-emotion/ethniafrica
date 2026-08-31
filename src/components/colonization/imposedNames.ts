/**
 * Read-only selector mapping Epic 8's names surface to imposed-name view
 * models (Epic 13, Story 13.10, ETNI-534 — FR88, FR90).
 *
 * Imports Epic 8's existing dossier shape (`PeopleNamesDossier`, produced by
 * `getPeopleNamesDossier` in `src/api/v2/services/names.ts`) — no new
 * Supabase query, no name data duplicated. A people is represented only when
 * it carries a genuine imposed-name record (`imposedBy` set); nothing is
 * derived from appellations prose or invented.
 */

import type {
  NameRecordType,
  PeopleNameRecord,
  PeopleNamesDossier,
} from "@/api/v2/schemas/names";
import { getPeopleRoute } from "@/lib/routing";

export interface ImposedNameViewModel {
  peopleId: string;
  endonym: string;
  endonymLanguage: string | null;
  imposedName: string;
  imposedNameType: NameRecordType;
  imposedBy: string | null;
  impositionPeriod: string | null;
  whyProblematic: string | null;
  confidenceScore: number | null;
  sourceCount: number;
  lastHumanAuditAt: string | null;
  atlasHref: string;
}

function findImposedRecord(
  dossier: PeopleNamesDossier
): PeopleNameRecord | null {
  return (
    dossier.names.find((record) => Boolean(record.imposition?.imposedBy)) ??
    null
  );
}

function endonymLanguageOf(dossier: PeopleNamesDossier): string | null {
  return (
    dossier.names.find((record) => record.nameType === "endonym")
      ?.languageOfOrigin ?? null
  );
}

/** Builds a link to the people's Epic 8 Names Atlas record (same pattern as `NamesAtlasView`). */
function atlasHrefFor(peopleId: string): string {
  return `${getPeopleRoute("fr", peopleId)}#noms`;
}

// @req REQ-104
export function mapImposedNames(
  dossiers: PeopleNamesDossier[]
): ImposedNameViewModel[] {
  const viewModels: ImposedNameViewModel[] = [];

  for (const dossier of dossiers) {
    if (!dossier.autonym) continue;

    const imposedRecord = findImposedRecord(dossier);
    if (!imposedRecord) continue;

    viewModels.push({
      peopleId: dossier.peopleId,
      endonym: dossier.autonym,
      endonymLanguage: endonymLanguageOf(dossier),
      imposedName: imposedRecord.nameText,
      imposedNameType: imposedRecord.nameType,
      imposedBy: imposedRecord.imposition?.imposedBy ?? null,
      impositionPeriod: imposedRecord.imposition?.impositionPeriod ?? null,
      whyProblematic: imposedRecord.imposition?.whyProblematic ?? null,
      confidenceScore: imposedRecord.confidence?.score ?? null,
      sourceCount: imposedRecord.sources.length,
      lastHumanAuditAt: imposedRecord.confidence?.recomputedAt ?? null,
      atlasHref: atlasHrefFor(dossier.peopleId),
    });
  }

  return viewModels;
}
