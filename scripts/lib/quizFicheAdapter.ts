/**
 * Supabase row -> QuizPeopleFixture / FicheEntry mapping for the quiz
 * generation sweep (Story 10.5, ETNI-494). Pure mapping only — no Supabase
 * client calls live here — so it is testable with plain row fixtures rather
 * than a mocked client.
 *
 * Schema notes (post migration 015_module_zero_fabric_align.sql):
 *  - `sources.tier` is constrained to the three SourceTier values (see the
 *    `sources_tier_check` constraint, migration 041); `sources.verified_at`
 *    marks a human-confirmed-reachable source.
 *  - `assertions.source_ids` is a UUID[] (the legacy scalar `source_id` was
 *    dropped); `confidence_scores` is entity-scoped (one row per
 *    (entity_type, entity_id), not per assertion).
 *  - The `content.demography.distributionByCountry` field is asserted as one
 *    assertion row per country share (field_path prefixed, not exact); this
 *    adapter picks the first matching row per entity as the field's
 *    representative assertion, matching the "one assertion per field path"
 *    shape `quiz_questions.assertion_id` expects.
 */

import type { AutonymExonymName, QuizPeopleFixture } from "@/types/quiz";
import { toQuizConfidenceScore } from "@/lib/quiz/eligibility";
import type {
  QuizAssertionSource,
  QuizEligibilityInput,
} from "@/lib/quiz/eligibility";
import { toSourceTier } from "@/types/sources";
import { TEMPLATE_FIELD_PATHS } from "@/lib/quiz/segmentPolicy";
import type { AssertionBinding } from "./quizGeneration";

export interface PeopleContent {
  appellations?: {
    mainName?: string;
    selfAppellation?: string;
    exonyms?: string[];
  };
  languages?: {
    mainLanguage?: string;
    isoCodes?: string[];
  };
  demography?: {
    distributionByCountry?: Array<{
      country?: string;
      percentage?: number;
    }>;
  };
}

export interface PeopleRow {
  id: string;
  name_main: string;
  language_family_id: string | null;
  content: PeopleContent | null;
}

export type BaseEligibility = Omit<QuizEligibilityInput, "assertionSources">;

export interface ConfidenceScoreRow {
  entity_id: string;
  score: number | null;
  last_human_audit_at: string | null;
  open_flag_count: number | null;
}

export interface AssertionRow {
  id: string;
  entity_id: string;
  field_path: string;
  source_ids: string[] | null;
}

export interface SourceRow {
  id: string;
  tier: string | null;
  verified_at: string | null;
}

/**
 * Normalizes an `assertions.field_path` value to the exact template field
 * path it backs, or null if it doesn't back any T1-T5 template. Demography
 * rows are per-country (`content.demography.distributionByCountry` prefix),
 * every other template field is an exact match.
 */
export function normalizeFieldPath(fieldPath: string): string | null {
  if (
    fieldPath === TEMPLATE_FIELD_PATHS.T1 ||
    fieldPath === TEMPLATE_FIELD_PATHS.T2 ||
    fieldPath === TEMPLATE_FIELD_PATHS.T4 ||
    fieldPath === TEMPLATE_FIELD_PATHS.T5
  ) {
    return fieldPath;
  }
  if (fieldPath.startsWith(TEMPLATE_FIELD_PATHS.T3)) {
    return TEMPLATE_FIELD_PATHS.T3;
  }
  return null;
}

/**
 * Maps a `confidence_scores` row to the entity-scoped slice of
 * `QuizEligibilityInput` the FR65 gate needs. The scale conversion is
 * `toQuizConfidenceScore`, shared with the serve-time re-check so the sweep
 * and the server cannot disagree on what a score means.
 */
export function mapConfidenceRowToBaseEligibility(
  row: ConfidenceScoreRow | undefined
): BaseEligibility {
  return {
    confidenceScore: toQuizConfidenceScore(row?.score),
    lastHumanAuditAt: row?.last_human_audit_at ?? null,
    openFlagCount: row?.open_flag_count ?? 0,
  };
}

/**
 * Maps an `afrik_peoples` row to a QuizPeopleFixture. Returns null when a
 * field required by templates T1-T5 is missing — an incomplete fiche simply
 * yields no candidates rather than a fabricated fixture.
 */
export function mapPeopleRowToFiche(
  row: PeopleRow,
  familyNameById: ReadonlyMap<string, string>,
  countryNameById: ReadonlyMap<string, string>
): QuizPeopleFixture | null {
  const content = row.content ?? {};
  const selfAppellation = content.appellations?.selfAppellation;
  const mainLanguageName = content.languages?.mainLanguage;
  const isoCode = content.languages?.isoCodes?.[0];
  const familyName = row.language_family_id
    ? familyNameById.get(row.language_family_id)
    : undefined;

  if (
    !selfAppellation ||
    !mainLanguageName ||
    !isoCode ||
    !row.language_family_id ||
    !familyName
  ) {
    return null;
  }

  const distributionByCountry = (
    content.demography?.distributionByCountry ?? []
  )
    .filter(
      (entry): entry is { country: string; percentage: number } =>
        typeof entry.country === "string" &&
        typeof entry.percentage === "number"
    )
    .map((entry) => ({
      countryId: entry.country,
      countryNameFr: countryNameById.get(entry.country) ?? entry.country,
      percentage: entry.percentage,
    }));

  const subjectName: AutonymExonymName = {
    autonym: content.appellations?.mainName ?? row.name_main,
    exonym: content.appellations?.exonyms?.[0],
  };
  const mainLanguage: AutonymExonymName = { autonym: mainLanguageName };

  return {
    id: row.id,
    subjectName,
    languageFamilyId: row.language_family_id,
    languageFamilyNameFr: familyName,
    selfAppellation,
    distributionByCountry,
    mainLanguage,
    isoCode,
  };
}

/** Builds the per-field-path assertion bindings for one entity from its assertions + backing sources + base eligibility. */
export function buildAssertionBindings(
  entityAssertions: AssertionRow[],
  sourceById: ReadonlyMap<string, SourceRow>,
  baseEligibility: BaseEligibility
): Record<string, AssertionBinding> {
  const bindings: Record<string, AssertionBinding> = {};

  for (const assertion of entityAssertions) {
    const fieldPath = normalizeFieldPath(assertion.field_path);
    if (!fieldPath || bindings[fieldPath]) continue; // one representative assertion per field path

    const sourceIds = assertion.source_ids ?? [];
    const assertionSources: QuizAssertionSource[] = sourceIds
      .map((id) => sourceById.get(id))
      .filter((source): source is SourceRow => Boolean(source))
      .map((source) => ({
        tier: toSourceTier(source.tier),
        resolvable: source.verified_at !== null,
      }));

    bindings[fieldPath] = {
      assertionId: assertion.id,
      sourceIds,
      eligibility: { ...baseEligibility, assertionSources },
    };
  }

  return bindings;
}

/** Deduplicates a list of autonym-first names by autonym, preserving first occurrence. */
export function dedupeAutonyms(
  names: AutonymExonymName[]
): AutonymExonymName[] {
  const seen = new Set<string>();
  const out: AutonymExonymName[] = [];
  for (const name of names) {
    if (seen.has(name.autonym)) continue;
    seen.add(name.autonym);
    out.push(name);
  }
  return out;
}
