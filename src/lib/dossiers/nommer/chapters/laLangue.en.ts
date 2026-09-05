import type { DossierChapterTranslation } from "../types";

/**
 * Chapter four in English — the language.
 *
 * Machine provenance (DEC-048): agent-produced from the French record and
 * not yet read by a human. The chapter is about the word ‘Bantu’, so the
 * word is carried in its English form and the class prefixes it discusses
 * stay exactly as the French shows them — the prefix is the evidence.
 */
// @req REQ-145
export const CHAPITRE_LA_LANGUE_EN: DossierChapterTranslation = {
  key: "la-langue",
  locale: "en",
  provenance: "machine",
  title: "The language",
  question:
    "The word ‘Bantu’ files hundreds of peoples. Who coined it, and to what end?",
  standfirst:
    "A label born in a colonial office today classifies the largest language family on the continent. It is scientifically useful and politically toxic, and the atlas goes on using it.",
  measure: {
    value: "‘Bantu’, 1862",
    unit: "first attestation",
  },
  sections: {
    "un-mot-forge-dans-un-bureau": {
      stepLabel: "04 · The language",
      heading: "A word coined in an office, in 1862",
      blocks: {
        "un-nom-sans-locuteurs":
          "The atlas files its 775 peoples under twenty-four language families. The largest bears a name that has no speakers: nobody ever called themselves ‘Bantu’ before a linguist wrote it down.",
        "bleek-et-abantu":
          "The word is coined in 1862 by Wilhelm Bleek, in his Comparative Grammar of South African Languages. He takes the Zulu abantu, ‘the people’ — ba-, the human plural prefix, and -ntu, the person — and makes it a label of classification. The gesture is ordinary in nineteenth-century comparative philology; what is less so is the place.",
        "bleek-dans-ladministration":
          "Bleek was an interpreter, then librarian, of the Cape administration. He did not work beside colonial power: he worked inside it, and supplied it with categories. That does not make his grammar wrong — the genealogical unity of the languages he groups is still accepted today. It says only where the word comes from, and whom it first served.",
      },
    },
    "trois-temps-du-glissement": {
      stepLabel: "04 · The language",
      heading: "Three slippages, and only one is contested",
      blocks: {
        "le-trajet-du-mot":
          "What the criticism aims at is not the classification: it is the journey a word has made since it. It descends from a family of languages to a population, then from a population to an administrative category — and each descent is a step the previous one did not justify.",
      },
      table: {
        caption: "What ‘Bantu’ designates, depending on who uses it and when",
        columns: ["What the word designates", "Who uses it", "Standing"],
        rows: [
          [
            "A family of related languages",
            "Comparative linguistics, since 1862",
            "Accepted: the genealogical kinship is not disputed",
          ],
          [
            "A people, or a set of peoples",
            "Colonial ethnography, then everyday usage",
            "Contested: a family of languages describes no population",
          ],
          [
            "A category of administered population",
            "The South African state, Bantu Education Act, 1953",
            "The word becomes an instrument of school segregation",
          ],
        ],
      },
    },
    "ce-que-le-prefixe-portait": {
      stepLabel: "04 · The language",
      heading: "What the prefix carried, and what usage cut off",
      blocks: {
        "le-prefixe-est-grammaire":
          "The languages of this family mark with a prefix what they are speaking of: the language, the person, the people, the country. That prefix is not an ornament — it is the grammar that distinguishes a language from those who speak it, precisely the distinction this chapter defends.",
        "le-tswana-en-quatre-mots":
          "Tswana shows it in four words on a single root: Botswana the country, Batswana the people, Motswana a person, Setswana the language. Where French and English say ‘Tswana’ for all four, the language distinguished them.",
        "le-prefixe-coupe":
          "European usage cut off the prefix. What remains is a bare stem that serves indifferently as a language name, a people name and an adjective — and the ambiguity the atlas spends its time undoing was partly born there.",
      },
      pairs: [
        {
          endonymGloss: "isi-, the language; the people are amaZulu",
          imposedBy: "European usage, class prefix dropped",
        },
        {
          endonymGloss:
            "se-, the manner and the language; the people are Batswana",
          imposedBy: "European usage, class prefix dropped",
        },
        {
          endonymGloss: "otji-, the language; the people are Ovaherero",
          imposedBy: "colonial contact in the nineteenth century",
        },
        {
          endonymGloss:
            "ki-, the language; the name comes from the Arabic sawāḥil, ‘the coasts’",
          imposedBy:
            "Arabic exonym turned glossonym, then taken up without its prefix",
        },
      ],
    },
    "un-cas-qui-ne-se-resout-pas": {
      stepLabel: "04 · The language",
      heading: "A case that does not resolve",
      blocks: {
        "une-insulte-en-afrique-du-sud":
          "In South Africa, ‘Bantu’ is an insult. The word named a ministry, a type of school and a category of second-class citizens, and that memory does not dissolve because linguistics, for its part, uses it without ulterior motive.",
        "aucun-substitut":
          "Everywhere else, it remains the standard technical term, and no substitute covers the same family. ‘Niger-Congo’ designates a far larger set; the regional periphrases leave out half the languages concerned. To give up the word would be to give up stating a real kinship.",
        "garder-et-expliquer":
          "The atlas therefore settles it in one direction only: it keeps the word and it explains it. That is the clearest application of its own doctrine — nothing is forbidden, everything is labelled — and it is also the least comfortable position, because it offers nobody the relief of a new word.",
      },
    },
    "la-regle-qui-en-sort": {
      stepLabel: "04 · The language",
      heading: "What the source does not say",
      blocks: {
        "glossonyme-nest-pas-ethnonyme":
          "A glossonym is not an ethnonym, and a language family does not describe a population — still less an ancestry. That two peoples speak related languages says that a word travelled, not that people carried it.",
        "le-classement-est-un-outil":
          "The corpus nonetheless files every people under a family, and this page is the best critique of it available: the classification is a reading tool, never an origin. Where the atlas uses a label coined elsewhere, it says so on the fiche rather than here.",
      },
    },
  },
  entities: {
    FLG_BANTU: "Bantu family",
    PPL_HERERO: "Herero",
  },
};
