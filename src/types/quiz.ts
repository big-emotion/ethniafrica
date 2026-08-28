/**
 * Quiz engine types (Epic 10, FR65/FR66).
 * See supabase/migrations/036_quiz_engine.sql for the persisted shape.
 */

export type QuizTemplateId = "T1" | "T2" | "T3" | "T4" | "T5";

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
}
