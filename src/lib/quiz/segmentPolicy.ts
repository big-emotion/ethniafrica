/**
 * Which fiche field each quiz template asks about (Epic 10, Story 10.4,
 * ETNI-493).
 *
 * This file used to carry a second policy alongside this one: an audience axis
 * (children / teens / adults / university / professionals), a per-audience
 * difficulty rung range (FR68) and a children field-path allowlist (FR69). All
 * three are retired — a session is now scoped by entity, see
 * `src/lib/quiz/quizScope.ts`.
 *
 * **What the allowlist was actually doing, since retiring it is an editorial
 * change and not only an engineering one.** `CHILDREN_FIELD_PATH_ALLOWLIST`
 * was written against the `topics-sensibles` doctrine clause (migration
 * `018_editorial_doctrine_seed.sql`), but measured against the five templates
 * that exist it excluded exactly one thing from the children segment: T5, the
 * ISO 639-3 code of a language. Not a sensitive topic — a dull one. None of
 * T1-T5 reads colonisation, violence or any event-derived path, so the clause
 * had nothing to bite on.
 *
 * That does not make its removal free. The doctrine still says sensitive
 * content must not reach a children's surface, and after this change the quiz
 * has **no enforcement point for it at all** — the guarantee now rests on
 * template authorship alone. `colonizationChildrenExclusion.test.tsx` is
 * rewritten to assert that directly, over `TEMPLATE_FIELD_PATHS`, which is
 * where the property really lives. A future template touching sensitive
 * content needs an editorial gate written for it, and that gate needs advisory
 * sign-off — it cannot be inherited from here.
 */

import type { QuizTemplateId } from "@/types/quiz";

// Re-exported so the many callers that read the union from here keep working;
// `@/types/quiz` owns it, so the two can no longer drift apart.
export type { QuizTemplateId };

// @req REQ-097 FR69
export const QUIZ_TEMPLATE_IDS: readonly QuizTemplateId[] = [
  "T1",
  "T2",
  "T3",
  "T4",
  "T5",
  "T6",
  "T7",
  "T8",
  "T9",
  "T10",
  "T11",
  "T12",
];

/**
 * Target field path for each question template, per the Epic 10 spec's
 * template table ("Question templates" section).
 *
 * T1-T5 ask about a field whose value is an atom, so the atom is the answer.
 * T6-T11 read a prose rubric and **invert**: the fragment becomes the stimulus
 * and the people becomes the answer, which is how the atlas's own subject
 * matter — rites, beliefs, kingdoms, migrations — becomes playable at all.
 * T12 names its subject and asks which of that people's own exonyms the corpus
 * puts on trial.
 */
// @req REQ-097 FR69
export const TEMPLATE_FIELD_PATHS: Record<QuizTemplateId, string> = {
  T1: "languageFamilyId",
  T2: "content.appellations.selfAppellation",
  T3: "content.demography.distributionByCountry",
  T4: "content.languages.mainLanguage",
  T5: "content.languages.isoCodes",
  T6: "content.culture.majorRites",
  T7: "content.culture.spiritualities",
  T8: "content.culture.symbols",
  T9: "content.historicalRole.kingdomsOrChiefdoms",
  T10: "content.organization.traditionalPoliticalSystem",
  T11: "content.origins.migrationRoutes",
  T12: "content.appellations.whyProblematic",
};

/**
 * The templates whose answer is the subject itself.
 *
 * They are the exception the games charter §2 carves out — a round names its
 * subject *unless the subject is what is being guessed* — and several places
 * downstream have to know which templates take it: the stimulus is what the
 * reader is shown, the distractor pool is peoples rather than field values,
 * and the staleness check compares the fragment rather than the answer.
 */
// @req REQ-097
export const INVERSION_TEMPLATE_IDS: readonly QuizTemplateId[] = [
  "T6",
  "T7",
  "T8",
  "T9",
  "T10",
  "T11",
];

// @req REQ-097
export function isInversionTemplate(templateId: QuizTemplateId): boolean {
  return INVERSION_TEMPLATE_IDS.includes(templateId);
}

/**
 * What a question is *about* — the axis a reader picks a track along, and the
 * one the bank was blind to.
 *
 * A theme is a property of the template, so it is derived rather than stored:
 * no column, no backfill, and no rebuild to introduce the facet. The bank does
 * not have to be rewritten for a reader to be able to filter it.
 *
 * Twelve templates over nine themes rather than one theme each: `majorRites`
 * and `symbols` are both what a people does and shows, and splitting them
 * would give the picker two entries a reader could not tell apart.
 */
export type QuizThemeId =
  | "parente-linguistique"
  | "noms"
  | "langues"
  | "territoire"
  | "rites-et-culture"
  | "croyances"
  | "royaumes-et-histoire"
  | "organisation"
  | "migrations";

// @req REQ-121
export const TEMPLATE_THEMES: Record<QuizTemplateId, QuizThemeId> = {
  T1: "parente-linguistique",
  T2: "noms",
  T3: "territoire",
  T4: "langues",
  T5: "langues",
  T6: "rites-et-culture",
  T7: "croyances",
  T8: "rites-et-culture",
  T9: "royaumes-et-histoire",
  T10: "organisation",
  T11: "migrations",
  T12: "noms",
};

/** Picker order — the familiar themes first, the ones the atlas exists to show last. */
// @req REQ-121
export const QUIZ_THEME_IDS: readonly QuizThemeId[] = [
  "noms",
  "langues",
  "parente-linguistique",
  "territoire",
  "rites-et-culture",
  "croyances",
  "royaumes-et-histoire",
  "organisation",
  "migrations",
];

// @req REQ-121
export const QUIZ_THEME_LABELS_FR: Record<QuizThemeId, string> = {
  "parente-linguistique": "Parenté linguistique",
  noms: "Noms et appellations",
  langues: "Langues",
  territoire: "Territoire",
  "rites-et-culture": "Rites et culture",
  croyances: "Croyances",
  "royaumes-et-histoire": "Royaumes et histoire",
  organisation: "Organisation sociale",
  migrations: "Migrations",
};

/**
 * The theme a stored question belongs to, read from the field path rather than
 * the template id.
 *
 * The serving side carries `field_path` on the light candidate row it bands and
 * orders (`quizService`'s `CandidateRow`), and adding `template_id` beside it
 * would widen every read for a value the path already determines.
 */
// @req REQ-121
export function themeOfFieldPath(fieldPath: string): QuizThemeId | null {
  for (const templateId of QUIZ_TEMPLATE_IDS) {
    const path = TEMPLATE_FIELD_PATHS[templateId];
    const matches =
      path === TEMPLATE_FIELD_PATHS.T3
        ? fieldPath.startsWith(path)
        : fieldPath === path;
    if (matches) return TEMPLATE_THEMES[templateId];
  }
  return null;
}

// @req REQ-121
export function isQuizThemeId(value: string): value is QuizThemeId {
  return (QUIZ_THEME_IDS as readonly string[]).includes(value);
}
