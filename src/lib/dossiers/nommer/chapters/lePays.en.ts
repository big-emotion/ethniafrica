import type { DossierChapterTranslation } from "../types";

/**
 * Chapter two in English — the country.
 *
 * Machine provenance (DEC-048): agent-produced from the French record and
 * not yet read by a human. Country names take their English short form
 * throughout, including inside the four family lists, which are printed in
 * full for the same reason the French prints them: the classification is a
 * reading, and a reading is offered to be contested.
 */
// @req REQ-145
export const CHAPITRE_LE_PAYS_EN: DossierChapterTranslation = {
  key: "le-pays",
  locale: "en",
  provenance: "machine",
  title: "The country",
  question:
    "The borders come from Berlin. And the names laid over them — where do they come from?",
  standfirst:
    "Fewer than a third of the continent's countries bear a name that Africans chose. Renaming was not a moment: it is a practice that runs across sixty years.",
  measure: {
    value: "17 of 54",
    unit: "names chosen by Africans",
  },
  sections: {
    "un-avertissement-de-methode": {
      stepLabel: "02 · The country",
      heading: "A warning, before the first figure",
      blocks: {
        "une-seule-etymologie-sourcee":
          "The atlas's fifty-four country fiches all record the etymology of their name and the actor who gave it. Only one attaches that etymology to a source — Nigeria's, corrected while this chapter was being written. For the fifty-three others, the sources chapter documents the demography and never the name.",
        "une-lecture-a-une-date":
          "The classification that follows is therefore a reading, made by hand, on a given date. It is not a measure of the corpus, and the corpus carries no field that would allow one to be taken: the question ‘was this country named by Africans?’ cannot be queried today.",
        "des-listes-en-entier":
          "The lists are therefore published in full rather than summarised. That is what makes the reading contestable, and a contestable reading is worth more than a measure that is not one.",
      },
    },
    "quatre-familles": {
      stepLabel: "02 · The country",
      heading: "Four families, four origins",
      blocks: {
        "quatre-cas-inegaux":
          "A country's name comes from a navigator, from an ancient geographer, from a kingdom that was already there, or from a decision taken after independence. The four cases are not of equal weight, and the last is the rarest.",
      },
      table: {
        caption:
          "The 54 countries, classified by hand from the ‘name actor’ field of their fiche. A reading, not a measure.",
        columns: ["Origin of the name", "Countries", "Which ones"],
        rows: [
          [
            "European exonym retained",
            "20",
            "Guinea, Equatorial Guinea, Gambia, Sierra Leone, Côte d'Ivoire, Cameroon, Gabon, Senegal, Nigeria, Liberia, Seychelles, Mauritius, Mozambique, São Tomé and Príncipe, Eritrea, Djibouti, Mauritania, Algeria, Tunisia, Madagascar",
          ],
          [
            "Ancient, non-European exonym",
            "6",
            "Egypt and Libya (Greek), Ethiopia (Greek, later adopted), Sudan (Arabic, bilād as-sūdān), Morocco (Arabic), Comoros (Arabo-Persian)",
          ],
          [
            "Local name taken up by the coloniser",
            "11",
            "Rwanda, Burundi, Angola (from the title ngola), Uganda (from Buganda), Togo (from Togodo), Chad, Niger, Kenya (from Kirinyaga), Zambia, Somalia, Congo",
          ],
          [
            "Chosen or restored by Africans",
            "17",
            "Ghana 1957, Mali 1960, Central African Republic 1960, Malawi 1964, Tanzania 1964, Botswana 1966, Lesotho 1966, Guinea-Bissau 1973, Benin 1975, Zimbabwe 1980, Burkina Faso 1984, Namibia 1990, South Sudan 2011, Cabo Verde 2013, Eswatini 2018, South Africa, Democratic Republic of the Congo",
          ],
        ],
      },
    },
    "ce-que-dit-le-dix-sept": {
      stepLabel: "02 · The country",
      heading: "What the seventeen says",
      blocks: {
        "une-pratique-sur-soixante-ans":
          "Renaming is not an event of 1960. It begins before the independences — Ghana takes its name in 1957, a month after its own — and it continues after them: Zimbabwe in 1980, Burkina Faso in 1984, Namibia in 1990, South Sudan in 2011, Cabo Verde in 2013, Eswatini in 2018.",
        "soixante-et-un-ans":
          "Sixty-one years separate the first of these gestures from the last. That is not a wave, it is a practice: each generation takes the question up where the previous one left it, and none closes it.",
        "un-nom-herite-nest-pas-subi":
          "The rest of the continent lives with a name given by someone else, and lives with it without drama most of the time. Senegal may bear a Wolof expression misheard by Portuguese navigators; nobody makes a claim of it. An inherited name is not necessarily a name endured.",
      },
    },
    "trois-cas-qui-defont-la-lecture": {
      stepLabel: "02 · The country",
      heading: "Three cases that undo the simple reading",
      blocks: {
        "nigeria-nomme-par-une-journaliste":
          "Nigeria was not named by an administration: it was named by a journalist. On 8 January 1897, Flora Shaw proposes in The Times a single word for the ‘Niger Area’ that the Royal Niger Company administered. The name is made official only sixteen years later, in 1914, by Lugard, at the unification of the Northern and Southern protectorates.",
        "une-attribution-nuancee":
          "The detail this chapter cannot pass over in silence is that the attribution itself is nuanced. Shaw suggested the name; she did not impose it, and it is the administration that made it real. Earlier occurrences of ‘Nigerian’ are moreover reported in William Cole in 1862 and in Richard Burton in 1863, without it being known whether they are contemporary or added to the edition. The continent's most told story about the origin of a name is therefore also a narrative with holes in it.",
        "benin-se-desindexe":
          "On 30 November 1975, Benin replaces the colonial ‘Dahomey’, drawn from the Fon kingdom. The name retained is that of no group in the territory — which is precisely what was asked of it, under a regime that subordinated ethno-regional belongings. It is not arbitrary for all that: the Bight of Benin borders the coast, and gives it an anchor. Renaming oneself required unindexing oneself from all one's peoples at once.",
        "ghana-restaure-un-empire":
          "Ghana makes the opposite gesture, and owns it. On 6 March 1957, the Gold Coast takes the name of a medieval empire of the western Sudan, whose territory — the present south of Mauritania and west of Mali — at no point overlaps its own. The choice is not an error of geography: it comes from decades of reflection by teachers and men of letters on the colonial label. A restored name is a political act, not an exactitude.",
      },
    },
    "le-nom-du-pays-nest-pas-le-nom-du-peuple": {
      stepLabel: "02 · The country",
      heading: "The name of the country is not the name of the people",
      blocks: {
        "quatre-objets-nommes":
          "Under one and the same administrative box, the atlas finds four named objects of different kinds. A river gave its name to Niger and to Nigeria. A mountain, the Kirinyaga of the Kikuyu, gave Kenya. An expression of Arab geographers, bilād as-sūdān, ‘the land of the Blacks’, gave Sudan. A kingdom gave Congo.",
        "hydronyme-oronyme-choronyme":
          "Hydronym, oronym, choronym, royal ethnonym: the map flattens them all into ‘country name’, and it is that flattening that makes one believe a country and a people coincide. The glossary gives each its word, because telling them apart is the first thing to do in order to read a border.",
      },
    },
    "ce-que-la-source-ne-dit-pas-pays": {
      stepLabel: "02 · The country",
      heading: "What the source does not say",
      blocks: {
        "trois-etymologies-sourcees":
          "Three of the etymologies cited here — Nigeria, Benin, Ghana — were sourced while this chapter was being written, and Nigeria's fiche was corrected along the way: it dated to 1914 a name proposed in 1897, and credited Flora Shaw with an officialisation that was Lugard's. The fifty-one others remain assertions the corpus carries without backing them.",
        "un-champ-type-manque":
          "A typed field would allow counting instead of reading, and mapping the four families. It does not exist. Until it does, this chapter remains what it announces at the outset: a reading, published with its method and its holes.",
      },
    },
  },
  entities: {
    NGA: "Nigeria",
    BEN: "Benin",
    GHA: "Ghana",
    KEN: "Kenya",
  },
};
