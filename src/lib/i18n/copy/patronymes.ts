import { PATRONYME_VOCABULARY } from "@/lib/glossaire/vocabularies";
import type { Language } from "@/types/shared";

/**
 * The patronyme fiche and its index (ETNI-1464, REQ-133). Distinct from
 * `names.ts`, which covers ethnonyms (how a *people* is called); this covers
 * the naming system a *person* is named under.
 *
 * The key is the internal word and the copy is the public one — DEC-038,
 * same split as `TRAIL_PAGE_LABELS.patronymes` in trail.ts. Anything a
 * reader sees under this key says "nom", except where "patronyme" names one
 * of the five naming systems, which is onomastic vocabulary and not a label
 * for the axis.
 */
const en = {
  eyebrow: "Name",
  nameSystemSectionTitle: "The name",
  nameSystemStatementPrefix: "Naming system:",
  nameSystemLabels: PATRONYME_VOCABULARY.en.nameSystem,
  // What the fiche rests on, said in the head rather than left to the
  // reader to count at the bottom of the dossier. The tier word itself is
  // never written here: it comes from the shared glossary, so the three
  // labels the atlas publishes cannot fork per surface.
  //
  // The machine-written share is its own clause because provenance is not
  // authority (Source Tier Policy): a fiche can cite four works, three of
  // them machine-written, and still rest on a referenced one.
  sourceStanding: {
    countOne: "1 source cited",
    countMany: "{count} sources cited",
    aiShareOne: ", one of them written by an artificial intelligence",
    aiShareMany: ", {count} of them written by an artificial intelligence",
    // Says what the atlas has not established, never why the workshop has
    // not established it yet.
    assembling:
      "This fiche is still being assembled: what it states remains to be confirmed.",
  },
  casteOrSocialFunctionLabel: "Caste or social function",
  attestedFormsTitle: "Attested spellings",
  spellingAttestedInPrefix: "attested in",
  transmissionModeLabel: "Mode of transmission",
  transmissionModeLabels: PATRONYME_VOCABULARY.en.transmissionMode,
  designatedSocialUnitLabel: "Designated social unit",
  designatedSocialUnitLabels: PATRONYME_VOCABULARY.en.designatedSocialUnit,
  totemicFoodProhibitionLabel: "Totemic food prohibition",
  permittedGivenNamesLabel: "Permitted given names",
  nisbaSubtypeLabel: "Nisba type",
  nisbaSubtypeLabels: PATRONYME_VOCABULARY.en.nisbaSubtype,
  originTitle: "Origin",
  originOralTraditionsLabel: "Griot oral tradition",
  originWrittenChroniclesLabel: "Written chronicle",
  originLinguisticReconstructionsLabel: "Linguistic reconstruction",
  originClaimStatusLabels: PATRONYME_VOCABULARY.en.originClaimStatus,
  griotOriginNote:
    "This origin is transmitted by griot oral tradition. It is presented as transcribed, with its source and, where documented, the griot who transmitted it.",
  griotAttributionPrefix: "Transmitted by",
  sourcesTitle: "Sources",
  alliancesTitle: "Alliances",
  alliancesNote:
    "Pacts linking this name to other names: a joking relationship in which the bearers of both names owe one another ritual mockery and assistance, and which forbids conflict between them. Each pact keeps the term used by its sources.",
  allianceTermGlosses: {
    sanankuya: "Mande joking relationship",
  },
  allianceTypeFallback: "Documented alliance",
  homonymsTitle: "Homonyms",
  homonymsNote:
    "What the same sequence of letters designates elsewhere — a people, a place or another name — without a demonstrated link to this one. The list prevents a resemblance in form from being read as descent.",
  associationsTitle: "Peoples and countries concerned",
  associatedPeoplesLabel: "Peoples",
  associatedCountriesLabel: "Countries",
  nonHereditaryGuidance:
    "This patronym is not transmitted by heredity: it does not read as a family name in the European sense. Its reach varies by region — the peoples and countries below indicate where this mode of naming is documented.",
  bearersTitle: "Bearers",
  bearersEditorialNote:
    "Only public or historical figures appear here, along with persons who have recognised themselves in this name. The list documents the name: it allows no inference about the ethnic origin of anyone who bears it.",
  roleCategoryFallback: "Role not recorded",
  onFiche: {
    peopleTitle: "Names borne",
    peopleEmpty:
      "The corpus does not yet attach any name to this people. The names dimension has just opened and covers only a small part of the atlas.",
    peopleUnavailable:
      "The names borne could not be loaded. The problem is on our side, not an empty corpus.",
    countryTitle: "Attested names",
    countryNote:
      "Two distinct registers: what a source attests in this country, and what the peoples who live there bear.",
    attestedLabel: "Attested in the country",
    reachLabel: "Borne by the country's peoples, with no attestation here",
    reachViaPrefix: "via",
    countryEmpty:
      "The corpus does not yet attest any name in this country, and none of the peoples who live there bears a documented one.",
    countryUnavailable:
      "The names could not be loaded. The problem is on our side, not an empty corpus.",
  },
  index: {
    pageTitle: "Names",
    pageSubtitle:
      "The naming systems of persons documented in the corpus — clan names, non-hereditary patronymics, nisba and praise names.",
    unavailable:
      "The names could not be loaded. The problem is on our side, not an empty corpus.",
    countSingular: "name",
    countPlural: "names",
    emptyState: "No name is documented yet.",
    pagination: {
      label: "Names pagination",
      previous: "Previous",
      next: "Next",
      page: "Page",
    },
  },
};

type PatronymesCopy = typeof en;

const fr: PatronymesCopy = {
  eyebrow: "Nom",
  nameSystemSectionTitle: "Le nom",
  nameSystemStatementPrefix: "Système de nommage :",
  nameSystemLabels: PATRONYME_VOCABULARY.fr.nameSystem,
  sourceStanding: {
    countOne: "1 source citée",
    countMany: "{count} sources citées",
    aiShareOne: ", dont une rédigée par une intelligence artificielle",
    aiShareMany: ", dont {count} rédigées par une intelligence artificielle",
    // Says what the atlas has not established, never why the workshop has
    // not established it yet.
    assembling:
      "Cette fiche est en cours de constitution : ce qu'elle avance reste à confirmer.",
  },
  casteOrSocialFunctionLabel: "Caste ou fonction sociale",
  attestedFormsTitle: "Graphies attestées",
  spellingAttestedInPrefix: "attestée en",
  transmissionModeLabel: "Mode de transmission",
  transmissionModeLabels: PATRONYME_VOCABULARY.fr.transmissionMode,
  designatedSocialUnitLabel: "Unité sociale désignée",
  designatedSocialUnitLabels: PATRONYME_VOCABULARY.fr.designatedSocialUnit,
  totemicFoodProhibitionLabel: "Interdit alimentaire totémique",
  permittedGivenNamesLabel: "Prénoms autorisés",
  nisbaSubtypeLabel: "Type de nisba",
  nisbaSubtypeLabels: PATRONYME_VOCABULARY.fr.nisbaSubtype,
  originTitle: "Origine",
  // Three parallel lists, not one classification: the corpus can hold a
  // griot's account and a written chronicle for the same name without
  // either overruling the other.
  originOralTraditionsLabel: "Tradition orale griotique",
  originWrittenChroniclesLabel: "Chronique écrite",
  originLinguisticReconstructionsLabel: "Reconstruction linguistique",
  originClaimStatusLabels: PATRONYME_VOCABULARY.fr.originClaimStatus,
  // Attributed to the transcription and its griot rather than stated as
  // a bare fact: an oral chain of transmission is the source, and a
  // fiche that dropped that attribution would present a griot's telling
  // as if it were the corpus's own claim.
  griotOriginNote:
    "Cette origine est transmise par tradition orale griotique. Elle est présentée telle que transcrite, avec sa source et, lorsqu'il est documenté, le griot qui l'a transmise.",
  griotAttributionPrefix: "Transmis par",
  sourcesTitle: "Sources",
  alliancesTitle: "Alliances",
  alliancesNote:
    "Les pactes qui lient ce nom à d'autres noms : une parenté à plaisanterie, où les porteurs des deux noms se doivent moquerie rituelle et assistance, et qui interdit le conflit entre eux. Chaque pacte est désigné par le terme que les sources emploient.",
  allianceTermGlosses: {
    sanankuya: "parenté à plaisanterie mandingue",
  },
  allianceTypeFallback: "Alliance documentée",
  homonymsTitle: "Homonymes",
  homonymsNote:
    "Ce que la même chaîne de lettres désigne d'autre — un peuple, un lieu, un autre nom — sans lien démontré avec celui-ci. La liste évite qu'une ressemblance de forme se lise comme une filiation.",
  associationsTitle: "Peuples et pays concernés",
  associatedPeoplesLabel: "Peuples",
  associatedCountriesLabel: "Pays",
  // AC4: a non-hereditary patronymic works differently by region — the
  // fiche says so explicitly rather than let the reader assume the
  // hereditary-surname model that `nameSystem` elsewhere denies.
  nonHereditaryGuidance:
    "Ce patronyme n'est pas transmis de façon héréditaire : il ne se lit pas comme un nom de famille au sens européen. Sa portée varie selon la région — les peuples et pays ci-dessous indiquent où ce mode de nommage est documenté.",
  bearersTitle: "Porteurs et porteuses",
  // DEC-040: no code path derives a person's ethnic origin from this
  // patronyme, and this note states that editorial guarantee to the reader
  // rather than leave it implicit in what the list omits.
  //
  // It used to open on the eligibility class DEC-040 actually defines —
  // "des personnes publiques ou décédées" — which made a section that
  // simply lists who bears a name read as a search through the dead. The
  // guarantee is the point; who qualifies is a curation rule, and it is
  // stated second and without the word.
  bearersEditorialNote:
    "N'y figurent que des personnalités publiques ou historiques, et des personnes qui se sont elles-mêmes reconnues dans ce nom. La liste documente le nom : elle ne permet de déduire l'origine ethnique d'aucune personne qui le porte.",
  roleCategoryFallback: "Rôle non renseigné",
  // The name dimension as the people and country fiches carry it
  // (REQ-133, `docs/design/name-to-country-linking.md`). The country
  // labels are the load-bearing copy: the two lists answer different
  // questions, and only the wording keeps a reader from reading the
  // second as an attestation the corpus never made.
  onFiche: {
    peopleTitle: "Noms portés",
    peopleEmpty:
      "Le corpus ne rattache encore aucun nom à ce peuple. La dimension des noms vient d'ouvrir et ne couvre qu'une petite part de l'atlas.",
    peopleUnavailable:
      "Les noms portés n'ont pas pu être chargés. Le problème vient de notre côté, pas d'un corpus vide.",
    countryTitle: "Noms attestés",
    countryNote:
      "Deux registres distincts : ce qu'une source atteste dans ce pays, et ce que portent les peuples qui y vivent.",
    attestedLabel: "Attestés dans le pays",
    // Says both halves of the inference in the label itself — whose
    // names these are, and that no source places them here. A label
    // reading merely "Portés par les peuples" would let the chapter
    // title supply the missing word, and the word it would supply is
    // "attestés".
    reachLabel: "Portés par les peuples du pays, sans attestation ici",
    reachViaPrefix: "par",
    countryEmpty:
      "Le corpus n'atteste encore aucun nom dans ce pays, et aucun des peuples qui y vivent n'en porte de documenté.",
    countryUnavailable:
      "Les noms n'ont pas pu être chargés. Le problème vient de notre côté, pas d'un corpus vide.",
  },
  // The /fr/atlas/noms index (ETNI-1803, REQ-139) — the corpus-class
  // listing that leads to the fiches above. Kept nested here rather than
  // as a sibling top-level key: it is patronyme copy, distinct from
  // `names.ts` (the unrelated Appellations/ethnonym page).
  index: {
    pageTitle: "Noms",
    pageSubtitle:
      "Les systèmes de nommage des personnes documentés dans le corpus — noms de clan, patronymes non héréditaires, nisba et noms d'éloge.",
    unavailable:
      "Les noms n'ont pas pu être chargés. Le problème vient de notre côté, pas d'un corpus vide.",
    countSingular: "nom",
    countPlural: "noms",
    emptyState: "Aucun nom n'est encore documenté.",
    pagination: {
      label: "Pagination des noms",
      previous: "Précédent",
      next: "Suivant",
      page: "Page",
    },
  },
};

// @req REQ-145
export const patronymesCopy: Record<Language, PatronymesCopy> = { en, fr };
