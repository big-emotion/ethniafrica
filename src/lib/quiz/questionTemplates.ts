import type {
  AutonymExonymName,
  QuizOptionValue,
  QuizPeopleFixture,
  QuizQuestionCandidate,
  QuizTemplateId,
} from "@/types/quiz";

function displayName(name: AutonymExonymName): string {
  return name.exonym && name.exonym !== name.autonym
    ? `${name.autonym} (${name.exonym})`
    : name.autonym;
}

function isSameOptionValue(a: QuizOptionValue, b: QuizOptionValue): boolean {
  const valueOf = (v: QuizOptionValue): string =>
    typeof v === "string" ? v : v.autonym;
  return valueOf(a) === valueOf(b);
}

/**
 * Picks exactly 3 distractors, verbatim, from the pool: excludes anything equal to the
 * correct answer and de-duplicates the pool itself. Returns null (no padding) if fewer
 * than 3 valid distractors remain — FR65/FR66 forbid fabricated options.
 */
function selectDistractors<T extends QuizOptionValue>(
  correct: T,
  pool: T[]
): T[] | null {
  const distractors: T[] = [];
  for (const candidate of pool) {
    if (isSameOptionValue(candidate, correct)) continue;
    if (distractors.some((existing) => isSameOptionValue(existing, candidate)))
      continue;
    distractors.push(candidate);
    if (distractors.length === 3) break;
  }
  return distractors.length === 3 ? distractors : null;
}

/** Deterministic (no RNG) slot for the correct answer, stable across repeated calls. */
function correctOptionIndex(
  entityId: string,
  templateId: QuizTemplateId
): number {
  const seed = `${entityId}:${templateId}`;
  let sum = 0;
  for (let i = 0; i < seed.length; i++) sum += seed.charCodeAt(i);
  return sum % 4;
}

function assembleOptions<T extends QuizOptionValue>(
  correct: T,
  distractors: T[],
  correctIndex: number
): T[] {
  const options: T[] = [];
  let distractorIndex = 0;
  for (let i = 0; i < 4; i++) {
    options.push(i === correctIndex ? correct : distractors[distractorIndex++]);
  }
  return options;
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

  const mainCountry = fiche.distributionByCountry.reduce((largest, current) =>
    current.percentage > largest.percentage ? current : largest
  );
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
