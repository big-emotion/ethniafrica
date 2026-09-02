/**
 * Every number the dossier prints, and where each one comes from.
 *
 * The dossier argues from counts, so the counts have to be auditable. Three
 * provenances are genuinely in play and the reader is told which is which
 * (atlas charter §4):
 *
 *   - `counted`  — reproducible from `dataset/source/afrik/`. The suite
 *                  **replays** the count and fails if the corpus has moved,
 *                  so a figure cannot quietly become false.
 *   - `read`     — a human reading of free prose. Unverifiable by
 *                  construction, so it is required to declare its caveat, and
 *                  the caveat is published with the figure.
 *   - `missing`  — the corpus cannot produce it, and the dossier says so
 *                  rather than reaching for a number that looks like it.
 *
 * The lexical probes are the reason the `read`/`counted` split matters. They
 * are word-stem occurrences in free prose, not a coding of the corpus: a
 * fiche writing « ce nom n'est pas d'origine européenne » lands in `europ`.
 * That is `counted` — the command is exact and replayable — but each one
 * still carries the caveat in its label, because a reproducible count of an
 * ambiguous thing is still a count of an ambiguous thing.
 */

import type { CorpusFigure, FigureKey } from "./types";

/** Every count below was taken against `recette` on this date. */
const COUNTED_ON = "2026-09-02";

const PEOPLE_GLOB = "dataset/source/afrik/peuples/*/*.json";

/**
 * The word family behind the « dépréciatif » probe, declared here because the
 * dossier publishes it.
 *
 * `péjoratif` alone answers 19. The corpus says the same thing in four ways,
 * and a chapter about naming cannot count one spelling and call it the
 * phenomenon — so the probe is widened and the widening is published. The
 * suite reads this list, so the number and its method cannot drift apart.
 */
// @req REQ-113
export const PEJORATIVE_STEMS = [
  "pejorat",
  "depreciat",
  "moqueur",
  "derisoire",
] as const;

// @req REQ-113
export const NOMMER_FIGURES: Record<FigureKey, CorpusFigure> = {
  "corpus-peoples": {
    kind: "counted",
    figureKey: "corpus-peoples",
    label: "fiches de peuple",
    value: 800,
    method: `nombre de fichiers ${PEOPLE_GLOB}`,
    countedOn: COUNTED_ON,
  },
  "corpus-exonyms": {
    kind: "counted",
    figureKey: "corpus-exonyms",
    label: "exonymes recensés",
    value: 3207,
    method:
      "somme de content.appellations.exonyms.length sur les fiches de peuple",
    countedOn: COUNTED_ON,
  },
  "corpus-autonyms": {
    kind: "counted",
    figureKey: "corpus-autonyms",
    label: "autonymes déclarés",
    value: 798,
    method:
      "fiches dont content.appellations.selfAppellation est renseigné et non vide",
    countedOn: COUNTED_ON,
  },

  // The three numbers that replace « 57,5 % ». Publishing the ratio alone
  // would have let a reader infer that the other 340 fiches were examined and
  // found sound; 321 of them were never examined at all, and that is the
  // finding, not the footnote.
  "status-contested-or-colonial": {
    kind: "counted",
    figureKey: "status-contested-or-colonial",
    label:
      "fiches déclarant leur appellation contestée ou héritée de la colonisation",
    value: 460,
    method:
      "fiches dont classificationStatus vaut contested (265) ou colonial-legacy (195)",
    countedOn: COUNTED_ON,
  },
  "status-other": {
    kind: "counted",
    figureKey: "status-other",
    label: "fiches déclarant un autre statut",
    value: 19,
    method:
      "fiches dont classificationStatus est renseigné sans être contested ni colonial-legacy",
    countedOn: COUNTED_ON,
  },
  "status-undeclared": {
    kind: "counted",
    figureKey: "status-undeclared",
    label: "fiches ne déclarant aucun statut",
    value: 321,
    method: "fiches sans classificationStatus",
    countedOn: COUNTED_ON,
  },

  // Lexical probes over originOfExonyms + whyProblematic, accent-folded.
  "probe-colonial": {
    kind: "counted",
    figureKey: "probe-colonial",
    label: "fiches employant le radical « colonial »",
    value: 242,
    method: "radical colonial dans originOfExonyms + whyProblematic",
    countedOn: COUNTED_ON,
  },
  "probe-administration": {
    kind: "counted",
    figureKey: "probe-administration",
    label: "fiches employant le radical « administr- »",
    value: 184,
    method: "radical administr dans originOfExonyms + whyProblematic",
    countedOn: COUNTED_ON,
  },
  "probe-european": {
    kind: "counted",
    figureKey: "probe-european",
    label: "fiches employant le radical « europ- »",
    value: 124,
    method: "radical europ dans originOfExonyms + whyProblematic",
    countedOn: COUNTED_ON,
  },
  "probe-neighbours": {
    kind: "counted",
    figureKey: "probe-neighbours",
    label: "fiches attribuant un exonyme à des voisins",
    value: 120,
    method: "radical voisin dans originOfExonyms + whyProblematic",
    countedOn: COUNTED_ON,
  },
  "probe-portuguese": {
    kind: "counted",
    figureKey: "probe-portuguese",
    label: "fiches employant « portugais »",
    value: 84,
    method: "radical portugais dans originOfExonyms + whyProblematic",
    countedOn: COUNTED_ON,
  },
  "probe-pejorative": {
    kind: "counted",
    figureKey: "probe-pejorative",
    label: "fiches qualifiant un exonyme de dépréciatif",
    value: 87,
    method: `radicaux ${PEJORATIVE_STEMS.join(", ")} dans originOfExonyms + whyProblematic`,
    countedOn: COUNTED_ON,
  },
  "probe-arabic": {
    kind: "counted",
    figureKey: "probe-arabic",
    label: "fiches employant le radical « arab- »",
    value: 75,
    method: "radical arab dans originOfExonyms + whyProblematic",
    countedOn: COUNTED_ON,
  },
  "probe-swahili": {
    kind: "counted",
    figureKey: "probe-swahili",
    label: "fiches employant « swahili »",
    value: 73,
    method: "radical swahili dans originOfExonyms + whyProblematic",
    countedOn: COUNTED_ON,
  },
  "probe-slavery": {
    kind: "counted",
    figureKey: "probe-slavery",
    label: "fiches employant le radical « esclav- »",
    value: 26,
    method: "radical esclav dans originOfExonyms + whyProblematic",
    countedOn: COUNTED_ON,
  },
  "probe-missionary": {
    kind: "counted",
    figureKey: "probe-missionary",
    label: "fiches employant le radical « missionn- »",
    value: 25,
    method: "radical missionn dans originOfExonyms + whyProblematic",
    countedOn: COUNTED_ON,
  },

  "corpus-countries": {
    kind: "counted",
    figureKey: "corpus-countries",
    label: "fiches de pays",
    value: 54,
    method: "nombre de fichiers dataset/source/afrik/pays/*.json",
    countedOn: COUNTED_ON,
  },

  // The four country families are a hand reading of `nameOriginActor`, which
  // holds two to four sentences of free prose and no controlled value. The
  // caveat travels with every one of them.
  "countries-european-exonym": {
    kind: "read",
    figureKey: "countries-european-exonym",
    label: "pays portant un exonyme européen conservé",
    value: 20,
    method:
      "dépouillement à la main du champ nameOriginActor des 54 fiches pays",
    readOn: COUNTED_ON,
    caveat:
      "Une lecture, pas une mesure : le corpus ne porte aucun champ typé pour l'origine d'un nom de pays, et aucune des 54 étymologies n'est adossée à une source.",
  },
  "countries-ancient-exonym": {
    kind: "read",
    figureKey: "countries-ancient-exonym",
    label: "pays portant un exonyme ancien non européen",
    value: 6,
    method:
      "dépouillement à la main du champ nameOriginActor des 54 fiches pays",
    readOn: COUNTED_ON,
    caveat:
      "Une lecture, pas une mesure : le corpus ne porte aucun champ typé pour l'origine d'un nom de pays, et aucune des 54 étymologies n'est adossée à une source.",
  },
  "countries-local-kept": {
    kind: "read",
    figureKey: "countries-local-kept",
    label: "pays dont le nom local a été repris par le colonisateur",
    value: 11,
    method:
      "dépouillement à la main du champ nameOriginActor des 54 fiches pays",
    readOn: COUNTED_ON,
    caveat:
      "Une lecture, pas une mesure : le corpus ne porte aucun champ typé pour l'origine d'un nom de pays, et aucune des 54 étymologies n'est adossée à une source.",
  },
  "countries-african-choice": {
    kind: "read",
    figureKey: "countries-african-choice",
    label: "pays dont le nom a été choisi ou restauré par des Africains",
    value: 17,
    method:
      "dépouillement à la main du champ nameOriginActor des 54 fiches pays",
    readOn: COUNTED_ON,
    caveat:
      "Une lecture, pas une mesure : le corpus ne porte aucun champ typé pour l'origine d'un nom de pays, et aucune des 54 étymologies n'est adossée à une source.",
  },

  "patronyme-fiches": {
    kind: "counted",
    figureKey: "patronyme-fiches",
    label: "fiches de nom",
    value: 88,
    method:
      "fiches dataset/source/afrik/patronymes/PAT_*.json portant un nameSystem et " +
      "au moins une source autre que la file d'attente des candidats — les fiches " +
      "générées depuis cette file couvrent un nom sans rien en documenter, et le " +
      "dossier dit « documente »",
    countedOn: COUNTED_ON,
  },
  "patronyme-non-hereditary": {
    kind: "counted",
    figureKey: "patronyme-non-hereditary",
    label: "systèmes documentés où le nom ne se transmet pas",
    value: 27,
    method:
      "fiches de nom recherchées dont transmissionMode vaut non_hereditary, au " +
      "même périmètre que le compte ci-dessus",
    countedOn: COUNTED_ON,
  },

  "corpus-language-families": {
    kind: "counted",
    figureKey: "corpus-language-families",
    label: "familles linguistiques",
    value: 24,
    method:
      "nombre de fichiers dataset/source/afrik/famille_linguistique/FLG_*.json",
    countedOn: COUNTED_ON,
  },

  // The number the dossier would most like to print and cannot. Stating the
  // gap is the charter's requirement and, here, half the argument: the corpus
  // records that a name came from outside without recording what made it
  // stick.
  "exonyms-imposed-by-administration": {
    kind: "missing",
    figureKey: "exonyms-imposed-by-administration",
    label: "exonymes effectivement imposés par une administration",
    reason:
      "Le corpus enregistre l'origine d'un exonyme en prose libre, jamais comme une valeur. On peut compter les fiches qui emploient le mot « administration » ; on ne peut pas compter les noms qu'une administration a imposés.",
  },
};
