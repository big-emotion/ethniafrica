/**
 * Identity view-model derivation — Epic 15 · Story 15.3 (ETNI-811, FR96).
 *
 * Pure selection/derivation for the fiche hero's identity panel: picks the
 * primary endonym, the secondary/imposed exonym, and the imposition
 * context from a people's name dossier (`getPeopleNamesDossier`), with a
 * sourced fallback to the canonical AFRIK name when no `endonym`
 * name_record exists. Never fabricates an endonym (R4) — the fallback
 * carries no `lang` claim and points at a Tier 1/2 source line.
 */

import type {
  PeopleNameRecord,
  PeopleNamesDossier,
} from "@/api/v2/schemas/names";
import type { FichePanelSourceLine } from "@/types/fiche";

export interface IdentityImposition {
  imposedBy: string | null;
  impositionPeriod: string | null;
  whyProblematic: string | null;
  contemporaryUsage: string | null;
}

export interface IdentityConfidence {
  score: number | null;
  sourceCount: number | null;
  lastHumanAuditAt: string | null;
}

export interface IdentityViewModel {
  /** Primary heading text — the endonym, or the fallback AFRIK name (isFallback=true). */
  primaryText: string;
  /** ISO 639-3 code for `primaryText`; null when the origin can't be asserted (fallback path — R4). */
  primaryLang: string | null;
  /** True when no endonym name_record exists and primaryText is the canonical AFRIK fallback. */
  isFallback: boolean;
  /** Secondary/exonym name text, shown beside the primary heading. Null when none exists. */
  secondaryText: string | null;
  /** Imposition context, present only when an imposed record (imposedBy set) exists. */
  imposition: IdentityImposition | null;
  sourceLine: FichePanelSourceLine;
  confidence: IdentityConfidence;
}

const FALLBACK_SOURCE_LINE: FichePanelSourceLine = {
  label: "Source : fiche AFRIK",
};

function findImposedRecord(
  names: PeopleNameRecord[]
): PeopleNameRecord | undefined {
  return names.find((record) => Boolean(record.imposition?.imposedBy));
}

function toSourceLine(
  record: PeopleNameRecord | undefined
): FichePanelSourceLine {
  const source = record?.sources[0];
  if (!source) return FALLBACK_SOURCE_LINE;
  return { label: source.title, href: source.url ?? undefined };
}

function toConfidence(
  record: PeopleNameRecord | undefined
): IdentityConfidence {
  return {
    score: record?.confidence?.score ?? null,
    sourceCount: record ? record.sources.length : null,
    lastHumanAuditAt: record?.confidence?.recomputedAt ?? null,
  };
}

// @req REQ-091
export function deriveIdentityViewModel(
  dossier: PeopleNamesDossier,
  fallbackNameMain: string
): IdentityViewModel {
  const endonymRecord = dossier.names.find(
    (record) => record.nameType === "endonym"
  );
  const imposedRecord = findImposedRecord(dossier.names);
  const imposition: IdentityImposition | null = imposedRecord?.imposition
    ? {
        imposedBy: imposedRecord.imposition.imposedBy,
        impositionPeriod: imposedRecord.imposition.impositionPeriod,
        whyProblematic: imposedRecord.imposition.whyProblematic,
        contemporaryUsage: imposedRecord.imposition.contemporaryUsage,
      }
    : null;

  if (endonymRecord) {
    return {
      primaryText: endonymRecord.nameText,
      primaryLang: endonymRecord.languageOfOrigin,
      isFallback: false,
      secondaryText: imposedRecord?.nameText ?? null,
      imposition,
      sourceLine: toSourceLine(endonymRecord),
      confidence: toConfidence(endonymRecord),
    };
  }

  return {
    primaryText: fallbackNameMain,
    primaryLang: null,
    isFallback: true,
    secondaryText: imposedRecord?.nameText ?? null,
    imposition,
    sourceLine: toSourceLine(imposedRecord),
    confidence: toConfidence(imposedRecord),
  };
}
