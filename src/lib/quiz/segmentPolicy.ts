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
 * ISO 639-3 code of a language. Not a sensitive topic — a dull one, and one
 * dull enough that the template itself was later retired under games charter
 * §8. None of the atomic templates reads colonisation, violence or any
 * event-derived path, so the clause had nothing to bite on.
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

import type { QuizEntityType, QuizTemplateId } from "@/types/quiz";

// Re-exported so the many callers that read the union from here keep working;
// `@/types/quiz` owns it, so the two can no longer drift apart.
export type { QuizTemplateId };

// @req REQ-097 FR69
export const QUIZ_TEMPLATE_IDS: readonly QuizTemplateId[] = [
  "T1",
  "T2",
  "T3",
  "T4",
  "T6",
  "T7",
  "T8",
  "T9",
  "T10",
  "T11",
  "T12",
  "T13",
  "T14",
  "T15",
  "T16",
  "T17",
  "T18",
];

/**
 * Target field path for each question template, per the Epic 10 spec's
 * template table ("Question templates" section).
 *
 * T1-T4 ask about a field whose value is an atom, so the atom is the answer.
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
  T6: "content.culture.majorRites",
  T7: "content.culture.spiritualities",
  T8: "content.culture.symbols",
  T9: "content.historicalRole.kingdomsOrChiefdoms",
  T10: "content.organization.traditionalPoliticalSystem",
  T11: "content.origins.migrationRoutes",
  T12: "content.appellations.whyProblematic",
  T13: "etymology",
  T14: "nameOriginActor",
  T15: "content.historicalNames.colonization",
  T16: "content.kingdoms",
  T17: "content.historicalFacts.precolonial",
  T18: "content.culture.dominantReligions",
};

/**
 * Which kind of fiche each template asks about.
 *
 * The sweep iterates peoples and countries separately and has to know which
 * templates belong to which; without this it would try every template on every
 * fiche and reject two thirds of them on a missing rubric, which is a rejection
 * that means nothing.
 */
// @req REQ-121
export const TEMPLATE_ENTITY_TYPES: Record<QuizTemplateId, QuizEntityType> = {
  T1: "people",
  T2: "people",
  T3: "people",
  T4: "people",
  T6: "people",
  T7: "people",
  T8: "people",
  T9: "people",
  T10: "people",
  T11: "people",
  T12: "people",
  T13: "country",
  T14: "country",
  T15: "country",
  T16: "country",
  T17: "country",
  T18: "country",
};

// @req REQ-121
export function templatesFor(
  entityType: QuizEntityType
): readonly QuizTemplateId[] {
  return QUIZ_TEMPLATE_IDS.filter(
    (templateId) => TEMPLATE_ENTITY_TYPES[templateId] === entityType
  );
}

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
  "T13",
  "T14",
  "T15",
  "T17",
  "T18",
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
  T6: "rites-et-culture",
  T7: "croyances",
  T8: "rites-et-culture",
  T9: "royaumes-et-histoire",
  T10: "organisation",
  T11: "migrations",
  T12: "noms",
  T13: "noms",
  T14: "noms",
  T15: "noms",
  T16: "royaumes-et-histoire",
  T17: "royaumes-et-histoire",
  T18: "croyances",
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
 * What a track is called once a scope and a theme have both been chosen.
 *
 * The two halves reach the page through different pipes — the scope label is
 * resolved against the database by `describeScope`, the theme arrives raw in
 * the query string — and until this helper existed only the first was ever
 * rendered. A reader crossing « Afrique du Sud » with « Langues » was told the
 * country and never the theme, so nothing on screen said which half of the
 * country's questions they were being asked.
 *
 * An undeclared theme is dropped rather than printed: the value is
 * reader-supplied and this label reaches the page's `<title>`.
 */
// @req REQ-121
export function quizTrackLabelFr(
  scopeLabelFr: string | null,
  theme: string | null
): string {
  const themeLabel =
    theme && isQuizThemeId(theme) ? QUIZ_THEME_LABELS_FR[theme] : null;

  return [scopeLabelFr, themeLabel].filter(Boolean).join(" · ");
}

/**
 * One question each theme actually asks, for the card that offers it.
 *
 * A specimen, not a tagline: the picker replaced a `<select>` whose options
 * could only carry a label, and what a card buys over an `<option>` is exactly
 * this line — the reader chooses a subject rather than a taxonomy entry.
 *
 * Five are the verbatim stems of the inversion templates (T6, T7, T9, T10,
 * T11) in `questionTemplates.ts`. The other four are the stems of T2, T4, T1
 * and T3 with the drawn subject replaced by « ce peuple », because a card has
 * not drawn one. Keep them in step with the templates: a specimen that stops
 * being what the theme asks is decoration, and a reader who picks a card on it
 * has been mis-sold the track.
 */
// @req REQ-121
export const QUIZ_THEME_SPECIMENS_FR: Record<QuizThemeId, string> = {
  noms: "Quel nom ce peuple se donne-t-il à lui-même ?",
  langues: "Quelle est la langue principale de ce peuple ?",
  "parente-linguistique":
    "À quelle famille linguistique appartient ce peuple ?",
  territoire: "Dans quel pays ce peuple est-il principalement présent ?",
  "rites-et-culture": "Quel peuple pratique ces rites ?",
  croyances: "Quel peuple a ces croyances ?",
  "royaumes-et-histoire": "Quel peuple a connu cette histoire ?",
  organisation: "Quel peuple s'organise ainsi ?",
  migrations: "Quel peuple a suivi ce chemin ?",
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
