import type { DossierChapterTranslation } from "../types";

/**
 * Chapter one in English — the people.
 *
 * Machine provenance (DEC-048): agent-produced from the French record and
 * not yet read by a human. The probe stems in the table are the French
 * search terms the count was run with, so they stay as they are and take a
 * gloss where an English reader could not guess them.
 */
// @req REQ-145
export const CHAPITRE_LE_PEUPLE_EN: DossierChapterTranslation = {
  key: "le-peuple",
  locale: "en",
  provenance: "machine",
  title: "The people",
  question:
    "Almost every people in the atlas bears a name that came from outside. Who gave it to them?",
  standfirst:
    "The corpus holds more names given from outside than names claimed from within. The gap does not first measure colonisation: it measures who did the writing.",
  measure: {
    value: "3,141",
    unit: "exonyms recorded",
  },
  sections: {
    "la-mesure-et-ce-quelle-ne-mesure-pas": {
      stepLabel: "01 · The people",
      heading: "The measure, and what it does not measure",
      blocks: {
        "quatre-pour-un":
          "The atlas's 775 people fiches record 3,141 names given from outside, against 773 names the people concerned claim for themselves. Four to one.",
        "une-asymetrie-darchive":
          "The gap is spectacular, and it is easy to make it say what it does not. It does not measure how many peoples were forcibly renamed. It measures first of all an asymmetry of the archive: far more has been written about these peoples than they have written about themselves, and an atlas that compiles sources compiles that imbalance along with them.",
        "trois-declarations":
          "On the classification of their own name, the fiches say three things. 445 declare their name contested or inherited from colonisation. 19 declare something else. And 311 declare nothing at all.",
        "le-troisieme-nombre":
          "That third number is the subject of the sentence, not its footnote. Writing ‘57% of the atlas's peoples contest their name’ would suggest that the others had been examined and found unproblematic. They have not been examined. The work is open, and a percentage would book it as a result.",
      },
    },
    "le-sondage-lexical": {
      stepLabel: "01 · The people",
      heading: "Who gave these names, according to the fiches themselves",
      blocks: {
        "de-la-prose-pas-une-donnee":
          "Every fiche tells in plain words where its exonym comes from. That account is not data: it is prose. One can therefore count words in it, and that is all the table below does — a fiche that writes ‘this name is not of European origin’ is counted under ‘europ-’ like the others.",
      },
      table: {
        caption:
          "Word stems found in the ‘origin of the exonyms’ and ‘why it is problematic’ fields of the 775 fiches. A lexical probe, not a coding: the mentions overlap.",
        columns: ["Stem found", "Fiches", "What is most often read there"],
        rows: [
          [
            "colonial",
            "239",
            "The name dates from colonisation, or was made official by it",
          ],
          [
            "administr-",
            "179",
            "The name is an act of census-taking before it is a fact of language",
          ],
          ["europ-", "118", "Navigators, explorers, cartographers"],
          [
            "voisin (‘neighbour’)",
            "112",
            "An African exonym, given by a neighbouring people — often the oldest of all",
          ],
          [
            "dépréciatif and related stems",
            "85",
            "The fiche explicitly calls the word pejorative, depreciative, mocking or derisive",
          ],
          [
            "portugais (‘Portuguese’)",
            "83",
            "The deepest layer of the Atlantic coast, from the fifteenth century onwards",
          ],
          [
            "arab-",
            "74",
            "Earlier than Europe across the Sahel and the eastern coast",
          ],
          [
            "swahili",
            "68",
            "A vehicular language turned into an instrument of designation",
          ],
          [
            "esclav- (‘slave’)",
            "26",
            "The name is born of a status of capture",
          ],
          [
            "missionn- (‘mission-’)",
            "25",
            "Naming in order to evangelise, then in order to teach literacy",
          ],
        ],
      },
    },
    "lexonyme-nest-pas-europeen": {
      stepLabel: "01 · The people",
      heading: "The exonym is not a European invention",
      blocks: {
        "voisins-arabe-swahili":
          "One hundred and twenty fiches attribute their exonym to neighbours, seventy-five to Arabic, seventy-three to Swahili. Naming the other from outside is not an import: it is what people who meet each other do, everywhere, and always have. A dossier that only said ‘Europe named badly’ would miss its own material.",
        "le-registre":
          "What colonisation brings that is new, then, is not the exonym. It is the register. A name stops being a way of speaking and becomes a box in the state's records: countable, taxable, enforceable. It no longer circulates; it is inscribed — and what is inscribed is not renegotiated at the next encounter.",
        "les-jieng":
          "The Jieng of South Sudan are the clearest example. ‘Dinka’ is an Arabic exonym, brought by traders from the north, which the Anglo-Egyptian administration took up and fixed. It is universally accepted today, including by the people concerned in official contexts — and ‘Jieng’ has been rising in identity claims since independence in 2011. An exonym can be adopted without ceasing to be an exonym.",
      },
    },
    "quand-le-nom-est-une-moquerie": {
      stepLabel: "01 · The people",
      heading: "When the name is a mockery",
      blocks: {
        "quatre-vingt-sept-fiches":
          "Eighty-seven fiches call their exonym pejorative, depreciative, mocking or derisive. Two cases show what the word does, and what replacing it does not repair.",
      },
      pairs: [
        {
          endonymGloss: "‘the men of men’",
          imposedBy:
            "Dutch settlers, in mocking imitation of the click consonants",
        },
        {
          endonymGloss: "the nations, one by one",
          imposedBy:
            "English-speaking settlers; ‘San’ is itself a depreciative Khoekhoe exonym",
        },
        {
          endonymGloss: "Muonyjang in the singular",
          imposedBy: "Arab traders, then the Anglo-Egyptian administration",
        },
        {
          endonymGloss: "‘the owners of cattle’",
          imposedBy: "colonial contact in the nineteenth century",
        },
      ],
    },
    "remplacer-nest-pas-reparer": {
      stepLabel: "01 · The people",
      heading: "Replacing an exonym with an exonym repairs nothing",
      blocks: {
        "hottentot-bushmen-san":
          "‘Hottentot’ was withdrawn from scholarly usage, then from the law. ‘Bushmen’ was replaced by ‘San’ in English-language anthropology from the 1970s onwards. The second replacement raises a problem the first did not: ‘San’ is itself a depreciative Khoekhoe word, which designated hunter-gatherers without cattle.",
        "le-nom-de-la-nation":
          "The people concerned settled it differently. In 2003, their representatives asked to be designated by the name of their nation — ǂKhomani, Ju|'hoansi, !Xun — rather than by any cover term whatsoever. The request bears less on the word than on the scale: a single name for distinct peoples is already a decision taken in their place.",
      },
    },
    "le-contre-exemple": {
      stepLabel: "01 · The people",
      heading: "The counter-example, without which the rest is worth nothing",
      blocks: {
        "herero-sans-connotation":
          "The Ovaherero name dossier takes care to write the opposite of what one would expect. ‘Herero’ is the international exonym, born of colonial contact — and, unlike other colonial exonyms in the corpus, no source documents a pejorative connotation attached to the word itself.",
        "le-genocide-et-le-mot":
          "The fiche goes further and says why this matters: the colonial violence this people suffered — the Herero and Nama genocide — bears on registers other than naming. To confuse the two would be to console for a crime by correcting a word.",
        "la-regle-du-chapitre":
          "Hence the rule this chapter defends: an exonym is not guilty by its position. It is guilty by what it says, by who imposed it, and by what the people concerned say of it today. A dossier that condemned wholesale would lose the right to be believed about ‘Hottentot’.",
      },
    },
    "ce-que-latlas-en-fait": {
      stepLabel: "01 · The people",
      heading: "What the source does not say",
      blocks: {
        "compter-le-mot-administration":
          "The corpus records where an exonym comes from. It does not record what made it hold. One can count the fiches that use the word ‘administration’; one cannot count the names an administration actually imposed, and this chapter does not.",
        "les-fiches-muettes":
          "And there remain the 311 silent fiches. They do not say that all is well: they say that nobody has looked yet. That is the first debt this dossier owes to its own corpus.",
      },
    },
  },
  entities: {
    PPL_DINKA: "Dinka",
    PPL_HERERO: "Herero",
    SSD: "South Sudan",
    NAM: "Namibia",
  },
};
