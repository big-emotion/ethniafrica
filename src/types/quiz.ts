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
  percentage: number;
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
}
