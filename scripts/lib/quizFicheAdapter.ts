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

import type {
  AutonymExonymName,
  QuizCountryFixture,
  QuizPeopleFixture,
} from "@/types/quiz";
import { proseOnly } from "@/lib/prose/ficheProse";
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
    whyProblematic?: string | null;
  };
  culture?: {
    majorRites?: string | null;
    spiritualities?: string | null;
    symbols?: string | null;
  };
  historicalRole?: {
    kingdomsOrChiefdoms?: string | null;
  };
  organization?: {
    traditionalPoliticalSystem?: string | null;
  };
  origins?: {
    migrationRoutes?: string[] | null;
  };
  languages?: {
    mainLanguage?: string;
    isoCodes?: string[];
  };
  demography?: {
    totalPopulation?: number;
    distributionByCountry?: Array<{
      country?: string;
      /** A head count. `percentage` exists on 32 of 1611 entries and is not read. */
      population?: number;
    }>;
  };
}

/** `afrik_countries.content`, reduced to the sections the country templates read. */
export interface CountryContent {
  historicalNames?: { colonization?: string | null };
  historicalFacts?: { precolonial?: string | null };
  culture?: { dominantReligions?: string | null };
  kingdoms?: Array<{ name?: string }>;
}

export interface CountryRow {
  id: string;
  name_fr: string;
  name_official?: string | null;
  etymology: string | null;
  name_origin_actor: string | null;
  content: CountryContent | null;
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
 * Normalizes an `assertions.field_path` value to the exact template field path
 * it backs, or null if it backs no template.
 *
 * Demography rows are written one per country, so T3 matches on its prefix;
 * every other template field is an exact match. Driven off the registry rather
 * than a hand-written list of ids — the list version silently stopped
 * recognising a path the day a template was added without editing it here, and
 * the symptom was `no_assertion` on a path that existed.
 */
export function normalizeFieldPath(fieldPath: string): string | null {
  for (const path of Object.values(TEMPLATE_FIELD_PATHS)) {
    if (path !== TEMPLATE_FIELD_PATHS.T3 && fieldPath === path) return path;
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
 * field required by the atomic templates is missing — an incomplete fiche
 * simply yields no candidates rather than a fabricated fixture.
 *
 * The guard used to hold an ISO code too, which dropped a fiche from the
 * eleven templates that never asked for one because of the single template
 * that did. T5 is retired, so the field is read by nothing and rejecting on it
 * would be rejecting on a value no round can use.
 */
export function mapPeopleRowToFiche(
  row: PeopleRow,
  familyNameById: ReadonlyMap<string, string>,
  countryNameById: ReadonlyMap<string, string>
): QuizPeopleFixture | null {
  const content = row.content ?? {};
  const selfAppellation = content.appellations?.selfAppellation;
  const mainLanguageName = content.languages?.mainLanguage;
  const familyName = row.language_family_id
    ? familyNameById.get(row.language_family_id)
    : undefined;

  if (
    !selfAppellation ||
    !mainLanguageName ||
    !row.language_family_id ||
    !familyName
  ) {
    return null;
  }

  // Read `population`, not `percentage`. The corpus writes a head count in all
  // 1611 distribution entries and a share in 32; filtering on the share left
  // T3 — "in which country does this people live" — existing for 20 peoples
  // out of 621, which is the single template a country track leans on.
  const distributionByCountry = (
    content.demography?.distributionByCountry ?? []
  )
    .filter(
      (entry): entry is { country: string; population: number } =>
        typeof entry.country === "string" &&
        typeof entry.population === "number"
    )
    .map((entry) => ({
      countryId: entry.country,
      countryNameFr: countryNameById.get(entry.country) ?? entry.country,
      population: entry.population,
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
    totalPopulation:
      typeof content.demography?.totalPopulation === "number"
        ? content.demography.totalPopulation
        : null,
    // Deliberately outside the all-or-nothing guard above. A fiche missing its
    // rites loses one round of twelve; requiring them would take it out of the
    // eleven it already answers.
    exonyms: content.appellations?.exonyms ?? [],
    whyProblematic: content.appellations?.whyProblematic ?? null,
    // The corpus carries the markup; a stimulus and an assertion statement see
    // bare prose. A field holding no prose at all — a serialised JSON object,
    // say — yields null here, and its template builds no round.
    rubrics: {
      T6: proseOnly(content.culture?.majorRites) ?? null,
      T7: proseOnly(content.culture?.spiritualities) ?? null,
      T8: proseOnly(content.culture?.symbols) ?? null,
      T9: proseOnly(content.historicalRole?.kingdomsOrChiefdoms) ?? null,
      T10: proseOnly(content.organization?.traditionalPoliticalSystem) ?? null,
      T11: proseOnly(content.origins?.migrationRoutes) ?? null,
    },
  };
}

/**
 * Maps a country row to the fixture its templates read.
 *
 * No all-or-nothing guard, unlike the people mapper. A country fiche is a
 * single editorial document that always exists — the 54 are the corpus's
 * skeleton — so a missing rubric costs it one round rather than removing it
 * from the bank. `nameOfficial` has no column of its own (migration 006 writes
 * five columns and drops it), so the leak rule sees only the usual name unless
 * the row happens to carry one.
 */
// @req REQ-121
export function mapCountryRowToFiche(row: CountryRow): QuizCountryFixture {
  const content = row.content ?? {};
  return {
    id: row.id,
    subjectName: { autonym: row.name_fr },
    selfAppellation: row.name_official ?? row.name_fr,
    exonyms: [],
    rubrics: {
      T13: row.etymology,
      T14: row.name_origin_actor,
      T15: content.historicalNames?.colonization ?? null,
      T17: content.historicalFacts?.precolonial ?? null,
      T18: content.culture?.dominantReligions ?? null,
    },
    kingdomNames: (content.kingdoms ?? [])
      .map((kingdom) => kingdom?.name)
      .filter((name): name is string => Boolean(name?.trim())),
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
