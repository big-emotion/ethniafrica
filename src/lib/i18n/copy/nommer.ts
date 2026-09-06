import type { Language } from "@/types/shared";

const en = {
  title: "Who gave this name?",
  subtitle:
    "The atlas names eight hundred peoples, fifty-four countries and twenty-four language families. Almost none of these names was chosen by those it designates.",
  thesisStep: "The thesis",
  thesisHeading: "Three numbers before anything else",
  dossierStep: "The dossier",
  dossierHeading: "Five chapters, five things that are named",
  dossierIntro:
    "A people, a country, a person, a language, a thing. Each chapter follows a different naming regime, and the last exists because the first four would suggest that the question concerns only peoples.",
  limitsStep: "The limits",
  limitsHeading: "What this dossier cannot say",
  undeclared: (undeclared: number, peoples: number) =>
    `${undeclared} people records out of ${peoples} declare no classification status. They are not judged unproblematic: they have not been examined. This remains open work, and hiding it behind a percentage would count it as a result.`,
  missingImposition:
    "The corpus records the origin of an exonym in free prose, never as a value. We can count records that use the word “administration”; we cannot count names that an administration imposed.",
  countryEtymologies:
    "The etymologies of the fifty-four countries are recorded in the corpus and backed by no source: the “The country” chapter presents them as a reading, never as a measurement.",
  doctrineAction: "Read the editorial doctrine",
  vocabularyStep: "The vocabulary",
  vocabularyHeading: (count: number) => `${count} words, defined once`,
  vocabularyIntro:
    "Endonym, exonym, glossonym, ethnic reification: this dossier uses words that the site displayed without defining them anywhere. The glossary holds them, each with an example from the corpus — or with the reason why the corpus has none.",
  glossaryAction: (count: number) => `Open the glossary — ${count} terms`,
  otherChapters: "Other chapters",
  backToDossier: "Back to the dossier",
};

type NommerCopy = typeof en;

const fr: NommerCopy = {
  title: "Qui a donné ce nom ?",
  subtitle:
    "L'atlas nomme huit cents peuples, cinquante-quatre pays et vingt-quatre familles de langues. Presque aucun de ces noms n'a été choisi par ceux qu'il désigne.",
  thesisStep: "La thèse",
  thesisHeading: "Trois nombres, avant tout le reste",
  dossierStep: "Le dossier",
  dossierHeading: "Cinq chapitres, cinq choses qu'on nomme",
  dossierIntro:
    "Un peuple, un pays, une personne, une langue, une chose. Chaque chapitre est un régime de dénomination différent, et le dernier existe parce que les quatre premiers laisseraient croire que la question ne concerne que les peuples.",
  limitsStep: "Les limites",
  limitsHeading: "Ce que ce dossier ne peut pas dire",
  undeclared: (undeclared, peoples) =>
    `${undeclared} fiches de peuple sur ${peoples} ne déclarent aucun statut de classification. Elles ne sont pas jugées non problématiques : elles n’ont pas été examinées. C’est un chantier ouvert, et le taire derrière un pourcentage reviendrait à le compter comme un résultat.`,
  missingImposition:
    "Le corpus enregistre l'origine d'un exonyme en prose libre, jamais comme une valeur. On peut compter les fiches qui emploient le mot « administration » ; on ne peut pas compter les noms qu'une administration a imposés.",
  countryEtymologies:
    "Les étymologies des cinquante-quatre pays sont renseignées dans le corpus et adossées à aucune source : le chapitre « Le pays » les présente comme une lecture, jamais comme une mesure.",
  doctrineAction: "Lire la doctrine éditoriale",
  vocabularyStep: "Le vocabulaire",
  vocabularyHeading: (count) => `${count} mots, définis une fois`,
  vocabularyIntro:
    "Endonyme, exonyme, glossonyme, réification ethnique : ce dossier emploie des mots que le site affichait sans les définir nulle part. Le glossaire les tient, chacun avec un exemple pris dans le corpus — ou avec la raison pour laquelle le corpus n’en a pas.",
  glossaryAction: (count) => `Ouvrir le glossaire — ${count} termes`,
  otherChapters: "Les autres chapitres",
  backToDossier: "Revenir au dossier",
};

// @req REQ-145
export const nommerCopy: Record<Language, NommerCopy> = { en, fr };
