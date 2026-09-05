import type { DossierChapterTranslation } from "../types";

/**
 * Chapter five in English — the thing.
 *
 * Machine provenance (DEC-048): agent-produced from the French record and
 * not yet read by a human. ‘Wax’ and ‘kita’ are the West African French
 * words the chapter is about, so they are kept rather than replaced with the
 * English trade names (‘Dutch wax print’), which would move the argument to
 * a different word.
 */
// @req REQ-145
export const CHAPITRE_LA_CHOSE_EN: DossierChapterTranslation = {
  key: "la-chose",
  locale: "en",
  provenance: "machine",
  title: "The thing",
  question:
    "Wax, coffee, cocoa, Mami Wata: which of them are African, and in what sense?",
  standfirst:
    "Five objects said to be African, five different trajectories. None of these boxes is called ‘inauthentic’ — and that is the chapter's demonstration.",
  measure: {
    value: "Five trajectories",
    unit: "five different verdicts",
  },
  sections: {
    "deux-questions-pas-une": {
      stepLabel: "05 · The thing",
      heading: "Two questions, never one",
      blocks: {
        "deux-questions":
          "Asking whether an object is African mixes two questions that do not have the same answer: where the thing comes from, and where its name comes from. Separating them is enough to undo most debates about authenticity, because the two answers almost always diverge.",
      },
      table: {
        caption:
          "Five objects, and what each answers to the two questions taken separately",
        columns: ["Object", "The thing comes from", "The name comes from"],
        rows: [
          [
            "Wax",
            "The Netherlands — an industrial imitation of Javanese batik",
            "West Africa: it is the women who buy it who name the patterns",
          ],
          [
            "Kente, known as ‘pagne kita’",
            "Ghana and Togo — strip-woven on Akan and Ewe looms",
            "West African French: ‘kita’ covers both nwentoma and kete",
          ],
          [
            "Coffee",
            "Ethiopia — Coffea arabica, the Kaffa region",
            "The Arabic qahwa, through Turkish and Italian, returned in a European form",
          ],
          [
            "Cocoa",
            "Mesoamerica — but introduced to the Gold Coast by a Ghanaian",
            "Nahuatl, through Spanish",
          ],
          [
            "Mami Wata",
            "Africa — ancient and multiple water deities",
            "A trade pidgin, and its image from a German poster",
          ],
        ],
      },
    },
    "le-wax-et-le-kita": {
      stepLabel: "05 · The thing",
      heading: "Wax and kita, exact opposites",
      blocks: {
        "le-wax-vient-de-helmond":
          "Wax is not African from one end of its making to the other. It is an industrial imitation of Javanese batik, developed at Helmond, in the Netherlands, from 1846 onwards: roller printing replaces the wax resist, and the process reaches the West African coasts through soldiers returning from the Dutch East Indies.",
        "les-noms-donnes-sur-place":
          "The patterns are drawn in the Netherlands. The names, for their part, are given on the spot, by the women who buy and resell the pieces — and it is those names that make the meaning of a cloth, not the drawing. The power to make and the power to name did not go together: an object can be foreign through and through and belong by its name.",
        "le-kente-et-ses-deux-noms":
          "Kente is the exactly opposite case, and it corrects a widespread intuition. The cloth is African: strip-woven on Akan and Ewe looms, in Ghana and in Togo. And it bears two names that each say what they describe. In Akan, nwentoma, ‘woven cloth’; kente is related to kɛntɛn, the basket, for the pattern. In Ewe, kete, from the two alternating gestures of the loom — ke, to open, and te, to press.",
        "kita-ne-dit-rien":
          "‘Kita’ is neither the one nor the other. It is the form francophone West Africa fixed over the two, and it says neither the weaving nor the basket nor the gesture: it says nothing at all. An African object, two African etymologies that explain the name, and a third name laid over it that explains nothing any more.",
        "deux-scandales-qui-nen-sont-pas":
          "A foreign object bearing an African name, an African object bearing an exogenous name: the two cases are usually read as opposite scandals, and neither is one. They are two ordinary ways in which a thing and its name travel separately.",
      },
    },
    "le-cafe-et-le-cacao": {
      stepLabel: "05 · The thing",
      heading:
        "Coffee comes back under another name, cocoa arrives through an African",
      blocks: {
        "le-cafeier-ethiopien":
          "The coffee plant is Ethiopian: Coffea arabica grows in the Kaffa region. The word, for its part, leaves through the Arabic qahwa, becomes kahve in Turkish, then coffee in the European languages — and comes back to Africa in that form. The Amharic buna, which has named the same thing all along, was bypassed by the whole chain of borrowing.",
        "la-reserve-sur-kaffa":
          "A reservation, on the very ground of this dossier. One often reads that ‘coffee’ would come from Kaffa, and it is pretty because the place and the word resemble each other. But qahwa designates a wine in Arabic more than half a millennium before the kingdom of Kaffa exists: the connection is not only disputed, it is chronologically improbable.",
        "ce-qui-reste-vrai":
          "What remains true is more interesting than the legend: the coffee plant is indeed Ethiopian, and its name does not come from there. It comes from the trade route that carried it away. Setting down the Kaffa etymology as established because it is pretty would be to commit exactly the folk etymology the glossary defines three pages further on.",
        "le-cacao-et-tetteh-quarshie":
          "Cocoa does not come from Africa: it is Mesoamerican, and its name comes from Nahuatl through Spanish. But the narrative of a plant brought by Europe does not hold the date. In 1879, Tetteh Quarshie, a Ghanaian blacksmith back from Fernando Po, brings pods home and plants them at Akuapim-Mampong; the Basel missions had tried at Aburi as early as 1857, and the colonial administration would only spread it on a large scale from São Tomé from 1886 onwards.",
        "lattribution-se-discute":
          "Here again the attribution is debated, and it has to be said rather than choosing the neatest narrative. One historian credits the introduction to the Reverend Hass; another grants Quarshie having popularised the crop without having brought it first. Quarshie had moreover been trained in a workshop of the Basel mission: the dividing line between the missionary contribution and African initiative does not fall where the national narrative places it.",
        "trois-reponses-independantes":
          "The object is allogenous, so is the name, and the agent of the introduction is not. None of the three answers governs the other two — and the third remains open.",
      },
    },
    "mami-wata": {
      stepLabel: "05 · The thing",
      heading: "Mami Wata, or the deity with the borrowed face",
      blocks: {
        "un-nom-de-pidgin":
          "Water deities are ancient and multiple along the whole coast, and they bore different names according to the language. They gather under a common name fairly late, towards the end of the nineteenth century, and that name probably comes from a trade pidgin — ‘mother water’. The etymology is disputed, and the chapter publishes the disagreement rather than settling on one side of it.",
        "laffiche-de-cirque":
          "The image, for its part, is identified, and it is more devious still. The canonical representation — the woman with the snake — comes from a circus poster: a chromolithograph printed in Hamburg by the Adolph Friedländer firm around 1885, a portrait of a snake charmer the public knew under the name of Nala Damajanti.",
        "mathilde-poupon":
          "Nala Damajanti was in fact called Mathilde Poupon, born in 1861 in the Jura. French, she performed with Barnum and then at the Folies Bergère in a fabricated oriental character, claiming by turns to be Indian or to come from Pondicherry. The poster then circulates along the African coasts, is recognised as a portrait of the water spirit, and gives it its face.",
        "trois-emprunts-empiles":
          "An African deity whose iconography rests on a Frenchwoman dressed as an Indian, printed by a German lithographer, and whose name is probably a trading creole: that is neither an imposture nor a theft. Three borrowings stacked up do not make a fake. That is what transculturation and indigenisation name — and it is precisely what the vocabulary of authenticity is unable to say.",
      },
    },
    "ce-que-la-source-ne-dit-pas-chose": {
      stepLabel: "05 · The thing",
      heading: "What the source does not say",
      blocks: {
        "le-couple-authentique-faux":
          "None of these five boxes is called ‘inauthentic’. The authentic / fake pair is itself a colonial tool: it supposes that a culture would have an original state, and that everything that came after would be a degradation. The five trajectories say the opposite — things and their names circulate, and circulating damages nothing.",
        "deux-affirmations-sans-source":
          "Two assertions in this chapter still await their primary source. The dating of Mami Wata's convergence is a historian's thesis, not a dictionary fact. And the company archive that would fix 1846 and the name of the wax manufacturer has not been consulted directly.",
      },
    },
  },
  entities: {
    GHA: "Ghana",
    ETH: "Ethiopia",
    TGO: "Togo",
  },
};
