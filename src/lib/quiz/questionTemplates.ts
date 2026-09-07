import type {
  AutonymExonymName,
  QuizCountryFixture,
  QuizCountryShare,
  QuizInversionSubject,
  QuizPeopleFixture,
  QuizQuestionCandidate,
  QuizTemplateId,
} from "@/types/quiz";
import type { TranslationLocale } from "@/lib/i18n/translationLocale";
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
import {
  TEMPLATE_ENTITY_TYPES,
  TEMPLATE_FIELD_PATHS,
} from "@/lib/quiz/segmentPolicy";

function displayName(name: AutonymExonymName): string {
  return name.exonym && name.exonym !== name.autonym
    ? `${name.autonym} (${name.exonym})`
    : name.autonym;
}

interface QuestionTemplateCopy {
  prompt: (subjectName: string) => string;
  explanation: (subjectName: string, answer: string) => string;
}

/**
 * Authored prose for every active quiz template.
 *
 * The database columns retain their historical `*_fr` names, but migration
 * 087 made each row locale-scoped. This registry is therefore the language
 * boundary: the generator selects one complete locale and never mixes static
 * French stems with an English translated corpus.
 */
// @req REQ-145
export const QUESTION_TEMPLATE_COPY: Record<
  TranslationLocale,
  Record<QuizTemplateId, QuestionTemplateCopy>
> = {
  fr: {
    T1: {
      prompt: (name) =>
        `À quelle famille linguistique appartient le peuple ${name} ?`,
      explanation: (name, answer) =>
        `Le peuple ${name} appartient à la famille linguistique ${answer}.`,
    },
    T2: {
      prompt: (name) =>
        `Quel est le nom que se donne (autonyme) le peuple appelé ${name} ?`,
      explanation: (name, answer) =>
        `Le peuple ${name} se nomme lui-même « ${answer} ».`,
    },
    T3: {
      prompt: (name) =>
        `Dans quel pays le peuple ${name} est-il principalement présent ?`,
      explanation: (name, answer) =>
        `Le peuple ${name} est principalement présent en ${answer}.`,
    },
    T4: {
      prompt: (name) => `Quelle est la langue principale du peuple ${name} ?`,
      explanation: (name, answer) =>
        `La langue principale du peuple ${name} est ${answer}.`,
    },
    T6: {
      prompt: () => "Quel peuple pratique ces rites ?",
      explanation: (name) => `Ce passage décrit les rites du peuple ${name}.`,
    },
    T7: {
      prompt: () => "Quel peuple a ces croyances ?",
      explanation: (name) =>
        `Ce passage décrit les croyances du peuple ${name}.`,
    },
    T8: {
      prompt: () => "Quel peuple se reconnaît dans ces symboles ?",
      explanation: (name) =>
        `Ce passage décrit les symboles du peuple ${name}.`,
    },
    T9: {
      prompt: () => "Quel peuple a connu cette histoire ?",
      explanation: (name) =>
        `Ce passage décrit l'histoire politique du peuple ${name}.`,
    },
    T10: {
      prompt: () => "Quel peuple s'organise ainsi ?",
      explanation: (name) =>
        `Ce passage décrit l'organisation traditionnelle du peuple ${name}.`,
    },
    T11: {
      prompt: () => "Quel peuple a suivi ce chemin ?",
      explanation: (name) =>
        `Ce passage décrit les déplacements du peuple ${name}.`,
    },
    T12: {
      prompt: (name) =>
        `Parmi ces noms donnés au peuple ${name}, lequel est jugé inexact ou offensant ?`,
      explanation: (_name, answer) => answer,
    },
    T13: {
      prompt: () => "De quel pays ce nom raconte-t-il l'origine ?",
      explanation: (name) => `Cette étymologie est celle du nom « ${name} ».`,
    },
    T14: {
      prompt: () => "Quel pays doit son nom à ceux-ci ?",
      explanation: (name) =>
        `Ce sont eux qui ont nommé ce qu'on appelle aujourd'hui ${name}.`,
    },
    T15: {
      prompt: () => "Quel pays portait ce nom sous la colonisation ?",
      explanation: (name) =>
        `Ce nom fut porté par le territoire devenu ${name}.`,
    },
    T16: {
      prompt: (name) =>
        `Quel royaume ou sultanat s'est développé sur le territoire de ${name} ?`,
      explanation: (name, answer) =>
        `${answer} s'est développé sur le territoire de ${name}.`,
    },
    T17: {
      prompt: () => "Sur quel territoire cette histoire s'est-elle déroulée ?",
      explanation: (name) =>
        `Cette histoire est celle du territoire devenu ${name}.`,
    },
    T18: {
      prompt: () => "De quel pays ce paysage religieux est-il celui ?",
      explanation: (name) =>
        `Ce paysage religieux est celui de ${name} aujourd'hui.`,
    },
  },
  en: {
    T1: {
      prompt: (name) =>
        `Which language family do the ${name} people belong to?`,
      explanation: (name, answer) =>
        `The ${name} people belong to the ${answer} language family.`,
    },
    T2: {
      prompt: (name) =>
        `What autonym do the ${name} people use for themselves?`,
      explanation: (name, answer) =>
        `The ${name} people call themselves “${answer}”.`,
    },
    T3: {
      prompt: (name) => `In which country are the ${name} people mainly found?`,
      explanation: (name, answer) =>
        `The ${name} people are mainly found in ${answer}.`,
    },
    T4: {
      prompt: (name) => `What is the main language of the ${name} people?`,
      explanation: (name, answer) =>
        `The main language of the ${name} people is ${answer}.`,
    },
    T6: {
      prompt: () => "Which people practise these rites?",
      explanation: (name) =>
        `This passage describes the rites of the ${name} people.`,
    },
    T7: {
      prompt: () => "Which people hold these beliefs?",
      explanation: (name) =>
        `This passage describes the beliefs of the ${name} people.`,
    },
    T8: {
      prompt: () => "Which people identify with these symbols?",
      explanation: (name) =>
        `This passage describes the symbols of the ${name} people.`,
    },
    T9: {
      prompt: () => "Which people lived this political history?",
      explanation: (name) =>
        `This passage describes the political history of the ${name} people.`,
    },
    T10: {
      prompt: () => "Which people have this traditional organisation?",
      explanation: (name) =>
        `This passage describes the traditional organisation of the ${name} people.`,
    },
    T11: {
      prompt: () => "Which people followed this migration path?",
      explanation: (name) =>
        `This passage describes the migrations of the ${name} people.`,
    },
    T12: {
      prompt: (name) =>
        `Which of these names given to the ${name} people is considered inaccurate or offensive?`,
      explanation: (_name, answer) => answer,
    },
    T13: {
      prompt: () => "Which country's name has this origin?",
      explanation: (name) => `This is the etymology of the name “${name}”.`,
    },
    T14: {
      prompt: () => "Which country was named by the actors described here?",
      explanation: (name) => `They named what is known today as ${name}.`,
    },
    T15: {
      prompt: () => "Which country bore this name under colonial rule?",
      explanation: (name) =>
        `This name was used by the territory that became ${name}.`,
    },
    T16: {
      prompt: (name) =>
        `Which kingdom or sultanate developed in the territory of ${name}?`,
      explanation: (name, answer) =>
        `The ${answer} developed in the territory of ${name}.`,
    },
    T17: {
      prompt: () => "In which territory did this history unfold?",
      explanation: (name) =>
        `This is the history of the territory that became ${name}.`,
    },
    T18: {
      prompt: () => "Which country has this religious landscape today?",
      explanation: (name) =>
        `This is the religious landscape of ${name} today.`,
    },
  },
};

function copyFor(locale: TranslationLocale, templateId: QuizTemplateId) {
  return QUESTION_TEMPLATE_COPY[locale][templateId];
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
  familyNamePool: string[],
  locale: TranslationLocale = "fr"
): QuizQuestionCandidate | null {
  const distractors = selectDistractors(
    fiche.languageFamilyNameFr,
    familyNamePool
  );
  if (!distractors) return null;

  const correctOption = correctOptionIndex(fiche.id, "T1");
  const name = displayName(fiche.subjectName);
  const copy = copyFor(locale, "T1");
  return {
    templateId: "T1",
    entityType: "people",
    entityId: fiche.id,
    fieldPath: "languageFamilyId",
    promptFr: copy.prompt(name),
    stimulusFr: null,
    subjectName: fiche.subjectName,
    optionsFr: assembleOptions(
      fiche.languageFamilyNameFr,
      distractors,
      correctOption
    ),
    correctOption,
    explanationFr: copy.explanation(name, fiche.languageFamilyNameFr),
    baselineDifficulty: 1,
  };
}

// @req REQ-080
export function buildT2AutonymTemplate(
  fiche: QuizPeopleFixture,
  autonymPool: string[],
  locale: TranslationLocale = "fr"
): QuizQuestionCandidate | null {
  const distractors = selectDistractors(fiche.selfAppellation, autonymPool);
  if (!distractors) return null;

  const correctOption = correctOptionIndex(fiche.id, "T2");
  const name = displayName(fiche.subjectName);
  const copy = copyFor(locale, "T2");
  return {
    templateId: "T2",
    entityType: "people",
    entityId: fiche.id,
    fieldPath: "content.appellations.selfAppellation",
    promptFr: copy.prompt(name),
    stimulusFr: null,
    subjectName: fiche.subjectName,
    optionsFr: assembleOptions(
      fiche.selfAppellation,
      distractors,
      correctOption
    ),
    correctOption,
    explanationFr: copy.explanation(name, fiche.selfAppellation),
    baselineDifficulty: 2,
  };
}

// @req REQ-080
export function buildT3MainCountryTemplate(
  fiche: QuizPeopleFixture,
  countryNamePool: string[],
  locale: TranslationLocale = "fr"
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
  const copy = copyFor(locale, "T3");
  return {
    templateId: "T3",
    entityType: "people",
    entityId: fiche.id,
    fieldPath: "content.demography.distributionByCountry",
    promptFr: copy.prompt(name),
    stimulusFr: null,
    subjectName: fiche.subjectName,
    optionsFr: assembleOptions(
      mainCountry.countryNameFr,
      distractors,
      correctOption
    ),
    correctOption,
    explanationFr: copy.explanation(name, mainCountry.countryNameFr),
    baselineDifficulty: 1,
  };
}

// @req REQ-080
export function buildT4MainLanguageTemplate(
  fiche: QuizPeopleFixture,
  languagePool: AutonymExonymName[],
  locale: TranslationLocale = "fr"
): QuizQuestionCandidate | null {
  const distractors = selectDistractors(fiche.mainLanguage, languagePool);
  if (!distractors) return null;

  const correctOption = correctOptionIndex(fiche.id, "T4");
  const name = displayName(fiche.subjectName);
  const copy = copyFor(locale, "T4");
  return {
    templateId: "T4",
    entityType: "people",
    entityId: fiche.id,
    fieldPath: "content.languages.mainLanguage",
    promptFr: copy.prompt(name),
    stimulusFr: null,
    subjectName: fiche.subjectName,
    optionsFr: assembleOptions(fiche.mainLanguage, distractors, correctOption),
    correctOption,
    explanationFr: copy.explanation(name, displayName(fiche.mainLanguage)),
    baselineDifficulty: 2,
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
  baselineDifficulty: number
) {
  return (
    fiche: QuizInversionSubject,
    subjectNamePool: AutonymExonymName[],
    locale: TranslationLocale = "fr"
  ): QuizQuestionCandidate | null => {
    const stimulus = selectVerbatimFragment(
      fiche.rubrics[templateId],
      subjectNameTokens(fiche)
    );
    if (!stimulus) return null;

    const distractors = selectDistractors(fiche.subjectName, subjectNamePool);
    if (!distractors) return null;

    const correctOption = correctOptionIndex(fiche.id, templateId);
    const copy = copyFor(locale, templateId);
    const name = displayName(fiche.subjectName);
    return {
      templateId,
      entityType: TEMPLATE_ENTITY_TYPES[templateId],
      entityId: fiche.id,
      fieldPath: TEMPLATE_FIELD_PATHS[templateId],
      promptFr: copy.prompt(name),
      stimulusFr: stimulus,
      subjectName: fiche.subjectName,
      optionsFr: assembleOptions(fiche.subjectName, distractors, correctOption),
      correctOption,
      explanationFr: copy.explanation(name, name),
      baselineDifficulty,
    };
  };
}

// @req REQ-121
export const buildT6RitesTemplate = buildInversionTemplate("T6", 3);

// @req REQ-121
export const buildT7SpiritualitiesTemplate = buildInversionTemplate("T7", 3);

// @req REQ-121
export const buildT8SymbolsTemplate = buildInversionTemplate("T8", 3);

// @req REQ-121
export const buildT9KingdomsTemplate = buildInversionTemplate("T9", 4);

// @req REQ-121
export const buildT10OrganizationTemplate = buildInversionTemplate("T10", 4);

// @req REQ-121
export const buildT11MigrationTemplate = buildInversionTemplate("T11", 4);

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
  fiche: QuizPeopleFixture,
  locale: TranslationLocale = "fr"
): QuizQuestionCandidate | null {
  const contested = namedExonym(fiche.whyProblematic, fiche.exonyms);
  if (!contested) return null;

  const distractors = selectDistractors(contested, fiche.exonyms);
  if (!distractors) return null;

  const correctOption = correctOptionIndex(fiche.id, "T12");
  const name = displayName(fiche.subjectName);
  const copy = copyFor(locale, "T12");
  return {
    templateId: "T12",
    entityType: "people",
    entityId: fiche.id,
    fieldPath: TEMPLATE_FIELD_PATHS.T12,
    promptFr: copy.prompt(name),
    stimulusFr: null,
    subjectName: fiche.subjectName,
    optionsFr: assembleOptions(contested, distractors, correctOption),
    correctOption,
    explanationFr: fiche.whyProblematic ?? "",
    baselineDifficulty: 3,
  };
}

// @req REQ-121
export const buildT13EtymologyTemplate = buildInversionTemplate("T13", 4);

// @req REQ-121
export const buildT14NameOriginActorTemplate = buildInversionTemplate("T14", 4);

// @req REQ-121
export const buildT15ColonialNameTemplate = buildInversionTemplate("T15", 4);

// @req REQ-121
export const buildT17PrecolonialTemplate = buildInversionTemplate("T17", 5);

// @req REQ-121
export const buildT18ReligionsTemplate = buildInversionTemplate("T18", 4);

/**
 * Which country a kingdom stood on — the one country template whose answer is
 * an atom rather than the subject.
 *
 * `content.kingdoms[].name` is clean, unlike the sibling arrays of the same
 * section: `dominantPeoples` and `majorPeoples[].exonyms` are the residue of a
 * naive comma split, and would put « Akan (Ashanti » on screen as an option.
 */
// @req REQ-121
export function buildT16KingdomTemplate(
  fiche: QuizCountryFixture,
  kingdomNamePool: string[],
  locale: TranslationLocale = "fr"
): QuizQuestionCandidate | null {
  const kingdom = fiche.kingdomNames[0];
  if (!kingdom) return null;

  // A kingdom this same country also held is not a wrong answer.
  const distractors = selectDistractors(
    kingdom,
    kingdomNamePool.filter((name) => !fiche.kingdomNames.includes(name))
  );
  if (!distractors) return null;

  const correctOption = correctOptionIndex(fiche.id, "T16");
  const name = displayName(fiche.subjectName);
  const copy = copyFor(locale, "T16");
  return {
    templateId: "T16",
    entityType: "country",
    entityId: fiche.id,
    fieldPath: TEMPLATE_FIELD_PATHS.T16,
    promptFr: copy.prompt(name),
    stimulusFr: null,
    subjectName: fiche.subjectName,
    optionsFr: assembleOptions(kingdom, distractors, correctOption),
    correctOption,
    explanationFr: copy.explanation(name, kingdom),
    baselineDifficulty: 4,
  };
}

// @req REQ-080
export const questionTemplateBuilders = {
  T1: buildT1LanguageFamilyTemplate,
  T2: buildT2AutonymTemplate,
  T3: buildT3MainCountryTemplate,
  T4: buildT4MainLanguageTemplate,
  T6: buildT6RitesTemplate,
  T7: buildT7SpiritualitiesTemplate,
  T8: buildT8SymbolsTemplate,
  T9: buildT9KingdomsTemplate,
  T10: buildT10OrganizationTemplate,
  T11: buildT11MigrationTemplate,
  T12: buildT12ContestedExonymTemplate,
  T13: buildT13EtymologyTemplate,
  T14: buildT14NameOriginActorTemplate,
  T15: buildT15ColonialNameTemplate,
  T16: buildT16KingdomTemplate,
  T17: buildT17PrecolonialTemplate,
  T18: buildT18ReligionsTemplate,
} as const;
