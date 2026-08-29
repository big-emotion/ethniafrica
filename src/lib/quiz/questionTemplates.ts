import type {
  AutonymExonymName,
  QuizCountryShare,
  QuizPeopleFixture,
  QuizProseRubrics,
  QuizQuestionCandidate,
  QuizTemplateId,
} from "@/types/quiz";
import {
  assembleOptions,
  correctOptionIndex,
  isSameOptionValue,
  selectDistractors,
} from "@/lib/games/options";
import {
  namedExonym,
  selectVerbatimFragment,
  subjectNameTokens,
} from "@/lib/quiz/proseFragment";
import { TEMPLATE_FIELD_PATHS } from "@/lib/quiz/segmentPolicy";

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
    stimulusFr: null,
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
    stimulusFr: null,
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
    stimulusFr: null,
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
    stimulusFr: null,
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
    stimulusFr: null,
    subjectName: fiche.subjectName,
    optionsFr: assembleOptions(fiche.isoCode, distractors, correctOption),
    correctOption,
    explanationFr: `Le code ISO 639-3 de la langue ${languageName} est « ${fiche.isoCode} ».`,
    baselineDifficulty: 4,
  };
}

/**
 * One inversion round: a verbatim rubric fragment as the stimulus, and the
 * people it belongs to as the answer.
 *
 * The five original templates ask about an atomic field value, which is why
 * they could exist at all — a family or an ISO code can be an option, a
 * paragraph about initiation rites cannot. Inverting recovers the whole prose
 * half of the corpus: the fragment sets the scene, the answer is the subject,
 * and the distractors are peoples again, drawn from the near pool the sweep
 * already orders.
 *
 * `stemFr` differs per rubric on purpose. A single standing question reused
 * across every round is the defect the games charter opens on (§0), and it
 * reads as one question asked eight times.
 */
function buildInversionTemplate(
  templateId: QuizTemplateId,
  rubricLabelFr: string,
  stemFr: string,
  baselineDifficulty: number
) {
  return (
    fiche: QuizPeopleFixture,
    peopleNamePool: AutonymExonymName[]
  ): QuizQuestionCandidate | null => {
    const rubric = fiche.rubrics[templateId as keyof QuizProseRubrics];
    const stimulus = selectVerbatimFragment(rubric, subjectNameTokens(fiche));
    if (!stimulus) return null;

    const distractors = selectDistractors(fiche.subjectName, peopleNamePool);
    if (!distractors) return null;

    const correctOption = correctOptionIndex(fiche.id, templateId);
    const name = displayName(fiche.subjectName);
    return {
      templateId,
      entityType: "people",
      entityId: fiche.id,
      fieldPath: TEMPLATE_FIELD_PATHS[templateId],
      promptFr: stemFr,
      stimulusFr: stimulus,
      subjectName: fiche.subjectName,
      optionsFr: assembleOptions(fiche.subjectName, distractors, correctOption),
      correctOption,
      explanationFr: `Ce passage décrit ${rubricLabelFr} du peuple ${name}.`,
      baselineDifficulty,
    };
  };
}

// @req REQ-121
export const buildT6RitesTemplate = buildInversionTemplate(
  "T6",
  "les rites",
  "Quel peuple pratique ces rites ?",
  3
);

// @req REQ-121
export const buildT7SpiritualitiesTemplate = buildInversionTemplate(
  "T7",
  "les croyances",
  "Quel peuple a ces croyances ?",
  3
);

// @req REQ-121
export const buildT8SymbolsTemplate = buildInversionTemplate(
  "T8",
  "les symboles",
  "Quel peuple se reconnaît dans ces symboles ?",
  3
);

// @req REQ-121
export const buildT9KingdomsTemplate = buildInversionTemplate(
  "T9",
  "l'histoire politique",
  "Quel peuple a connu cette histoire ?",
  4
);

// @req REQ-121
export const buildT10OrganizationTemplate = buildInversionTemplate(
  "T10",
  "l'organisation traditionnelle",
  "Quel peuple s'organise ainsi ?",
  4
);

// @req REQ-121
export const buildT11MigrationTemplate = buildInversionTemplate(
  "T11",
  "les déplacements",
  "Quel peuple a suivi ce chemin ?",
  4
);

/**
 * Which of a people's own names it is reproached with.
 *
 * The only template whose options come from the subject alone. Borrowing
 * distractors from neighbouring peoples would double the yield — 191 fiches
 * name a contested exonym, only 98 also carry the four exonyms this needs —
 * and would make the stem a lie: it says these are names given to *this*
 * people. A smaller bank of true questions beats a larger one of false ones.
 */
// @req REQ-121
export function buildT12ContestedExonymTemplate(
  fiche: QuizPeopleFixture
): QuizQuestionCandidate | null {
  const contested = namedExonym(fiche.whyProblematic, fiche.exonyms);
  if (!contested) return null;

  const distractors = selectDistractors(contested, fiche.exonyms);
  if (!distractors) return null;

  const correctOption = correctOptionIndex(fiche.id, "T12");
  const name = displayName(fiche.subjectName);
  return {
    templateId: "T12",
    entityType: "people",
    entityId: fiche.id,
    fieldPath: TEMPLATE_FIELD_PATHS.T12,
    promptFr: `Parmi ces noms donnés au peuple ${name}, lequel est jugé inexact ou offensant ?`,
    stimulusFr: null,
    subjectName: fiche.subjectName,
    optionsFr: assembleOptions(contested, distractors, correctOption),
    correctOption,
    explanationFr: fiche.whyProblematic ?? "",
    baselineDifficulty: 3,
  };
}

// @req REQ-080
export const questionTemplateBuilders = {
  T1: buildT1LanguageFamilyTemplate,
  T2: buildT2AutonymTemplate,
  T3: buildT3MainCountryTemplate,
  T4: buildT4MainLanguageTemplate,
  T5: buildT5IsoCodeTemplate,
  T6: buildT6RitesTemplate,
  T7: buildT7SpiritualitiesTemplate,
  T8: buildT8SymbolsTemplate,
  T9: buildT9KingdomsTemplate,
  T10: buildT10OrganizationTemplate,
  T11: buildT11MigrationTemplate,
  T12: buildT12ContestedExonymTemplate,
} as const;
