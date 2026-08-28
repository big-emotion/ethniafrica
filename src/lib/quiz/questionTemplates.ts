import type {
  AutonymExonymName,
  QuizCountryShare,
  QuizPeopleFixture,
  QuizQuestionCandidate,
} from "@/types/quiz";
import {
  assembleOptions,
  correctOptionIndex,
  isSameOptionValue,
  selectDistractors,
} from "@/lib/games/options";

function displayName(name: AutonymExonymName): string {
  return name.exonym && name.exonym !== name.autonym
    ? `${name.autonym} (${name.exonym})`
    : name.autonym;
}

// Re-exported for the callers that imported it from here before the option
// helpers moved to @/lib/games/options (REQ-120).
// @req REQ-103
export { isSameOptionValue };

/**
 * The country holding the largest share of this people, by head count.
 *
 * Shared with the sweep's staleness check so the answer T3 states and the
 * answer QZ-2 compares against are read the same way — they disagreed once,
 * and a disagreement here revokes a healthy question on every sweep.
 */
// @req REQ-103
export function mainCountryOf(fiche: QuizPeopleFixture): QuizCountryShare {
  return fiche.distributionByCountry.reduce((largest, current) =>
    current.population > largest.population ? current : largest
  );
}

// @req REQ-080
export function buildT1LanguageFamilyTemplate(
  fiche: QuizPeopleFixture,
  familyNamePool: string[]
): QuizQuestionCandidate | null {
  const distractors = selectDistractors(
    fiche.languageFamilyNameFr,
    familyNamePool
  );
  if (!distractors) return null;

  const correctOption = correctOptionIndex(fiche.id, "T1");
  const name = displayName(fiche.subjectName);
  return {
    templateId: "T1",
    entityType: "people",
    entityId: fiche.id,
    fieldPath: "languageFamilyId",
    promptFr: `À quelle famille linguistique appartient le peuple ${name} ?`,
    subjectName: fiche.subjectName,
    optionsFr: assembleOptions(
      fiche.languageFamilyNameFr,
      distractors,
      correctOption
    ),
    correctOption,
    explanationFr: `Le peuple ${name} appartient à la famille linguistique ${fiche.languageFamilyNameFr}.`,
    baselineDifficulty: 1,
  };
}

// @req REQ-080
export function buildT2AutonymTemplate(
  fiche: QuizPeopleFixture,
  autonymPool: string[]
): QuizQuestionCandidate | null {
  const distractors = selectDistractors(fiche.selfAppellation, autonymPool);
  if (!distractors) return null;

  const correctOption = correctOptionIndex(fiche.id, "T2");
  const name = displayName(fiche.subjectName);
  return {
    templateId: "T2",
    entityType: "people",
    entityId: fiche.id,
    fieldPath: "content.appellations.selfAppellation",
    promptFr: `Quel est le nom que se donne (autonyme) le peuple appelé ${name} ?`,
    subjectName: fiche.subjectName,
    optionsFr: assembleOptions(
      fiche.selfAppellation,
      distractors,
      correctOption
    ),
    correctOption,
    explanationFr: `Le peuple ${name} se nomme lui-même « ${fiche.selfAppellation} ».`,
    baselineDifficulty: 2,
  };
}

// @req REQ-080
export function buildT3MainCountryTemplate(
  fiche: QuizPeopleFixture,
  countryNamePool: string[]
): QuizQuestionCandidate | null {
  if (fiche.distributionByCountry.length === 0) return null;

  const mainCountry = mainCountryOf(fiche);
  const distractors = selectDistractors(
    mainCountry.countryNameFr,
    countryNamePool
  );
  if (!distractors) return null;

  const correctOption = correctOptionIndex(fiche.id, "T3");
  const name = displayName(fiche.subjectName);
  return {
    templateId: "T3",
    entityType: "people",
    entityId: fiche.id,
    fieldPath: "content.demography.distributionByCountry",
    promptFr: `Dans quel pays le peuple ${name} est-il principalement présent ?`,
    subjectName: fiche.subjectName,
    optionsFr: assembleOptions(
      mainCountry.countryNameFr,
      distractors,
      correctOption
    ),
    correctOption,
    explanationFr: `Le peuple ${name} est principalement présent en ${mainCountry.countryNameFr}.`,
    baselineDifficulty: 1,
  };
}

// @req REQ-080
export function buildT4MainLanguageTemplate(
  fiche: QuizPeopleFixture,
  languagePool: AutonymExonymName[]
): QuizQuestionCandidate | null {
  const distractors = selectDistractors(fiche.mainLanguage, languagePool);
  if (!distractors) return null;

  const correctOption = correctOptionIndex(fiche.id, "T4");
  const name = displayName(fiche.subjectName);
  return {
    templateId: "T4",
    entityType: "people",
    entityId: fiche.id,
    fieldPath: "content.languages.mainLanguage",
    promptFr: `Quelle est la langue principale du peuple ${name} ?`,
    subjectName: fiche.subjectName,
    optionsFr: assembleOptions(fiche.mainLanguage, distractors, correctOption),
    correctOption,
    explanationFr: `La langue principale du peuple ${name} est ${displayName(fiche.mainLanguage)}.`,
    baselineDifficulty: 2,
  };
}

// @req REQ-080
export function buildT5IsoCodeTemplate(
  fiche: QuizPeopleFixture,
  isoCodePool: string[]
): QuizQuestionCandidate | null {
  const distractors = selectDistractors(fiche.isoCode, isoCodePool);
  if (!distractors) return null;

  const correctOption = correctOptionIndex(fiche.id, "T5");
  const languageName = displayName(fiche.mainLanguage);
  return {
    templateId: "T5",
    entityType: "people",
    entityId: fiche.id,
    fieldPath: "content.languages.isoCodes",
    promptFr: `Quel code ISO 639-3 désigne la langue ${languageName} ?`,
    subjectName: fiche.subjectName,
    optionsFr: assembleOptions(fiche.isoCode, distractors, correctOption),
    correctOption,
    explanationFr: `Le code ISO 639-3 de la langue ${languageName} est « ${fiche.isoCode} ».`,
    baselineDifficulty: 4,
  };
}

// @req REQ-080
export const questionTemplateBuilders = {
  T1: buildT1LanguageFamilyTemplate,
  T2: buildT2AutonymTemplate,
  T3: buildT3MainCountryTemplate,
  T4: buildT4MainLanguageTemplate,
  T5: buildT5IsoCodeTemplate,
} as const;
