/**
 * Segment × template × field-path × difficulty policy for the Smart Quiz
 * engine (Epic 10, Story 10.4, ETNI-493).
 *
 * FR68 — the difficulty ladder (`DIFFICULTY_RUNGES`) is scoped per audience
 * segment; the reached rung is persisted client-side only (localStorage),
 * never here.
 *
 * FR69 — the children segment excludes any question whose target field path
 * is not explicitly allowlisted (`CHILDREN_FIELD_PATH_ALLOWLIST`,
 * `isAllowedForSegment`), per the editorial doctrine's sensitive-topic
 * clause (doctrine slug: `topics-sensibles`,
 * supabase/migrations/018_editorial_doctrine_seed.sql). Allowlist semantics:
 * anything not explicitly listed is denied — this is a default-deny
 * predicate, not a blocklist.
 *
 * GOVERNANCE: `CHILDREN_FIELD_PATH_ALLOWLIST` is an editorial decision, not
 * an engineering one — its scope is the Epic 10 module spec's Open Question
 * #2 (`_bmad-output/planning-artifacts/module-specs/epic-10-smart-quiz.md`)
 * and ships here as an initial proposal pending advisory sign-off. Any PR
 * that edits this allowlist MUST cite the `topics-sensibles` doctrine
 * clause in its description and flag the change for advisory sign-off.
 */

export type QuizAudience =
  | "children"
  | "teens"
  | "adults"
  | "university"
  | "professionals";

export type QuizTemplateId = "T1" | "T2" | "T3" | "T4" | "T5";

// @req REQ-097 FR68 FR69
export const QUIZ_AUDIENCES: readonly QuizAudience[] = [
  "children",
  "teens",
  "adults",
  "university",
  "professionals",
];

// @req REQ-097 FR68 FR69
export const QUIZ_TEMPLATE_IDS: readonly QuizTemplateId[] = [
  "T1",
  "T2",
  "T3",
  "T4",
  "T5",
];

export interface DifficultyRange {
  min: number;
  max: number;
}

/** Per-segment difficulty rung range (FR68) — initial proposal. */
// @req REQ-097 FR68
export const DIFFICULTY_RUNGES: Record<QuizAudience, DifficultyRange> = {
  children: { min: 1, max: 2 },
  teens: { min: 1, max: 3 },
  adults: { min: 2, max: 4 },
  university: { min: 3, max: 5 },
  professionals: { min: 3, max: 5 },
};

/**
 * Target field path for each question template, per the Epic 10 spec's
 * template table ("Question templates" section).
 */
// @req REQ-097 FR69
export const TEMPLATE_FIELD_PATHS: Record<QuizTemplateId, string> = {
  T1: "languageFamilyId",
  T2: "content.appellations.selfAppellation",
  T3: "content.demography.distributionByCountry",
  T4: "content.languages.mainLanguage",
  T5: "content.languages.isoCodes",
};

/**
 * Children field-path allowlist (FR69) — initial proposal, Open Question #2.
 * See the module doc comment above for the governance requirement on edits.
 */
// @req REQ-097 FR69
export const CHILDREN_FIELD_PATH_ALLOWLIST: readonly string[] = [
  "content.appellations.selfAppellation",
  "content.appellations.mainName",
  "languageFamilyId",
  "content.languages.mainLanguage",
  "currentCountries",
  "content.culture.symbols",
  "content.culture.artsAndMusic",
];

/**
 * Default-deny allowlist predicate (FR69). Only the `children` segment is
 * restricted — every other segment has unrestricted field-path access.
 */
// @req REQ-097 FR69
export function isAllowedForSegment(
  fieldPath: string,
  audience: QuizAudience
): boolean {
  if (audience !== "children") {
    return true;
  }
  return CHILDREN_FIELD_PATH_ALLOWLIST.includes(fieldPath);
}

/**
 * Template availability per segment, derived declaratively from
 * `TEMPLATE_FIELD_PATHS` filtered through `isAllowedForSegment` — never
 * scattered conditionals.
 */
// @req REQ-097 FR68 FR69
export const TEMPLATE_AVAILABILITY: Record<
  QuizAudience,
  readonly QuizTemplateId[]
> = QUIZ_AUDIENCES.reduce(
  (availability, audience) => {
    availability[audience] = QUIZ_TEMPLATE_IDS.filter((templateId) =>
      isAllowedForSegment(TEMPLATE_FIELD_PATHS[templateId], audience)
    );
    return availability;
  },
  {} as Record<QuizAudience, readonly QuizTemplateId[]>
);
