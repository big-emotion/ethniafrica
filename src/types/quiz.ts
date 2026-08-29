/**
 * Quiz engine types (Epic 10, FR65/FR66).
 * See supabase/migrations/036_quiz_engine.sql for the persisted shape.
 */

/**
 * T1-T5 ask about an atomic field value; T6-T11 invert a prose rubric so the
 * people is the answer; T12 asks which of a people's exonyms is contested.
 *
 * Declared here and re-exported by `@/lib/quiz/segmentPolicy`, which owns the
 * field path each one reads. The two files used to declare this union
 * independently, agreeing only by hand.
 */
export type QuizTemplateId =
  | "T1"
  | "T2"
  | "T3"
  | "T4"
  | "T5"
  | "T6"
  | "T7"
  | "T8"
  | "T9"
  | "T10"
  | "T11"
  | "T12";

/** Only "people" fiches feed templates today — languages live inside a people's content.languages section. */
export type QuizEntityType = "people";

/**
 * Autonym-first name structure required by AutonymExonymHeading. Never collapse
 * a people/language name to a bare display string in quiz candidate data.
 */
export interface AutonymExonymName {
  autonym: string;
  exonym?: string;
}

/** An option value: a plain string for non-name fields, or a structured name for people/language names. */
export type QuizOptionValue = string | AutonymExonymName;

export interface QuizQuestionCandidate {
  templateId: QuizTemplateId;
  entityType: QuizEntityType;
  entityId: string;
  fieldPath: string;
  promptFr: string;
  /**
   * Verbatim corpus text shown above the stem, for the templates whose answer
   * is the subject. Null for T1-T5 and T12, which name their subject in
   * `promptFr` and have nothing to set up.
   */
  stimulusFr: string | null;
  /** The people named in promptFr, carried in structured (not bare-string) form for downstream rendering. */
  subjectName: AutonymExonymName;
  optionsFr: QuizOptionValue[];
  correctOption: number;
  explanationFr: string;
  baselineDifficulty: number;
}

export interface QuizCountryShare {
  countryId: string;
  countryNameFr: string;
  /**
   * `content.demography.distributionByCountry[].population` — a head count,
   * not a share. The corpus writes `population` in all 1611 entries and
   * `percentage` in 32; reading the latter is what capped T3 at 20 peoples.
   * `src/lib/games/corpus.ts` records the same trap for the games.
   */
  population: number;
}

/**
 * Minimal slice of a people fiche needed to instantiate templates T1-T5.
 * Field names mirror the strict-model field paths they are drawn from.
 */
export interface QuizPeopleFixture {
  id: string;
  subjectName: AutonymExonymName;
  languageFamilyId: string;
  languageFamilyNameFr: string;
  selfAppellation: string;
  distributionByCountry: QuizCountryShare[];
  mainLanguage: AutonymExonymName;
  isoCode: string;
  /**
   * `content.demography.totalPopulation`, set on all 789 fiches. The games
   * charter's difficulty ladder (§4) reads notoriety off it: a people of ten
   * million is more likely to be recognised than one of forty thousand.
   */
  totalPopulation: number | null;
  /**
   * `content.appellations.exonyms` — every name others give this people. T12
   * draws its options from here and nowhere else, so all four are true of the
   * subject.
   */
  exonyms: string[];
  /**
   * The prose rubrics T6-T11 invert. Optional, all of them: a fiche missing one
   * loses that round and keeps the eleven others, whereas requiring them would
   * drop the fiche from the bank it is already in.
   */
  rubrics: QuizProseRubrics;
  /** `content.appellations.whyProblematic` — the passage T12 reads. */
  whyProblematic: string | null;
}

/**
 * The prose the inversion templates read, keyed by the template that reads it.
 *
 * A record rather than six named fields: `buildInversionTemplate` is one
 * factory parameterised by template id, and six flat fields would make it
 * carry a lookup table back to them.
 */
export interface QuizProseRubrics {
  T6: string | null;
  T7: string | null;
  T8: string | null;
  T9: string | null;
  T10: string | null;
  T11: string[] | null;
}
