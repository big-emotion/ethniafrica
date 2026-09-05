import type { DossierChapterTranslation } from "../types";

/**
 * Chapter three in English — the person.
 *
 * Machine provenance (DEC-048): agent-produced from the French record and
 * not yet read by a human. The French is explicit that « patronyme » is the
 * word under discussion, so it stays in French where the chapter talks
 * about the word and becomes ‘surname’ where it talks about the thing; the
 * naming-system labels in the table follow the naming-system taxonomy's
 * English rather than a fresh rendering.
 */
// @req REQ-145
export const CHAPITRE_LA_PERSONNE_EN: DossierChapterTranslation = {
  key: "la-personne",
  locale: "en",
  provenance: "machine",
  title: "The person",
  question:
    "The family name, one believes, has been handed down since time immemorial. Since when, exactly?",
  standfirst:
    "The hereditary surname is not a survival: it is an administrative artefact. The corpus documents whole systems in which the name is not handed down.",
  measure: {
    value: "4 systems",
    unit: "in which the name is not handed down",
  },
  sections: {
    "ce-que-le-corpus-tient": {
      stepLabel: "03 · The person",
      heading: "What the corpus holds",
      blocks: {
        "trente-six-systemes":
          "The atlas documents thirty-six naming systems. They do not resemble one another: a clan name, a recited praise name, a name of geographical attribution, a totemic name paired with a food prohibition. What the word ‘patronyme’ covers in French is, here, half a dozen different things.",
        "quatre-systemes-non-hereditaires":
          "The figure that counts is the last in the column: four documented systems in which the name is not handed down. That is not a marginal curiosity, it is the demonstration. Heredity of the name is not the rule to which these systems would be the exception; it is one way of doing things among others.",
      },
      table: {
        caption:
          "The corpus's thirty name fiches, by system and by mode of transmission",
        columns: ["System", "Fiches", "What the name designates"],
        rows: [
          ["Clan name", "18", "A belonging — handed down, but also granted"],
          [
            "Clan totemic name",
            "4",
            "A clan, with its food prohibition and its closed list of given names",
          ],
          [
            "Non-hereditary patronymic chain",
            "4",
            "An individual: the father's given name becomes the child's second name, and nothing is fixed",
          ],
          [
            "Praise name",
            "2",
            "A praised lineage — the Yoruba oríkì, the Mande jamu",
          ],
          [
            "Nisba",
            "2",
            "A place, a tribe or a trade, in the Arab-Berber world",
          ],
        ],
      },
    },
    "letat-civil-colonial": {
      stepLabel: "03 · The person",
      heading: "Civil registration, or the name made hereditary by writing",
      blocks: {
        "le-nom-comme-outil-detat":
          "The compulsory, transmissible family name is a tool of the state before it is a custom. James Scott places the permanent surname among the instruments by which a state makes its subjects legible to itself, on a par with the census, the unified language and standard units of measure: the same family has to be found again from one generation to the next, and a name that changes at every birth does not allow it.",
        "le-mecanisme-colonial":
          "The colonial mechanism is simple, and that is what makes it effective. Entering a register — of birth, of baptism, of property, of labour — required a name of European form. Where none existed, the clerk wrote one in. And it became hereditary by the sole fact of having been written: the next generation inherited the line in the register before it inherited a custom.",
        "le-meme-geste":
          "It is the same gesture as in chapter one, applied to a person instead of a people. A name stops being a way of designating and becomes an entry of state, and what is inscribed is not renegotiated.",
      },
    },
    "le-postnom": {
      stepLabel: "03 · The person",
      heading: "The counter-movement, and its date",
      blocks: {
        "le-recours-a-lauthenticite":
          "On 27 October 1971, Mobutu's regime proclaims the recourse to authenticity. On 12 January 1972, the measure reaches names: Christian given names are abandoned in favour of a postnom, and the head of state changes his own first.",
        "une-ordonnance-loi":
          "This was not an exhortation. An ordinance-law of 30 August 1972 introduces into the Penal Code a sanction against any minister of religion who confers a foreign given name at a baptism. Decolonising the name here goes through the very instrument that had fixed it: the law, the register, the penalty.",
        "ce-quil-en-reste":
          "The fact worth retaining, however, is not the decree: it is what remains of it. The postnom is still borne, half a century after the fall of the regime that imposed it. A policy of the name outlives the politics that made it, because it was inscribed in the same place as the previous one.",
        "les-instruments-empruntes":
          "The counter-movement therefore borrows the instruments it contests: constraint, the date of effect, civil registration. That is what makes it effective, and it is also what makes the gesture debatable — decolonising the name by decree is still deciding in people's place.",
      },
    },
    "ce-quun-nom-ne-dit-pas": {
      stepLabel: "03 · The person",
      heading: "What a name does not say about a living person",
      blocks: {
        "un-nom-ne-dit-pas-lorigine":
          "A family name does not indicate a person's origin. That is not a legal precaution, it is a historical fact: clan systems absorbed lineages with no blood tie, through political alliance, through clientship and through captivity in war. A fiche may say that a name is attested among a people; it never says that a bearer belongs to it.",
        "aucune-fonctionnalite":
          "The atlas holds to this in its code as much as in its prose: no feature of this site takes a family name and returns an ethnic origin. Building the opposite would amount to reproducing in software the register of indirect rule, with the same pretension to know who is what.",
      },
      pairs: [
        {
          endonymGloss: "Mande clan name, handed down but also granted",
          imposedBy: "French administrative translation",
        },
        {
          endonymGloss: "Yoruba praise name, recited rather than inscribed",
          imposedBy: "reduction to the civil-registration box",
        },
        {
          endonymGloss: "name adopted after 1972, in the Republic of Zaire",
          imposedBy: "foreign forms with no matching box",
        },
      ],
    },
    "ce-que-la-source-ne-dit-pas-personne": {
      stepLabel: "03 · The person",
      heading: "What the source does not say",
      blocks: {
        "lhypothese-la-moins-etayee":
          "That the hereditary surname is an invention of European states exported by colonisation is the broadest assertion in this dossier, and the least supported. What the sources hold is the mechanism: the register required a name, and the requirement produced heredity. The European genealogy of that requirement remains, here, a working hypothesis.",
        "les-systemes-sans-fiche":
          "Thirty-six name fiches is few, set against the systems that exist. The Somali chain, the abtirsi, does not yet have its own, and the corpus carries no fiche whose declared system is the postnom. The glossary defines them all the same, saying that it defines them without instantiating them.",
      },
    },
  },
  entities: {},
};
